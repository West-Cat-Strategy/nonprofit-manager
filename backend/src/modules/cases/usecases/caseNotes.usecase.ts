import type { CaseNotesPort } from '../types/ports';
import type { CreateCaseNoteDTO, UpdateCaseNoteDTO } from '@app-types/case';
import type { InteractionOutcomeImpactInput } from '@app-types/outcomes';

const normalizeText = (value: string | undefined | null): string | undefined | null => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeOutcomeImpacts = (
  impacts: InteractionOutcomeImpactInput[] | undefined
): InteractionOutcomeImpactInput[] | undefined => {
  if (!impacts) {
    return impacts;
  }

  return impacts.map((impact) => ({
    ...impact,
    evidenceNote: normalizeText(impact.evidenceNote) ?? null,
  }));
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
      outcome_impacts: normalizeOutcomeImpacts(data.outcome_impacts),
    };
    return this.repository.createCaseNote(normalizedData, userId);
  }

  update(noteId: string, data: UpdateCaseNoteDTO, userId?: string): Promise<unknown> {
    const normalizedData: UpdateCaseNoteDTO = {
      ...data,
      subject: normalizeText(data.subject) ?? undefined,
      category: normalizeText(data.category),
      content: normalizeText(data.content) ?? undefined,
      outcome_impacts: normalizeOutcomeImpacts(data.outcome_impacts),
    };
    return this.repository.updateCaseNote(noteId.trim(), normalizedData, userId);
  }

  delete(noteId: string): Promise<boolean> {
    return this.repository.deleteCaseNote(noteId.trim());
  }
}
