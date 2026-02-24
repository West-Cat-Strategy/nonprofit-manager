import { services } from '@container/services';
import type { CaseCatalogPort, CaseLifecyclePort } from '../types/ports';
import type {
  BulkStatusUpdateDTO,
  CaseFilter,
  CreateCaseDTO,
  ReassignCaseDTO,
  UpdateCaseDTO,
  UpdateCaseStatusDTO,
} from '@app-types/case';

export class CaseRepository implements CaseCatalogPort, CaseLifecyclePort {
  async getCases(filter: CaseFilter): Promise<{ cases: unknown[]; total: number }> {
    return services.case.getCases(filter);
  }

  async getCaseById(caseId: string): Promise<unknown | null> {
    return services.case.getCaseById(caseId);
  }

  async getCaseTimeline(caseId: string): Promise<unknown[]> {
    return services.case.getCaseTimeline(caseId);
  }

  async getCaseSummary(): Promise<unknown> {
    return services.case.getCaseSummary();
  }

  async getCaseTypes(): Promise<unknown[]> {
    return services.case.getCaseTypes();
  }

  async getCaseStatuses(): Promise<unknown[]> {
    return services.case.getCaseStatuses();
  }

  async createCase(data: CreateCaseDTO, userId?: string): Promise<unknown> {
    return services.case.createCase(data, userId);
  }

  async updateCase(caseId: string, data: UpdateCaseDTO, userId?: string): Promise<unknown> {
    return services.case.updateCase(caseId, data, userId);
  }

  async updateCaseStatus(caseId: string, data: UpdateCaseStatusDTO, userId?: string): Promise<unknown> {
    return services.case.updateCaseStatus(caseId, data, userId);
  }

  async reassignCase(caseId: string, data: ReassignCaseDTO, userId?: string): Promise<unknown> {
    return services.case.reassignCase(caseId, data.assigned_to, data.reason, userId);
  }

  async bulkUpdateCaseStatus(data: BulkStatusUpdateDTO, userId?: string): Promise<unknown> {
    return services.case.bulkUpdateStatus(data.case_ids, data.new_status_id, data.notes, userId);
  }

  async deleteCase(caseId: string): Promise<void> {
    return services.case.deleteCase(caseId);
  }
}
