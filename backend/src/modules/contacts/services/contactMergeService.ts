import { Pool, PoolClient } from 'pg';
import type { Contact, ContactMergeRequest, ContactMergeResult } from '@app-types/contact';
import { logger } from '@config/logger';
import { recordActivityEventSafely } from '@modules/events/services/shared';
import { syncContactMethodSummaries } from '@services/contactMethodSyncService';
import {
  mapContactRow,
  normalizeDateOnly,
  type ContactRecord,
  type QueryValue,
  type ViewerRole,
} from '@services/contactServiceHelpers';
import { decrypt, encrypt } from '@utils/encryption';

type MergeScalarValue = string | number | boolean | string[] | null;

type MergePhoneRow = {
  id: string;
  contact_id: string;
  phone_number: string;
  label: string;
  is_primary: boolean;
  created_at: Date;
  modified_by: string | null;
};

type MergeEmailRow = {
  id: string;
  contact_id: string;
  email_address: string;
  label: string;
  is_primary: boolean;
  created_at: Date;
  modified_by: string | null;
};

type MergeRelationshipRow = {
  id: string;
  contact_id: string;
  related_contact_id: string;
  relationship_type: string;
  relationship_label: string | null;
  is_bidirectional: boolean;
  inverse_relationship_type: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
};

type MergeVolunteerRow = {
  id: string;
  contact_id: string;
  volunteer_status: string | null;
  skills: string[] | null;
  availability: string | null;
  availability_status: string | null;
  availability_notes: string | null;
  background_check_status: string | null;
  background_check_date: string | Date | null;
  background_check_expiry: string | Date | null;
  preferred_roles: string[] | null;
  certifications: string[] | null;
  max_hours_per_week: string | number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  is_active: boolean | null;
  volunteer_since: string | Date | null;
  total_hours_logged: string | number | null;
  hours_contributed: string | number | null;
};

type Queryable = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: T[]; rowCount?: number | null }>;
};

const CONTACT_BY_ID_SQL = `
  SELECT
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
    a.account_name,
    (SELECT COUNT(*)::int FROM contact_phone_numbers WHERE contact_id = c.id) as phone_count,
    (SELECT COUNT(*)::int FROM contact_email_addresses WHERE contact_id = c.id) as email_count,
    (SELECT COUNT(*)::int FROM contact_relationships WHERE contact_id = c.id AND is_active = true) as relationship_count,
    (SELECT COUNT(*)::int FROM contact_notes WHERE contact_id = c.id) as note_count,
    COALESCE(
      (SELECT ARRAY_AGG(cr.name) FROM contact_role_assignments cra
       JOIN contact_roles cr ON cr.id = cra.role_id
       WHERE cra.contact_id = c.id),
      ARRAY[]::text[]
    ) as roles
   FROM contacts c
   LEFT JOIN accounts a ON c.account_id = a.id
   WHERE c.id = $1`;

const trimToNull = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return value === null || value === undefined ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeEmailValue = (value: unknown): string | null => {
  const normalized = trimToNull(value);
  return normalized ? normalized.toLowerCase() : null;
};

const normalizePhoneValue = (value: unknown): string | null => trimToNull(value);

const normalizePhoneMatchKey = (value: unknown): string | null => {
  const normalized = trimToNull(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

const normalizeArrayValue = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => trimToNull(item))
        .filter((item): item is string => Boolean(item))
    )
  ).sort();
};

const mergeTextValue = (left: string | null, right: string | null): string | null => {
  const values = [left, right]
    .map((value) => trimToNull(value))
    .filter((value): value is string => Boolean(value));
  if (values.length === 0) {
    return null;
  }

  const uniqueValues = Array.from(new Set(values));
  return uniqueValues.join('\n\n');
};

const chooseNonOtherLabel = (existing: string | null, incoming: string | null): string | null => {
  const normalizedExisting = trimToNull(existing);
  const normalizedIncoming = trimToNull(incoming);

  if (!normalizedExisting) {
    return normalizedIncoming;
  }
  if (normalizedExisting !== 'other') {
    return normalizedExisting;
  }
  return normalizedIncoming ?? normalizedExisting;
};

const BOOLEAN_CONTACT_FIELDS = new Set<string>([
  'no_fixed_address',
  'do_not_email',
  'do_not_phone',
  'do_not_text',
  'do_not_voicemail',
  'is_active',
]);

const normalizeContactMergeFieldValue = (field: string, value: unknown): MergeScalarValue => {
  if (field === 'tags' || field === 'roles') {
    return normalizeArrayValue(value);
  }
  if (BOOLEAN_CONTACT_FIELDS.has(field)) {
    return typeof value === 'boolean' ? value : Boolean(value);
  }
  return trimToNull(value);
};

