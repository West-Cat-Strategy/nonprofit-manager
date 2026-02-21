import type { CaseNotesPort } from '../types/ports';
import type { CreateCaseNoteDTO } from '@app-types/case';

export class CaseNotesUseCase {
  constructor(private readonly repository: CaseNotesPort) {}

  list(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseNotes(caseId);
  }

  create(data: CreateCaseNoteDTO, userId?: string): Promise<unknown> {
    return this.repository.createCaseNote(data, userId);
  }
}
