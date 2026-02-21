import { services } from '@container/services';
import type { CaseNotesPort } from '../types/ports';
import type { CreateCaseNoteDTO } from '@app-types/case';

export class CaseNotesRepository implements CaseNotesPort {
  async getCaseNotes(caseId: string): Promise<unknown[]> {
    return services.case.getCaseNotes(caseId);
  }

  async createCaseNote(data: CreateCaseNoteDTO, userId?: string): Promise<unknown> {
    return services.case.createCaseNote(data, userId);
  }
}
