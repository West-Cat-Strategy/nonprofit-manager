import pool from '@config/database';
import type { CaseNotesPort } from '../types/ports';
import type { CreateCaseNoteDTO, UpdateCaseNoteDTO } from '@app-types/case';
import {
  createCaseNoteQuery,
  deleteCaseNoteQuery,
  getCaseNotesQuery,
  updateCaseNoteQuery,
} from '../queries/notesQueries';

export class CaseNotesRepository implements CaseNotesPort {
  async getCaseNotes(caseId: string): Promise<unknown[]> {
    return getCaseNotesQuery(pool, caseId);
  }

  async createCaseNote(data: CreateCaseNoteDTO, userId?: string): Promise<unknown> {
    return createCaseNoteQuery(pool, data, userId);
  }

  async updateCaseNote(noteId: string, data: UpdateCaseNoteDTO, userId?: string): Promise<unknown> {
    return updateCaseNoteQuery(pool, noteId, data, userId);
  }

  async deleteCaseNote(noteId: string): Promise<boolean> {
    return deleteCaseNoteQuery(pool, noteId);
  }
}
