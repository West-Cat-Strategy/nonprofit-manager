import type { CaseServiceAssignmentsPort } from '../types/ports';
import type { CreateCaseServiceDTO, UpdateCaseServiceDTO } from '@app-types/case';

export class CaseServicesUseCase {
  constructor(private readonly repository: CaseServiceAssignmentsPort) {}

  list(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseServices(caseId);
  }

  create(caseId: string, data: CreateCaseServiceDTO, userId?: string): Promise<unknown> {
    return this.repository.createCaseService(caseId, data, userId);
  }

  update(serviceId: string, data: UpdateCaseServiceDTO, userId?: string): Promise<unknown> {
    return this.repository.updateCaseService(serviceId, data, userId);
  }

  delete(serviceId: string): Promise<void> {
    return this.repository.deleteCaseService(serviceId);
  }
}
