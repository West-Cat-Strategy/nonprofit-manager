import type { CaseCatalogPort } from '../types/ports';
import type { CaseFilter } from '@app-types/case';

const normalizeString = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const clampInteger = (value: number | undefined, min: number, max: number): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  return Math.min(max, Math.max(min, Math.trunc(value)));
};

export class CaseCatalogUseCase {
  constructor(private readonly repository: CaseCatalogPort) {}

  list(filter: CaseFilter): Promise<{ cases: unknown[]; total: number }> {
    const normalizedFilter: CaseFilter = {
      ...filter,
      organizationId: normalizeString(filter.organizationId),
      search: normalizeString(filter.search),
      contact_id: normalizeString(filter.contact_id),
      account_id: normalizeString(filter.account_id),
      case_type_id: normalizeString(filter.case_type_id),
      status_id: normalizeString(filter.status_id),
      assigned_to: normalizeString(filter.assigned_to),
      assigned_team: normalizeString(filter.assigned_team),
      sort_by: normalizeString(filter.sort_by),
      page: clampInteger(filter.page, 1, 10_000),
      limit: clampInteger(filter.limit, 1, 200),
      due_within_days: clampInteger(filter.due_within_days, 0, 365),
    };
    return this.repository.getCases(normalizedFilter);
  }

  getById(caseId: string, organizationId?: string): Promise<unknown | null> {
    return this.repository.getCaseById(caseId.trim(), normalizeString(organizationId));
  }

  timeline(
    caseId: string,
    options?: { limit?: number; cursor?: string },
    organizationId?: string
  ): Promise<{ items: unknown[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> {
    const normalizedOptions = options
      ? {
          ...options,
          limit: clampInteger(options.limit, 1, 200),
          cursor: normalizeString(options.cursor),
        }
      : options;
    return this.repository.getCaseTimeline(caseId.trim(), normalizedOptions, normalizeString(organizationId));
  }

  summary(organizationId?: string): Promise<unknown> {
    return this.repository.getCaseSummary(normalizeString(organizationId));
  }

  types(): Promise<unknown[]> {
    return this.repository.getCaseTypes();
  }

  statuses(): Promise<unknown[]> {
    return this.repository.getCaseStatuses();
  }
}
