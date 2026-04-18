import type { CaseLifecyclePort } from '../types/ports';
import type {
  BulkStatusUpdateDTO,
  CaseOutcome,
  CreateCaseDTO,
  ReassignCaseDTO,
  UpdateCaseDTO,
  UpdateCaseStatusDTO,
} from '@app-types/case';

const normalizeText = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeStringArray = (values: string[] | undefined): string[] | undefined => {
  if (!Array.isArray(values)) return values;

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

const resolvePreferredStrings = (values: string[] | undefined, fallback?: string): string[] => {
  const normalizedValues = normalizeStringArray(values);
  if (normalizedValues && normalizedValues.length > 0) {
    return normalizedValues;
  }

  const normalizedFallback = normalizeText(fallback);
  return normalizedFallback ? [normalizedFallback] : [];
};

const normalizeTags = (tags: string[] | undefined): string[] | undefined => {
  if (!Array.isArray(tags)) return tags;
  const normalized = tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  return normalized.length > 0 ? normalized : [];
};

export class CaseLifecycleUseCase {
  constructor(private readonly repository: CaseLifecyclePort) {}

  create(data: CreateCaseDTO, userId?: string, organizationId?: string): Promise<unknown> {
    const caseTypeIds = resolvePreferredStrings(data.case_type_ids, data.case_type_id);
    const caseOutcomeValues = resolvePreferredStrings(
      data.case_outcome_values,
      data.outcome as CaseOutcome | undefined
    ) as CaseOutcome[];
    const primaryCaseTypeId = caseTypeIds[0] ?? normalizeText(data.case_type_id);
    const primaryCaseOutcome = caseOutcomeValues[0] ?? (normalizeText(data.outcome) as CaseOutcome | undefined);

    const normalizedData: CreateCaseDTO = {
      ...data,
      contact_id: data.contact_id.trim(),
      account_id: normalizeText(data.account_id),
      case_type_id: primaryCaseTypeId,
      case_type_ids: caseTypeIds.length > 0 ? caseTypeIds : undefined,
      title: data.title.trim(),
      description: normalizeText(data.description),
      referral_source: normalizeText(data.referral_source),
      assigned_to: normalizeText(data.assigned_to),
      assigned_team: normalizeText(data.assigned_team),
      tags: normalizeTags(data.tags),
      outcome: primaryCaseOutcome,
      case_outcome_values: caseOutcomeValues.length > 0 ? caseOutcomeValues : undefined,
    };
    return this.repository.createCase(normalizedData, userId, organizationId);
  }

  update(caseId: string, data: UpdateCaseDTO, userId?: string): Promise<unknown> {
    const caseTypeIds = resolvePreferredStrings(data.case_type_ids, data.case_type_id);
    const caseOutcomeValues = resolvePreferredStrings(
      data.case_outcome_values,
      data.outcome as CaseOutcome | undefined
    ) as CaseOutcome[];
    const primaryCaseTypeId = caseTypeIds[0] ?? normalizeText(data.case_type_id);
    const primaryCaseOutcome = caseOutcomeValues[0] ?? (normalizeText(data.outcome) as CaseOutcome | undefined);

    const normalizedData: UpdateCaseDTO = {
      ...data,
      title: normalizeText(data.title),
      description: normalizeText(data.description),
      assigned_to: normalizeText(data.assigned_to),
      assigned_team: normalizeText(data.assigned_team),
      outcome_notes: normalizeText(data.outcome_notes),
      closure_reason: normalizeText(data.closure_reason),
      tags: normalizeTags(data.tags),
      case_type_id: primaryCaseTypeId,
      case_type_ids: caseTypeIds.length > 0 ? caseTypeIds : undefined,
      outcome: primaryCaseOutcome,
      case_outcome_values: caseOutcomeValues.length > 0 ? caseOutcomeValues : undefined,
    };
    return this.repository.updateCase(caseId.trim(), normalizedData, userId);
  }

  updateStatus(caseId: string, data: UpdateCaseStatusDTO, userId?: string): Promise<unknown> {
    const normalizedData: UpdateCaseStatusDTO = {
      ...data,
      new_status_id: data.new_status_id.trim(),
      reason: normalizeText(data.reason),
      notes: normalizeText(data.notes),
      outcome_definition_ids: data.outcome_definition_ids?.map((id) => id.trim()).filter(Boolean),
    };
    return this.repository.updateCaseStatus(caseId.trim(), normalizedData, userId);
  }

  reassign(caseId: string, data: ReassignCaseDTO, userId?: string): Promise<unknown> {
    const normalizedData: ReassignCaseDTO = {
      ...data,
      assigned_to: data.assigned_to?.trim() ?? null,
      reason: normalizeText(data.reason),
    };
    return this.repository.reassignCase(caseId.trim(), normalizedData, userId);
  }

  bulkUpdate(data: BulkStatusUpdateDTO, userId?: string): Promise<unknown> {
    const normalizedData: BulkStatusUpdateDTO = {
      ...data,
      case_ids: data.case_ids.map((caseId) => caseId.trim()).filter((caseId) => caseId.length > 0),
      new_status_id: data.new_status_id.trim(),
      notes: normalizeText(data.notes),
    };
    return this.repository.bulkUpdateCaseStatus(normalizedData, userId);
  }

  delete(caseId: string): Promise<void> {
    return this.repository.deleteCase(caseId.trim());
  }
}
