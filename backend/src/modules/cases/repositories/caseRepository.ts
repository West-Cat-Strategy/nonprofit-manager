import pool from '@config/database';
import type { CaseCatalogPort, CaseLifecyclePort } from '../types/ports';
import type {
  BulkStatusUpdateDTO,
  CaseFilter,
  CreateCaseDTO,
  ReassignCaseDTO,
  UpdateCaseDTO,
  UpdateCaseStatusDTO,
} from '@app-types/case';
import {
  getCaseByIdQuery,
  getCaseStatusesQuery,
  getCaseSummaryQuery,
  getCasesQuery,
  getCaseTimelineQuery,
  getCaseTypesQuery,
} from '../queries/catalogQueries';
import {
  bulkUpdateStatusQuery,
  createCaseQuery,
  deleteCaseQuery,
  reassignCaseQuery,
  updateCaseQuery,
  updateCaseStatusQuery,
} from '../queries/lifecycleQueries';

export class CaseRepository implements CaseCatalogPort, CaseLifecyclePort {
  async getCases(filter: CaseFilter): Promise<{ cases: unknown[]; total: number }> {
    return getCasesQuery(pool, filter);
  }

  async getCaseById(caseId: string, organizationId?: string): Promise<unknown | null> {
    return getCaseByIdQuery(pool, caseId, organizationId);
  }

  async getCaseTimeline(
    caseId: string,
    options?: { limit?: number; cursor?: string },
    organizationId?: string
  ): Promise<{ items: unknown[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> {
    return getCaseTimelineQuery(pool, caseId, options, organizationId);
  }

  async getCaseSummary(organizationId?: string): Promise<unknown> {
    return getCaseSummaryQuery(pool, organizationId);
  }

  async getCaseTypes(): Promise<unknown[]> {
    return getCaseTypesQuery(pool);
  }

  async getCaseStatuses(): Promise<unknown[]> {
    return getCaseStatusesQuery(pool);
  }

  async createCase(data: CreateCaseDTO, userId?: string): Promise<unknown> {
    return createCaseQuery(pool, data, userId);
  }

  async updateCase(caseId: string, data: UpdateCaseDTO, userId?: string): Promise<unknown> {
    return updateCaseQuery(pool, caseId, data, userId);
  }

  async updateCaseStatus(caseId: string, data: UpdateCaseStatusDTO, userId?: string): Promise<unknown> {
    return updateCaseStatusQuery(pool, caseId, data, userId);
  }

  async reassignCase(caseId: string, data: ReassignCaseDTO, userId?: string): Promise<unknown> {
    return reassignCaseQuery(pool, caseId, data, userId);
  }

  async bulkUpdateCaseStatus(data: BulkStatusUpdateDTO, userId?: string): Promise<unknown> {
    return bulkUpdateStatusQuery(pool, data, userId);
  }

  async deleteCase(caseId: string): Promise<void> {
    return deleteCaseQuery(pool, caseId);
  }
}
