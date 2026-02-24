import type { CaseNotesPort } from '../types/ports';
import type { CreateCaseNoteDTO, UpdateCaseNoteDTO } from '@app-types/case';

export class CaseNotesUseCase {
  constructor(private readonly repository: CaseNotesPort) {}

  list(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseNotes(caseId);
  }

  create(data: CreateCaseNoteDTO, userId?: string): Promise<unknown> {
    return this.repository.createCaseNote(data, userId);
  }

  update(noteId: string, data: UpdateCaseNoteDTO, userId?: string): Promise<unknown> {
    return this.repository.updateCaseNote(noteId, data, userId);
  }

  delete(noteId: string): Promise<boolean> {
    return this.repository.deleteCaseNote(noteId);
  }
}
