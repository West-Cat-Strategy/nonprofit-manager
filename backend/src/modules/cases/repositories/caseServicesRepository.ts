import { services } from '@container/services';
import type { CaseServiceAssignmentsPort } from '../types/ports';
import type { CreateCaseServiceDTO, UpdateCaseServiceDTO } from '@app-types/case';

export class CaseServicesRepository implements CaseServiceAssignmentsPort {
  async getCaseServices(caseId: string): Promise<unknown[]> {
    return services.case.getCaseServices(caseId);
  }

  async createCaseService(caseId: string, data: CreateCaseServiceDTO, userId?: string): Promise<unknown> {
    return services.case.createCaseService(caseId, data, userId);
  }

  async updateCaseService(serviceId: string, data: UpdateCaseServiceDTO, userId?: string): Promise<unknown> {
    return services.case.updateCaseService(serviceId, data, userId);
  }

  async deleteCaseService(serviceId: string): Promise<void> {
    return services.case.deleteCaseService(serviceId);
  }
}
