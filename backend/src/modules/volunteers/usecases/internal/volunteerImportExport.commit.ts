import type { Pool } from 'pg';
import type {
  VolunteerImportAnalysisResult,
  VolunteerImportCommitResult,
} from '../volunteerImportExport.types';
import {
  insertVolunteerImportContact,
  syncVolunteerImportRoles,
  updateVolunteerImportContact,
  type VolunteerImportContactPersistence,
} from './volunteerImportExport.contactPersistence';
import {
  insertImportedVolunteer,
  updateImportedVolunteer,
  type VolunteerImportVolunteerPersistence,
} from './volunteerImportExport.volunteerPersistence';

export type VolunteerImportCommitDependencies = VolunteerImportContactPersistence &
  VolunteerImportVolunteerPersistence;

const createVolunteerImportValidationError = (
  rowErrors: VolunteerImportAnalysisResult['rowErrors']
): Error =>
  Object.assign(new Error('Import preview contains validation errors'), {
    statusCode: 400,
    details: { row_errors: rowErrors },
  });

export const commitVolunteerImport = async ({
  pool,
  analysis,
  organizationId,
  userId,
  insertContact = insertVolunteerImportContact,
  updateContact = updateVolunteerImportContact,
  syncRoles = syncVolunteerImportRoles,
  insertVolunteer = insertImportedVolunteer,
  updateVolunteer = updateImportedVolunteer,
}: {
  pool: Pick<Pool, 'connect'>;
  analysis: VolunteerImportAnalysisResult;
  organizationId: string;
  userId: string;
} & Partial<VolunteerImportCommitDependencies>): Promise<VolunteerImportCommitResult> => {
  if (analysis.rowErrors.length > 0) {
    throw createVolunteerImportValidationError(analysis.rowErrors);
  }

  const client = await pool.connect();
  const affectedIds: string[] = [];
  let created = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    for (const action of analysis.actions) {
      let contactId = action.contactId;

      if (action.contactAction === 'create') {
        contactId = await insertContact(
          client,
          action.contactPayload,
          action.resolvedAccountId ?? organizationId,
          userId
        );
        await syncRoles(client, contactId, action.contactPayload.roles ?? [], userId);
      } else if (action.contactAction === 'update' && contactId) {
        await updateContact(
          client,
          contactId,
          action.contactPayload,
          action.resolvedAccountId,
          userId
        );
        if (action.contactPayload.roles) {
          await syncRoles(client, contactId, action.contactPayload.roles, userId);
        }
      }

      if (!contactId) {
        throw new Error(`Missing contact context for volunteer import row ${action.rowNumber}`);
      }

      if (action.volunteerAction === 'create') {
        const volunteerId = await insertVolunteer(client, contactId, action.volunteerPayload, userId);
        affectedIds.push(volunteerId);
        created += 1;
        continue;
      }

      const volunteerId = action.volunteerId;
      if (!volunteerId) {
        throw new Error(`Missing volunteer ID for update row ${action.rowNumber}`);
      }

      await updateVolunteer(client, volunteerId, action.volunteerPayload, userId);
      affectedIds.push(volunteerId);
      updated += 1;
    }

    await client.query('COMMIT');
    return {
      created,
      updated,
      total_processed: created + updated,
      affected_ids: affectedIds,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
