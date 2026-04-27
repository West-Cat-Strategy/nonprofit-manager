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
import { getCaseHandoffPacketQuery } from '../queries/handoffQueries';
import {
  bulkUpdateStatusQuery,
  createCaseQuery,
  deleteCaseQuery,
  reassignCaseQuery,
  updateCaseQuery,
  updateCaseStatusQuery,
} from '../queries/lifecycleQueries';

export class CaseRepository implements CaseCatalogPort, CaseLifecyclePort {
  async getCases(filter: CaseFilter, organizationId?: string): Promise<{ cases: unknown[]; total: number }> {
    return getCasesQuery(pool, filter, organizationId);
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

  async getCaseHandoffPacket(caseId: string, organizationId?: string): Promise<unknown> {
    return getCaseHandoffPacketQuery(pool, caseId, organizationId);
  }

  async createCase(data: CreateCaseDTO, userId?: string, organizationId?: string): Promise<unknown> {
    return createCaseQuery(pool, data, userId, organizationId);
  }

  async updateCase(caseId: string, data: UpdateCaseDTO, userId?: string, organizationId?: string): Promise<unknown> {
    return updateCaseQuery(pool, caseId, data, userId, organizationId);
  }

  async updateCaseStatus(caseId: string, data: UpdateCaseStatusDTO, userId?: string, organizationId?: string): Promise<unknown> {
    return updateCaseStatusQuery(pool, caseId, data, userId, organizationId);
  }

  async reassignCase(caseId: string, data: ReassignCaseDTO, userId?: string, organizationId?: string): Promise<unknown> {
    return reassignCaseQuery(pool, caseId, data, userId, organizationId);
  }

  async bulkUpdateCaseStatus(data: BulkStatusUpdateDTO, userId?: string, organizationId?: string): Promise<unknown> {
    return bulkUpdateStatusQuery(pool, data, userId, organizationId);
  }

  async deleteCase(caseId: string, organizationId?: string): Promise<void> {
    return deleteCaseQuery(pool, caseId, organizationId);
  }
}