const areEqualMergeValues = (left: MergeScalarValue, right: MergeScalarValue): boolean => {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return left === right;
};

const createMergeValidationError = (message: string): Error =>
  Object.assign(new Error(message), {
    statusCode: 400,
    code: 'validation_error',
  });

const ARRAY_MERGE_FIELDS = new Set(['tags', 'roles', 'skills', 'preferred_roles', 'certifications']);
const BOOLEAN_MERGE_FIELDS = new Set([
  'no_fixed_address',
  'do_not_email',
  'do_not_phone',
  'do_not_text',
  'do_not_voicemail',
  'is_active',
]);
const DATE_MERGE_FIELDS = new Set([
  'birth_date',
  'background_check_date',
  'background_check_expiry',
  'volunteer_since',
]);
const NUMBER_MERGE_FIELDS = new Set(['max_hours_per_week', 'total_hours_logged', 'hours_contributed']);

const normalizeMergeFieldValue = (field: string, value: unknown): MergeScalarValue => {
  if (ARRAY_MERGE_FIELDS.has(field)) {
    return normalizeArrayValue(value);
  }

  if (BOOLEAN_MERGE_FIELDS.has(field)) {
    return typeof value === 'boolean' ? value : Boolean(value);
  }

  if (DATE_MERGE_FIELDS.has(field)) {
    return value === null || value === undefined ? null : normalizeDateOnly(value);
  }

  if (NUMBER_MERGE_FIELDS.has(field)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  return trimToNull(value);
};

const setContactMethodPrimary = async (
  client: PoolClient,
  contactId: string,
  keepRowId: string,
  table: 'contact_phone_numbers' | 'contact_email_addresses',
  labelCondition: string | null = null
): Promise<void> => {
  const labelClause = labelCondition ? ` AND ${labelCondition}` : '';
  await client.query(
    `UPDATE ${table}
     SET is_primary = CASE WHEN id = $2 THEN true ELSE false END
     WHERE contact_id = $1${labelClause}`,
    [contactId, keepRowId]
  );
};

const loadMergedContact = async (
  queryable: Queryable,
  contactId: string,
  viewerRole?: ViewerRole
): Promise<(Contact & { roles: string[] }) | null> => {
  const result = await queryable.query<ContactRecord>(CONTACT_BY_ID_SQL, [contactId]);
  const row = result.rows[0] as ContactRecord | undefined;
  return row ? (mapContactRow(row, viewerRole) as Contact & { roles: string[] }) : null;
};

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

      const phoneRows = await client.query<MergePhoneRow>(
        `SELECT id, contact_id, phone_number, label, is_primary, created_at, modified_by
         FROM contact_phone_numbers
         WHERE contact_id = ANY($1::uuid[])
         ORDER BY created_at ASC, id ASC
         FOR UPDATE`,
        [[contactId, targetContactId]]
      );

      const emailRows = await client.query<MergeEmailRow>(
        `SELECT id, contact_id, email_address, label, is_primary, created_at, modified_by
         FROM contact_email_addresses
         WHERE contact_id = ANY($1::uuid[])
         ORDER BY created_at ASC, id ASC
         FOR UPDATE`,
        [[contactId, targetContactId]]
      );

      const targetPhoneRows = phoneRows.rows.filter((row) => row.contact_id === targetContactId);
      const targetEmailRows = emailRows.rows.filter((row) => row.contact_id === targetContactId);

      const phoneByNumber = new Map<string, MergePhoneRow>();
      targetPhoneRows.forEach((row) => {
        phoneByNumber.set(
          normalizePhoneMatchKey(row.phone_number) ?? normalizePhoneValue(row.phone_number) ?? row.phone_number,
          row
        );
      });

      const emailByAddress = new Map<string, MergeEmailRow>();
      targetEmailRows.forEach((row) => {
        emailByAddress.set(normalizeEmailValue(row.email_address) ?? row.email_address, row);
      });

      for (const row of phoneRows.rows.filter((value) => value.contact_id === contactId)) {
        const key = normalizePhoneMatchKey(row.phone_number) ?? normalizePhoneValue(row.phone_number) ?? row.phone_number;
        const existing = phoneByNumber.get(key);
        if (existing) {
          const updatedLabel = chooseNonOtherLabel(existing.label, row.label) ?? existing.label;
          const updatedPrimary = existing.is_primary || row.is_primary;
          await client.query(
            `UPDATE contact_phone_numbers
             SET phone_number = $2,
                 label = $3,
                 is_primary = $4,
                 modified_by = $5
             WHERE id = $1`,
            [existing.id, row.phone_number, updatedLabel, updatedPrimary, userId]
          );
          await client.query('DELETE FROM contact_phone_numbers WHERE id = $1', [row.id]);
          incrementCount('contact_phone_numbers', 1);
          continue;
        }

        await client.query(
          `UPDATE contact_phone_numbers
           SET contact_id = $2,
               is_primary = $3,
               modified_by = $4
             WHERE id = $1`,
          [row.id, targetContactId, false, userId]
        );
        phoneByNumber.set(key, { ...row, contact_id: targetContactId, is_primary: false });
        incrementCount('contact_phone_numbers', 1);
      }

      for (const row of emailRows.rows.filter((value) => value.contact_id === contactId)) {
        const key = normalizeEmailValue(row.email_address) ?? row.email_address;
        const existing = emailByAddress.get(key);
        if (existing) {
          const updatedLabel = chooseNonOtherLabel(existing.label, row.label) ?? existing.label;
          const updatedPrimary = existing.is_primary || row.is_primary;
          await client.query(
            `UPDATE contact_email_addresses
             SET email_address = $2,
                 label = $3,
                 is_primary = $4,
                 modified_by = $5
             WHERE id = $1`,
            [existing.id, row.email_address, updatedLabel, updatedPrimary, userId]
          );
          await client.query('DELETE FROM contact_email_addresses WHERE id = $1', [row.id]);
          incrementCount('contact_email_addresses', 1);
          continue;
        }

        await client.query(
          `UPDATE contact_email_addresses
           SET contact_id = $2,
               is_primary = false,
               modified_by = $3
           WHERE id = $1`,
          [row.id, targetContactId, userId]
        );
        emailByAddress.set(key, { ...row, contact_id: targetContactId, is_primary: false });
        incrementCount('contact_email_addresses', 1);
      }

      const resolveSummaryPhone = async (
        slot: 'phone' | 'mobile_phone',
        value: string | null
      ): Promise<void> => {
        if (!value) {
          return;
        }

        const desiredLabel = slot === 'mobile_phone' ? 'mobile' : 'other';
        const matchKey = normalizePhoneMatchKey(value);
        const existingRow = await client.query<MergePhoneRow>(
          `SELECT id, contact_id, phone_number, label, is_primary, created_at, modified_by
           FROM contact_phone_numbers
           WHERE contact_id = $1
             AND regexp_replace(phone_number, '\\D', '', 'g') = $2
           ORDER BY is_primary DESC, created_at ASC, id ASC
           LIMIT 1`,
          [targetContactId, matchKey]
        );

        if (existingRow.rows[0]) {
          const updatedLabel =
            chooseNonOtherLabel(existingRow.rows[0].label, desiredLabel) ?? existingRow.rows[0].label;
          await client.query(
            `UPDATE contact_phone_numbers
             SET phone_number = $2,
                 label = $3,
                 is_primary = true,
                 modified_by = $4
             WHERE id = $1`,
            [existingRow.rows[0].id, value, updatedLabel, userId]
          );
          await setContactMethodPrimary(
            client,
            targetContactId,
            existingRow.rows[0].id,
            'contact_phone_numbers',
            slot === 'mobile_phone' ? "label = 'mobile'" : "label <> 'mobile'"
          );
          return;
        }

        const created = await client.query<{ id: string }>(
          `INSERT INTO contact_phone_numbers (
             contact_id,
             phone_number,
             label,
             is_primary,
             created_by,
             modified_by
           ) VALUES ($1, $2, $3, true, $4, $4)
           RETURNING id`,
          [targetContactId, value, desiredLabel, userId]
        );

        if (created.rows[0]?.id) {
          await setContactMethodPrimary(
            client,
            targetContactId,
            created.rows[0].id,
            'contact_phone_numbers',
            slot === 'mobile_phone' ? "label = 'mobile'" : "label <> 'mobile'"
          );
        }
      };

      const resolveSummaryEmail = async (value: string | null): Promise<void> => {
        if (!value) {
          return;
        }

        const existingRow = await client.query<MergeEmailRow>(
          `SELECT id, contact_id, email_address, label, is_primary, created_at, modified_by
           FROM contact_email_addresses
           WHERE contact_id = $1
             AND lower(email_address) = lower($2)
           ORDER BY is_primary DESC, created_at ASC, id ASC
           LIMIT 1`,
          [targetContactId, value]
        );

        if (existingRow.rows[0]) {
          await client.query(
            `UPDATE contact_email_addresses
             SET email_address = $2,
                 label = 'personal',
                 is_primary = true,
                 modified_by = $3
             WHERE id = $1`,
            [existingRow.rows[0].id, value, userId]
          );
          await setContactMethodPrimary(client, targetContactId, existingRow.rows[0].id, 'contact_email_addresses');
          return;
        }

        const created = await client.query<{ id: string }>(
          `INSERT INTO contact_email_addresses (
             contact_id,
             email_address,
             label,
             is_primary,
             created_by,
             modified_by
           ) VALUES ($1, $2, 'personal', true, $3, $3)
           RETURNING id`,
          [targetContactId, value, userId]
        );

        if (created.rows[0]?.id) {
          await setContactMethodPrimary(client, targetContactId, created.rows[0].id, 'contact_email_addresses');
        }
      };

      const selectedEmail = updateFields.email as string | null;
      const selectedPhone = updateFields.phone as string | null;
      const selectedMobilePhone = updateFields.mobile_phone as string | null;

      await resolveSummaryEmail(selectedEmail);
      await resolveSummaryPhone('phone', selectedPhone);
      await resolveSummaryPhone('mobile_phone', selectedMobilePhone);

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

      const simpleUpdates: Array<{ key: string; sql: string; params: (string | boolean | null)[] }> = [
        {
          key: 'contact_notes',
          sql: 'UPDATE contact_notes SET contact_id = $2 WHERE contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'contact_documents',
          sql: 'UPDATE contact_documents SET contact_id = $2 WHERE contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'cases',
          sql: 'UPDATE cases SET contact_id = $2, modified_by = $3 WHERE contact_id = $1',
          params: [contactId, targetContactId, userId],
        },
        {
          key: 'appointments',
          sql: 'UPDATE appointments SET contact_id = $2 WHERE contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'donations',
          sql: 'UPDATE donations SET contact_id = $2, modified_by = $3 WHERE contact_id = $1',
          params: [contactId, targetContactId, userId],
        },
        {
          key: 'opportunities',
          sql: 'UPDATE opportunities SET contact_id = $2, modified_by = $3 WHERE contact_id = $1',
          params: [contactId, targetContactId, userId],
        },
        {
          key: 'recurring_donation_plans',
          sql: 'UPDATE recurring_donation_plans SET contact_id = $2, modified_by = $3 WHERE contact_id = $1',
          params: [contactId, targetContactId, userId],
        },
        {
          key: 'portal_users',
          sql: 'UPDATE portal_users SET contact_id = $2 WHERE contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'portal_signup_requests',
          sql: 'UPDATE portal_signup_requests SET contact_id = $2 WHERE contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'portal_invitations',
          sql: 'UPDATE portal_invitations SET contact_id = $2 WHERE contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'portal_threads',
          sql: 'UPDATE portal_threads SET contact_id = $2 WHERE contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'tasks',
          sql: "UPDATE tasks SET related_to_id = $2, modified_by = $3 WHERE related_to_type = 'contact' AND related_to_id = $1",
          params: [contactId, targetContactId, userId],
        },
        {
          key: 'activities',
          sql: "UPDATE activities SET regarding_id = $2 WHERE regarding_type = 'contact' AND regarding_id = $1",
          params: [contactId, targetContactId],
        },
        {
          key: 'activity_events_entity',
          sql: "UPDATE activity_events SET entity_id = $2 WHERE entity_type = 'contact' AND entity_id = $1",
          params: [contactId, targetContactId],
        },
        {
          key: 'activity_events_related',
          sql: "UPDATE activity_events SET related_entity_id = $2 WHERE related_entity_type = 'contact' AND related_entity_id = $1",
          params: [contactId, targetContactId],
        },
        {
          key: 'public_submissions',
          sql: "UPDATE public_submissions SET result_entity_id = $2 WHERE result_entity_type = 'contact' AND result_entity_id = $1",
          params: [contactId, targetContactId],
        },
        {
          key: 'conversion_events',
          sql: "UPDATE conversion_events SET source_entity_id = $2 WHERE source_entity_type = 'contact' AND source_entity_id = $1",
          params: [contactId, targetContactId],
        },
        {
          key: 'meetings_presiding',
          sql: 'UPDATE meetings SET presiding_contact_id = $2 WHERE presiding_contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'meetings_secretary',
          sql: 'UPDATE meetings SET secretary_contact_id = $2 WHERE secretary_contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'meeting_agenda_items',
          sql: 'UPDATE meeting_agenda_items SET presenter_contact_id = $2 WHERE presenter_contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'meeting_motions_moved',
          sql: 'UPDATE meeting_motions SET moved_by_contact_id = $2 WHERE moved_by_contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'meeting_motions_seconded',
          sql: 'UPDATE meeting_motions SET seconded_by_contact_id = $2 WHERE seconded_by_contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'meeting_action_items',
          sql: 'UPDATE meeting_action_items SET assigned_contact_id = $2 WHERE assigned_contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'event_registrations',
          sql: 'UPDATE event_registrations SET contact_id = $2 WHERE contact_id = $1',
          params: [contactId, targetContactId],
        },
        {
          key: 'committee_members',
          sql: 'UPDATE committee_members SET contact_id = $2 WHERE contact_id = $1',
          params: [contactId, targetContactId],
        },
      ];

      for (const update of simpleUpdates) {
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
