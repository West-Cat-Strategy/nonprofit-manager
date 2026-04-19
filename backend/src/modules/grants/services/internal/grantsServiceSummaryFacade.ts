import type { GrantSummaryFilters } from '../grantsSummaryService';
import { GrantsSummaryService } from '../grantsSummaryService';

export class GrantsServiceSummaryFacade {
  constructor(private readonly summaryService: GrantsSummaryService) {}

  getSummary(organizationId: string, filters: GrantSummaryFilters = {}) {
    return this.summaryService.getSummary(organizationId, filters);
  }
}
