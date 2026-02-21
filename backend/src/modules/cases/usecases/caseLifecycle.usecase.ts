import type { CaseLifecyclePort } from '../types/ports';
import type {
  BulkStatusUpdateDTO,
  CreateCaseDTO,
  ReassignCaseDTO,
  UpdateCaseDTO,
  UpdateCaseStatusDTO,
} from '@app-types/case';

export class CaseLifecycleUseCase {
  constructor(private readonly repository: CaseLifecyclePort) {}

  create(data: CreateCaseDTO, userId?: string): Promise<unknown> {
    return this.repository.createCase(data, userId);
  }

  update(caseId: string, data: UpdateCaseDTO, userId?: string): Promise<unknown> {
    return this.repository.updateCase(caseId, data, userId);
  }

  updateStatus(caseId: string, data: UpdateCaseStatusDTO, userId?: string): Promise<unknown> {
    return this.repository.updateCaseStatus(caseId, data, userId);
  }

  reassign(caseId: string, data: ReassignCaseDTO, userId?: string): Promise<unknown> {
    return this.repository.reassignCase(caseId, data, userId);
  }

  bulkUpdate(data: BulkStatusUpdateDTO, userId?: string): Promise<unknown> {
    return this.repository.bulkUpdateCaseStatus(data, userId);
  }

  delete(caseId: string): Promise<void> {
    return this.repository.deleteCase(caseId);
  }
}
