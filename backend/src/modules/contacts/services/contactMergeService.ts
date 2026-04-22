import { Pool } from 'pg';
import type { Contact, ContactMergeRequest, ContactMergeResult } from '@app-types/contact';
import { setCurrentUserId } from '@config/database';
import { logger } from '@config/logger';
import { recordActivityEventSafely } from '@modules/events/services/shared';
import { syncContactMethodSummaries } from '@services/contactMethodSyncService';
import {
  mapContactRow,
  type ContactRecord,
  type QueryValue,
  type ViewerRole,
} from '@services/contactServiceHelpers';
import { decrypt, encrypt } from '@utils/encryption';
import {
  ARRAY_MERGE_FIELDS,
  areEqualMergeValues,
  buildContactMergeSimpleUpdates,
  createMergeValidationError,
  loadMergedContact,
  mergeTextValue,
  normalizeContactMergeFieldValue,
  normalizeMergeFieldValue,
  type MergeRelationshipRow,
  type MergeScalarValue,
  type MergeVolunteerRow,
  trimToNull,
} from './contactMergeHelpers';
import { mergeContactMethods } from './contactMergeContactMethods';

export class ContactMergeService {
  constructor(private readonly pool: Pool) {}

  async mergeContacts(
    contactId: string,
    payload: ContactMergeRequest,
    userId: string,
    viewerRole?: ViewerRole
  ): Promise<ContactMergeResult | null> {
    const targetContactId = payload.target_contact_id;
    if (contactId === targetContactId) {
      throw createMergeValidationError('Cannot merge a contact into itself');
    }

    const client = await this.pool.connect();
    const mergedFields = new Set<string>();
    const movedCounts: Record<string, number> = {};
    const incrementCount = (key: string, amount: number): void => {
      if (amount > 0) {
        movedCounts[key] = (movedCounts[key] ?? 0) + amount;
      }
    };

    const parseDecryptedPhn = (value: string | null | undefined): string | null => {
      if (!value) {
        return null;
      }

      try {
        return decrypt(value);
      } catch (error) {
        logger.warn('Failed to decrypt contact PHN during merge', {
          contactId,
          targetContactId,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };

    const pickMergeValue = (
      field: string,
      sourceValue: unknown,
      targetValue: unknown
    ): MergeScalarValue => {
      const normalizedSource = normalizeContactMergeFieldValue(field, sourceValue);
      const normalizedTarget = normalizeContactMergeFieldValue(field, targetValue);
      const resolution = payload.resolutions[field];

      if (ARRAY_MERGE_FIELDS.has(field)) {
        return Array.from(new Set([...(normalizedSource as string[]), ...(normalizedTarget as string[])])).sort();
      }

      if (areEqualMergeValues(normalizedSource, normalizedTarget)) {
        return normalizedTarget;
      }

      const sourceHasValue = normalizedSource !== null && normalizedSource !== undefined;
      const targetHasValue = normalizedTarget !== null && normalizedTarget !== undefined;

      if (!sourceHasValue && !targetHasValue) {
        return null;
      }

      if (sourceHasValue && !targetHasValue) {
        return normalizedSource;
      }

      if (!sourceHasValue && targetHasValue) {
        return normalizedTarget;
      }

      if (resolution !== 'source' && resolution !== 'target') {
        throw createMergeValidationError(`Missing merge resolution for field '${field}'`);
      }

      return resolution === 'source' ? normalizedSource : normalizedTarget;
    };

    try {
      await client.query('BEGIN');
      await setCurrentUserId(client, userId, { local: true });

      const lockedContacts = await client.query<
        ContactRecord & { phn_encrypted?: string | null; roles: string[] }
      >(
        `SELECT
          c.id as contact_id,
          c.account_id,
          c.first_name,
          c.preferred_name,
          c.last_name,
          c.middle_name,
          c.salutation,
          c.suffix,
          c.birth_date,
          c.gender,
          c.pronouns,
          c.phn_encrypted,
          c.email,
          c.phone,
          c.mobile_phone,
          c.job_title,
          c.department,
          c.preferred_contact_method,
          c.do_not_email,
          c.do_not_phone,
          c.do_not_text,
          c.do_not_voicemail,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state_province,
          c.postal_code,
          c.country,
          c.no_fixed_address,
          c.notes,
          c.document_count,
          c.tags,
          c.is_active,
          c.created_at,
          c.updated_at,
          COALESCE(
            (
              SELECT ARRAY_AGG(cr.name ORDER BY cr.name)
              FROM contact_role_assignments cra
              JOIN contact_roles cr ON cr.id = cra.role_id
              WHERE cra.contact_id = c.id
            ),
            ARRAY[]::text[]
          ) as roles
         FROM contacts c
         WHERE c.id = ANY($1::uuid[])
         ORDER BY c.id
         FOR UPDATE`,
        [[contactId, targetContactId]]
      );
      if (lockedContacts.rows.length !== 2) {
        await client.query('ROLLBACK');
        return null;
      }

      const sourceRaw = lockedContacts.rows.find((row) => row.contact_id === contactId);
      const targetRaw = lockedContacts.rows.find((row) => row.contact_id === targetContactId);

      if (!sourceRaw || !targetRaw) {
        await client.query('ROLLBACK');
        return null;
      }

      const sourceContact = mapContactRow(sourceRaw as ContactRecord, viewerRole) as Contact & {
        roles: string[];
      };
      const targetContact = mapContactRow(targetRaw as ContactRecord, viewerRole) as Contact & {
        roles: string[];
      };

      if (
        sourceContact.account_id &&
        targetContact.account_id &&
        sourceContact.account_id !== targetContact.account_id
      ) {
        throw createMergeValidationError('Contacts must belong to the same organization');
      }

      const updateFields: Record<string, unknown> = {
        account_id: pickMergeValue('account_id', sourceContact.account_id, targetContact.account_id),
        first_name: pickMergeValue('first_name', sourceContact.first_name, targetContact.first_name),
        preferred_name: pickMergeValue('preferred_name', sourceContact.preferred_name, targetContact.preferred_name),
        last_name: pickMergeValue('last_name', sourceContact.last_name, targetContact.last_name),
        middle_name: pickMergeValue('middle_name', sourceContact.middle_name, targetContact.middle_name),
        salutation: pickMergeValue('salutation', sourceContact.salutation, targetContact.salutation),
        suffix: pickMergeValue('suffix', sourceContact.suffix, targetContact.suffix),
        birth_date: pickMergeValue('birth_date', sourceContact.birth_date, targetContact.birth_date),
        gender: pickMergeValue('gender', sourceContact.gender, targetContact.gender),
        pronouns: pickMergeValue('pronouns', sourceContact.pronouns, targetContact.pronouns),
        email: pickMergeValue('email', sourceContact.email, targetContact.email),
        phone: pickMergeValue('phone', sourceContact.phone, targetContact.phone),
        mobile_phone: pickMergeValue('mobile_phone', sourceContact.mobile_phone, targetContact.mobile_phone),
        job_title: pickMergeValue('job_title', sourceContact.job_title, targetContact.job_title),
        department: pickMergeValue('department', sourceContact.department, targetContact.department),
        preferred_contact_method: pickMergeValue(
          'preferred_contact_method',
          sourceContact.preferred_contact_method,
          targetContact.preferred_contact_method
        ),
        no_fixed_address: pickMergeValue(
          'no_fixed_address',
          sourceContact.no_fixed_address,
          targetContact.no_fixed_address
        ),
        do_not_email: pickMergeValue('do_not_email', sourceContact.do_not_email, targetContact.do_not_email),
        do_not_phone: pickMergeValue('do_not_phone', sourceContact.do_not_phone, targetContact.do_not_phone),
        do_not_text: pickMergeValue('do_not_text', sourceContact.do_not_text, targetContact.do_not_text),
        do_not_voicemail: pickMergeValue(
          'do_not_voicemail',
          sourceContact.do_not_voicemail,
          targetContact.do_not_voicemail
        ),
        notes: pickMergeValue('notes', sourceContact.notes, targetContact.notes),
        is_active: pickMergeValue('is_active', sourceContact.is_active, targetContact.is_active),
      };

      const sourcePhn = parseDecryptedPhn(sourceRaw.phn_encrypted ?? null);
      const targetPhn = parseDecryptedPhn(targetRaw.phn_encrypted ?? null);
      const phnResolution = payload.resolutions.phn;
      let resolvedPhn: string | null = null;
      if (sourcePhn === targetPhn) {
        resolvedPhn = sourcePhn;
      } else if (sourcePhn && !targetPhn) {
        resolvedPhn = sourcePhn;
      } else if (!sourcePhn && targetPhn) {
        resolvedPhn = targetPhn;
      } else if (sourcePhn && targetPhn) {
        if (phnResolution !== 'source' && phnResolution !== 'target') {
          throw createMergeValidationError("Missing merge resolution for field 'phn'");
        }
        resolvedPhn = phnResolution === 'source' ? sourcePhn : targetPhn;
      }
      if (resolvedPhn !== null) {
        updateFields.phn_encrypted = encrypt(resolvedPhn);
      }

      const tags = Array.from(new Set([...(sourceContact.tags ?? []), ...(targetContact.tags ?? [])])).sort();
      updateFields.tags = tags;

      const queryFields: string[] = [];
      const values: QueryValue[] = [];
      let paramIndex = 1;

      Object.entries(updateFields).forEach(([field, value]) => {
        if (value === undefined) {
          return;
        }

        if (field === 'account_id' && value === null && sourceContact.account_id === targetContact.account_id) {
          return;
        }

        if (field === 'phn_encrypted' && value === null && !sourcePhn && !targetPhn) {
          return;
        }

        if (
          field !== 'tags' &&
          areEqualMergeValues(
            normalizeContactMergeFieldValue(field as keyof Contact, sourceContact[field as keyof Contact]),
            normalizeContactMergeFieldValue(field as keyof Contact, targetContact[field as keyof Contact])
          ) &&
          field !== 'phn_encrypted'
        ) {
          return;
        }

        queryFields.push(`${field} = $${paramIndex}`);
        values.push(value as QueryValue);
        paramIndex++;
        mergedFields.add(field === 'phn_encrypted' ? 'phn' : field);
      });

      if (queryFields.length > 0) {
        queryFields.push(`modified_by = $${paramIndex}`);
        values.push(userId);
        paramIndex++;
        queryFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(targetContactId);

        await client.query(
          `UPDATE contacts
           SET ${queryFields.join(', ')}
           WHERE id = $${paramIndex}`,
          values
        );
      }

      const selectedEmail = updateFields.email as string | null;
      const selectedPhone = updateFields.phone as string | null;
      const selectedMobilePhone = updateFields.mobile_phone as string | null;
      await mergeContactMethods({
        client,
        sourceContactId: contactId,
        targetContactId,
        userId,
        selectedEmail,
        selectedPhone,
        selectedMobilePhone,
        incrementCount,
      });

      const sourceRoleRows = await client.query<{ role_id: string; name: string; assigned_by: string | null }>(
        `SELECT cra.role_id, cr.name, cra.assigned_by
         FROM contact_role_assignments cra
         JOIN contact_roles cr ON cr.id = cra.role_id
         WHERE cra.contact_id = $1
         ORDER BY cr.name`,
        [contactId]
      );
      const targetRoleRows = await client.query<{ role_id: string; name: string; assigned_by: string | null }>(
        `SELECT cra.role_id, cr.name, cra.assigned_by
         FROM contact_role_assignments cra
         JOIN contact_roles cr ON cr.id = cra.role_id
         WHERE cra.contact_id = $1
         ORDER BY cr.name`,
        [targetContactId]
      );

      const targetRoleIds = new Set(targetRoleRows.rows.map((row) => row.role_id));
      for (const row of sourceRoleRows.rows) {
        if (targetRoleIds.has(row.role_id)) {
          await client.query(
            `UPDATE contact_role_assignments
             SET assigned_by = COALESCE(assigned_by, $2)
             WHERE contact_id = $1
               AND role_id = $3`,
            [targetContactId, row.assigned_by, row.role_id]
          );
          await client.query('DELETE FROM contact_role_assignments WHERE contact_id = $1 AND role_id = $2', [
            contactId,
            row.role_id,
          ]);
          continue;
        }

        await client.query(
          `UPDATE contact_role_assignments
           SET contact_id = $2
           WHERE contact_id = $1
             AND role_id = $3`,
          [contactId, targetContactId, row.role_id]
        );
        targetRoleIds.add(row.role_id);
      }
      incrementCount('contact_role_assignments', sourceRoleRows.rows.length);
      mergedFields.add('roles');

      const relationshipRows = await client.query<MergeRelationshipRow>(
        `SELECT id, contact_id, related_contact_id, relationship_type, relationship_label,
                is_bidirectional, inverse_relationship_type, notes, is_active, created_at
         FROM contact_relationships
         WHERE contact_id = ANY($1::uuid[])
            OR related_contact_id = ANY($1::uuid[])
         ORDER BY created_at ASC, id ASC
         FOR UPDATE`,
        [[contactId, targetContactId]]
      );

      const relationshipKey = (row: {
        contact_id: string;
        related_contact_id: string;
        relationship_type: string;
      }): string => `${row.contact_id}::${row.related_contact_id}::${row.relationship_type}`;

      const targetRelationshipMap = new Map<string, MergeRelationshipRow>();
      relationshipRows.rows
        .filter((row) => row.contact_id === targetContactId || row.related_contact_id === targetContactId)
        .forEach((row) => {
          targetRelationshipMap.set(relationshipKey(row), row);
        });

      for (const row of relationshipRows.rows.filter(
        (relationship) => relationship.contact_id === contactId || relationship.related_contact_id === contactId
      )) {
        const nextContactId = row.contact_id === contactId ? targetContactId : row.contact_id;
        const nextRelatedContactId = row.related_contact_id === contactId ? targetContactId : row.related_contact_id;

        if (nextContactId === nextRelatedContactId) {
          await client.query('DELETE FROM contact_relationships WHERE id = $1', [row.id]);
          continue;
        }

        const nextKey = `${nextContactId}::${nextRelatedContactId}::${row.relationship_type}`;
        const existing = targetRelationshipMap.get(nextKey);
        if (existing) {
          await client.query(
            `UPDATE contact_relationships
             SET relationship_label = COALESCE(contact_relationships.relationship_label, $2::text),
                 is_bidirectional = contact_relationships.is_bidirectional OR $3,
                 inverse_relationship_type = COALESCE(contact_relationships.inverse_relationship_type, $4::text),
                 notes = CASE
                   WHEN contact_relationships.notes IS NULL THEN $5::text
                   WHEN $5::text IS NULL THEN contact_relationships.notes
                   WHEN contact_relationships.notes = $5::text THEN contact_relationships.notes
                   ELSE contact_relationships.notes || E'\n\n' || $5::text
                 END,
                 is_active = contact_relationships.is_active OR $6,
                 modified_by = $7
             WHERE id = $1`,
            [
              existing.id,
              row.relationship_label,
              row.is_bidirectional,
              row.inverse_relationship_type,
              row.notes,
              row.is_active,
              userId,
            ]
          );
          await client.query('DELETE FROM contact_relationships WHERE id = $1', [row.id]);
          continue;
        }

        await client.query(
          `UPDATE contact_relationships
           SET contact_id = $2,
               related_contact_id = $3,
               modified_by = $4
           WHERE id = $1`,
          [row.id, nextContactId, nextRelatedContactId, userId]
        );
        targetRelationshipMap.set(nextKey, { ...row, contact_id: nextContactId, related_contact_id: nextRelatedContactId });
      }

      for (const update of buildContactMergeSimpleUpdates(contactId, targetContactId, userId)) {
        const result = await client.query(update.sql, update.params);
        incrementCount(update.key, result.rowCount || 0);
      }

      const targetVolunteerRows = await client.query<MergeVolunteerRow>(
        `SELECT *
         FROM volunteers
         WHERE contact_id = $1
         ORDER BY is_active DESC NULLS LAST, updated_at DESC, created_at ASC, id ASC
         FOR UPDATE`,
        [targetContactId]
      );
      const sourceVolunteerRows = await client.query<MergeVolunteerRow>(
        `SELECT *
         FROM volunteers
         WHERE contact_id = $1
         ORDER BY is_active DESC NULLS LAST, updated_at DESC, created_at ASC, id ASC
         FOR UPDATE`,
        [contactId]
      );

      const targetPrimaryVolunteer = targetVolunteerRows.rows[0] ?? null;
      const sourcePrimaryVolunteer = sourceVolunteerRows.rows[0] ?? null;
      const sourceVolunteerIds = sourceVolunteerRows.rows.map((row) => row.id);

      const resolveVolunteerResolution = (field: string, aliases: string[] = []): 'source' | 'target' | undefined => {
        const explicitResolution = payload.resolutions[field];
        if (explicitResolution) {
          return explicitResolution;
        }

        for (const alias of aliases) {
          const aliasResolution = payload.resolutions[alias];
          if (aliasResolution) {
            return aliasResolution;
          }
        }

        return undefined;
      };

      const pickVolunteerValue = (
        field: string,
        sourceValue: unknown,
        targetValue: unknown,
        aliases: string[] = []
      ): MergeScalarValue => {
        const normalizedSource = normalizeMergeFieldValue(field, sourceValue);
        const normalizedTarget = normalizeMergeFieldValue(field, targetValue);

        if (field === 'skills' || field === 'preferred_roles' || field === 'certifications') {
          return Array.from(new Set([...(normalizedSource as string[]), ...(normalizedTarget as string[])])).sort();
        }

        if (areEqualMergeValues(normalizedSource, normalizedTarget)) {
          return normalizedTarget;
        }

        const sourceHasValue = normalizedSource !== null && normalizedSource !== undefined;
        const targetHasValue = normalizedTarget !== null && normalizedTarget !== undefined;

        if (!sourceHasValue && !targetHasValue) {
          return null;
        }

        if (sourceHasValue && !targetHasValue) {
          return normalizedSource;
        }

        if (!sourceHasValue && targetHasValue) {
          return normalizedTarget;
        }

        const resolution = resolveVolunteerResolution(field, aliases);
        if (resolution !== 'source' && resolution !== 'target') {
          throw createMergeValidationError(`Missing merge resolution for field '${field}'`);
        }

        return resolution === 'source' ? normalizedSource : normalizedTarget;
      };

      const mergeVolunteerText = (...values: Array<string | null | undefined>): string | null =>
        values.reduce<string | null>((acc, value) => mergeTextValue(acc, trimToNull(value)), null);

      if (sourceVolunteerRows.rows.length > 0) {
        if (targetVolunteerRows.rows.length === 0) {
          const result = await client.query(
            `UPDATE volunteers
             SET contact_id = $2,
                 modified_by = $3
             WHERE contact_id = $1`,
            [contactId, targetContactId, userId]
          );
          incrementCount('volunteers', result.rowCount || 0);
        } else {
          if (!targetPrimaryVolunteer) {
            throw createMergeValidationError('Target volunteer record missing');
          }

          const survivorVolunteer = targetPrimaryVolunteer;
          const mergedSkills = Array.from(
            new Set([
              ...(Array.isArray(survivorVolunteer.skills) ? survivorVolunteer.skills : []),
              ...sourceVolunteerRows.rows.flatMap((row) => (Array.isArray(row.skills) ? row.skills : [])),
            ])
          ).sort();
          const mergedPreferredRoles = Array.from(
            new Set([
              ...(Array.isArray(survivorVolunteer.preferred_roles) ? survivorVolunteer.preferred_roles : []),
              ...sourceVolunteerRows.rows.flatMap((row) =>
                Array.isArray(row.preferred_roles) ? row.preferred_roles : []
              ),
            ])
          ).sort();
          const mergedCertifications = Array.from(
            new Set([
              ...(Array.isArray(survivorVolunteer.certifications) ? survivorVolunteer.certifications : []),
              ...sourceVolunteerRows.rows.flatMap((row) =>
                Array.isArray(row.certifications) ? row.certifications : []
              ),
            ])
          ).sort();

          const mergedAvailabilityStatus = pickVolunteerValue(
            'availability_status',
            sourcePrimaryVolunteer?.availability_status ?? sourcePrimaryVolunteer?.volunteer_status,
            survivorVolunteer.availability_status ?? survivorVolunteer.volunteer_status,
            ['volunteer_status']
          ) as string | null;
          const mergedBackgroundCheckStatus = pickVolunteerValue(
            'background_check_status',
            sourcePrimaryVolunteer?.background_check_status,
            survivorVolunteer.background_check_status
          ) as string | null;
          const mergedBackgroundCheckDate = pickVolunteerValue(
            'background_check_date',
            sourcePrimaryVolunteer?.background_check_date,
            survivorVolunteer.background_check_date
          ) as string | null;
          const mergedBackgroundCheckExpiry = pickVolunteerValue(
            'background_check_expiry',
            sourcePrimaryVolunteer?.background_check_expiry,
            survivorVolunteer.background_check_expiry
          ) as string | null;
          const mergedMaxHoursPerWeek = pickVolunteerValue(
            'max_hours_per_week',
            sourcePrimaryVolunteer?.max_hours_per_week,
            survivorVolunteer.max_hours_per_week
          ) as number | null;
          const mergedEmergencyName = pickVolunteerValue(
            'emergency_contact_name',
            sourcePrimaryVolunteer?.emergency_contact_name,
            survivorVolunteer.emergency_contact_name
          ) as string | null;
          const mergedEmergencyPhone = pickVolunteerValue(
            'emergency_contact_phone',
            sourcePrimaryVolunteer?.emergency_contact_phone,
            survivorVolunteer.emergency_contact_phone
          ) as string | null;
          const mergedEmergencyRelationship = pickVolunteerValue(
            'emergency_contact_relationship',
            sourcePrimaryVolunteer?.emergency_contact_relationship,
            survivorVolunteer.emergency_contact_relationship
          ) as string | null;
          const mergedVolunteerSince = pickVolunteerValue(
            'volunteer_since',
            sourcePrimaryVolunteer?.volunteer_since,
            survivorVolunteer.volunteer_since
          ) as string | null;
          const mergedAvailabilityNotes = mergeVolunteerText(
            survivorVolunteer.availability_notes,
            survivorVolunteer.availability,
            ...targetVolunteerRows.rows.map((row) => row.availability_notes ?? row.availability),
            sourcePrimaryVolunteer?.availability_notes,
            sourcePrimaryVolunteer?.availability,
            ...sourceVolunteerRows.rows.map((row) => row.availability_notes ?? row.availability)
          );
          const sourceHasActiveVolunteer = sourceVolunteerRows.rows.some((row) => Boolean(row.is_active));
          const targetHasActiveVolunteer = targetVolunteerRows.rows.some((row) => Boolean(row.is_active));
          const preferredLifecycleStatus =
            trimToNull(targetPrimaryVolunteer?.volunteer_status) ??
            trimToNull(sourcePrimaryVolunteer?.volunteer_status) ??
            'active';
          const mergedVolunteerStatus = sourceHasActiveVolunteer || targetHasActiveVolunteer
            ? 'active'
            : preferredLifecycleStatus;
          const mergedVolunteerIsActive = !['inactive', 'retired', 'on_leave'].includes(
            mergedVolunteerStatus.toLowerCase()
          );

          const updateResult = await client.query(
            `UPDATE volunteers
             SET skills = $2,
                 preferred_roles = $3,
                 certifications = $4,
                 availability_status = $5,
                 availability = $6,
                 availability_notes = $6,
                 background_check_status = $7,
                 background_check_date = $8,
                 background_check_expiry = $9,
                 max_hours_per_week = $10,
                 emergency_contact_name = $11,
                 emergency_contact_phone = $12,
                 emergency_contact_relationship = $13,
                 volunteer_since = $14,
                 volunteer_status = $15,
                 total_hours_logged = $16,
                 hours_contributed = $16,
                 modified_by = $17,
                 is_active = $18
             WHERE id = $1`,
            [
              survivorVolunteer.id,
              mergedSkills,
              mergedPreferredRoles,
              mergedCertifications,
              mergedAvailabilityStatus,
              mergedAvailabilityNotes,
              mergedBackgroundCheckStatus,
              mergedBackgroundCheckDate,
              mergedBackgroundCheckExpiry,
              mergedMaxHoursPerWeek,
              mergedEmergencyName,
              mergedEmergencyPhone,
              mergedEmergencyRelationship,
              mergedVolunteerSince,
              mergedVolunteerStatus,
              survivorVolunteer.total_hours_logged,
              userId,
              mergedVolunteerIsActive,
            ]
          );
          incrementCount('volunteers', updateResult.rowCount || 0);
          mergedFields.add('skills');
          mergedFields.add('preferred_roles');
          mergedFields.add('certifications');
          mergedFields.add('availability_status');
          mergedFields.add('availability_notes');
          mergedFields.add('background_check_status');
          mergedFields.add('background_check_date');
          mergedFields.add('background_check_expiry');
          mergedFields.add('max_hours_per_week');
          mergedFields.add('emergency_contact_name');
          mergedFields.add('emergency_contact_phone');
          mergedFields.add('emergency_contact_relationship');
          mergedFields.add('volunteer_since');
          mergedFields.add('volunteer_status');

          const hoursMoveResult = await client.query(
            `UPDATE volunteer_hours
             SET volunteer_id = $2
             WHERE volunteer_id = ANY($1::uuid[])`,
            [sourceVolunteerIds, survivorVolunteer.id]
          );
          const assignmentMoveResult = await client.query(
            `UPDATE volunteer_assignments
             SET volunteer_id = $2
             WHERE volunteer_id = ANY($1::uuid[])`,
            [sourceVolunteerIds, survivorVolunteer.id]
          );
          const sourceDeactivateResult = await client.query(
            `UPDATE volunteers
             SET volunteer_status = 'inactive',
                 is_active = FALSE,
                 modified_by = $2
             WHERE id = ANY($1::uuid[])`,
            [sourceVolunteerIds, userId]
          );

          incrementCount('volunteer_hours', hoursMoveResult.rowCount || 0);
          incrementCount('volunteer_assignments', assignmentMoveResult.rowCount || 0);
          incrementCount('volunteers', sourceDeactivateResult.rowCount || 0);

          const hoursResult = await client.query<{ total: string | null }>(
            `SELECT COALESCE(SUM(hours_logged), 0)::text AS total
             FROM volunteer_hours
             WHERE volunteer_id = $1`,
            [survivorVolunteer.id]
          );
          const totalHours = Number(hoursResult.rows[0]?.total ?? 0);
          await client.query(
            `UPDATE volunteers
             SET total_hours_logged = $2,
                 hours_contributed = $2,
                 modified_by = $3
             WHERE id = $1`,
            [survivorVolunteer.id, totalHours, userId]
          );
          mergedFields.add('total_hours_logged');
          mergedFields.add('hours_contributed');
        }
      }

      await syncContactMethodSummaries(targetContactId, client);
      await syncContactMethodSummaries(contactId, client);

      const documentCountResult = await client.query<{ contact_id: string; count: string }>(
        `SELECT contact_id, COUNT(*)::int::text AS count
         FROM contact_documents
         WHERE contact_id = ANY($1::uuid[])
           AND is_active = true
         GROUP BY contact_id`,
        [[contactId, targetContactId]]
      );

      const documentCounts = new Map(
        documentCountResult.rows.map((row) => [row.contact_id, Number(row.count ?? 0)])
      );
      await client.query(
        `UPDATE contacts
         SET document_count = COALESCE($2, 0),
             modified_by = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [targetContactId, documentCounts.get(targetContactId) ?? 0, userId]
      );
      await client.query(
        `UPDATE contacts
         SET document_count = COALESCE($2, 0),
             modified_by = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [contactId, documentCounts.get(contactId) ?? 0, userId]
      );

      await client.query(
        `UPDATE contacts
         SET is_active = false,
             modified_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [contactId, userId]
      );

      const targetRolesResult = await client.query<{ role_id: string }>(
        `SELECT role_id FROM contact_role_assignments WHERE contact_id = $1 ORDER BY role_id`,
        [targetContactId]
      );

      await recordActivityEventSafely(
        {
          type: 'contact_updated',
          title: 'Contact merged',
          description: `Merged contact ${contactId} into ${targetContactId}`,
          entityType: 'contact',
          entityId: targetContactId,
          relatedEntityType: 'contact',
          relatedEntityId: contactId,
          userId,
          metadata: {
            action: 'merge',
            source_contact_id: contactId,
            target_contact_id: targetContactId,
            merged_fields: Array.from(mergedFields),
            moved_counts: movedCounts,
            source_roles: sourceRoleRows.rows.map((row) => row.role_id),
            target_roles: targetRolesResult.rows.map((row) => row.role_id),
          },
        },
        client,
        {
          contactId,
          targetContactId,
        }
      );

      await client.query('COMMIT');

      const survivor = await loadMergedContact(this.pool, targetContactId, viewerRole);
      if (!survivor) {
        throw new Error('Failed to reload merged contact');
      }

      const survivorRolesResult = await this.pool.query<{ name: string }>(
        `SELECT cr.name
         FROM contact_role_assignments cra
         JOIN contact_roles cr ON cr.id = cra.role_id
         WHERE cra.contact_id = $1
         ORDER BY cr.name`,
        [targetContactId]
      );

      return {
        survivor_contact: {
          ...survivor,
          roles: survivorRolesResult.rows.map((role) => role.name),
        },
        merge_summary: {
          source_contact_id: contactId,
          target_contact_id: targetContactId,
          merged_fields: Array.from(mergedFields),
          moved_counts: movedCounts,
        },
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.warn('Failed to rollback contact merge transaction', {
          contactId,
          targetContactId,
          rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        });
      }

      logger.error('Error merging contacts:', error);
      if (
        error instanceof Error &&
        (error as Error & { statusCode?: number; code?: string }).statusCode === 400 &&
        (error as Error & { statusCode?: number; code?: string }).code === 'validation_error'
      ) {
        throw error;
      }
      throw Object.assign(new Error('Failed to merge contacts'), { cause: error });
    } finally {
      client.release();
    }
  }
}
