import type { CaseNotesPort } from '../types/ports';
import type { CreateCaseNoteDTO, UpdateCaseNoteDTO } from '@app-types/case';

const normalizeText = (value: string | undefined | null): string | undefined | null => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export class CaseNotesUseCase {
  constructor(private readonly repository: CaseNotesPort) {}

  list(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseNotes(caseId.trim());
  }

  create(data: CreateCaseNoteDTO, userId?: string): Promise<unknown> {
    const normalizedData: CreateCaseNoteDTO = {
      ...data,
      case_id: data.case_id.trim(),
      subject: normalizeText(data.subject) ?? undefined,
      category: normalizeText(data.category) ?? undefined,
      content: data.content.trim(),
    };
    return this.repository.createCaseNote(normalizedData, userId);
  }

  update(noteId: string, data: UpdateCaseNoteDTO, userId?: string): Promise<unknown> {
    const normalizedData: UpdateCaseNoteDTO = {
      ...data,
      subject: normalizeText(data.subject) ?? undefined,
      category: normalizeText(data.category),
      content: normalizeText(data.content) ?? undefined,
    };
    return this.repository.updateCaseNote(noteId.trim(), normalizedData, userId);
  }

  delete(noteId: string): Promise<boolean> {
    return this.repository.deleteCaseNote(noteId.trim());
  }
}
