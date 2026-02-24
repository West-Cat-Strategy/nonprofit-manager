import type { CaseCatalogPort } from '../types/ports';
import type { CaseFilter } from '@app-types/case';

export class CaseCatalogUseCase {
  constructor(private readonly repository: CaseCatalogPort) {}

  list(filter: CaseFilter): Promise<{ cases: unknown[]; total: number }> {
    return this.repository.getCases(filter);
  }

  getById(caseId: string): Promise<unknown | null> {
    return this.repository.getCaseById(caseId);
  }

  timeline(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseTimeline(caseId);
  }

  summary(): Promise<unknown> {
    return this.repository.getCaseSummary();
  }

  types(): Promise<unknown[]> {
    return this.repository.getCaseTypes();
  }

  statuses(): Promise<unknown[]> {
    return this.repository.getCaseStatuses();
  }
}
