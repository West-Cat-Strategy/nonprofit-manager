import pool from '@config/database';
import { logger } from '@config/logger';
import * as outcomeImpactService from '@services/outcomeImpactService';
import type { CaseNotesPort } from '../types/ports';
import type { CreateCaseNoteDTO, UpdateCaseNoteDTO } from '@app-types/case';
import {
  createCaseNoteQuery,
  deleteCaseNoteQuery,
  getCaseNoteByIdQuery,
  getCaseNotesQuery,
  updateCaseNoteQuery,
} from '../queries/notesQueries';

export class CaseNotesRepository implements CaseNotesPort {
  async getCaseNotes(caseId: string, organizationId?: string): Promise<unknown[]> {
    return getCaseNotesQuery(pool, caseId, organizationId);
  }

  async createCaseNote(data: CreateCaseNoteDTO, userId?: string, organizationId?: string): Promise<unknown> {
    const hasInlineOutcomes = data.outcome_impacts !== undefined || data.outcomes_mode !== undefined;
    if (!hasInlineOutcomes) {
      return createCaseNoteQuery(pool, data, userId, organizationId);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
 
      const createdNote = await createCaseNoteQuery(client, data, userId, organizationId);
      await outcomeImpactService.saveInteractionOutcomesWithExecutor(
        client,
        data.case_id,
        createdNote.id,
        {
          impacts: data.outcome_impacts || [],
          mode: data.outcomes_mode || 'replace',
        },
        userId
      );
 
      const hydratedNote = await getCaseNoteByIdQuery(client, createdNote.id, organizationId);
      await client.query('COMMIT');

      return hydratedNote ?? createdNote;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback errors
      }
      logger.error('Failed to create case note with inline outcomes', {
        error,
        caseId: data.case_id,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateCaseNote(noteId: string, data: UpdateCaseNoteDTO, userId?: string, organizationId?: string): Promise<unknown> {
    const hasInlineOutcomes = data.outcome_impacts !== undefined || data.outcomes_mode !== undefined;
    if (!hasInlineOutcomes) {
      return updateCaseNoteQuery(pool, noteId, data, userId, organizationId);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
 
      const updatedNote = await updateCaseNoteQuery(client, noteId, data, userId, organizationId);
      await outcomeImpactService.saveInteractionOutcomesWithExecutor(
        client,
        updatedNote.case_id,
        updatedNote.id,
        {
          impacts: data.outcome_impacts || [],
          mode: data.outcomes_mode || 'replace',
        },
        userId
      );
 
      const hydratedNote = await getCaseNoteByIdQuery(client, updatedNote.id, organizationId);
      await client.query('COMMIT');

      return hydratedNote ?? updatedNote;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback errors
      }
      logger.error('Failed to update case note with inline outcomes', {
        error,
        noteId,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteCaseNote(noteId: string, organizationId?: string): Promise<boolean> {
    return deleteCaseNoteQuery(pool, noteId, organizationId);
  }
}
