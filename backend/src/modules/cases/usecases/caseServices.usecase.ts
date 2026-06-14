import type { CaseServiceAssignmentsPort } from '../types/ports';
import type { CreateCaseServiceDTO, UpdateCaseServiceDTO } from '@app-types/case';

export class CaseServicesUseCase {
  constructor(private readonly repository: CaseServiceAssignmentsPort) {}

  list(caseId: string, organizationId?: string): Promise<unknown[]> {
    return this.repository.getCaseServices(caseId, organizationId);
  }

  create(
    caseId: string,
    data: CreateCaseServiceDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return this.repository.createCaseService(
      caseId,
      {
        ...data,
        service_name: data.service_name.trim(),
        service_provider: data.service_provider?.trim(),
        notes: data.notes?.trim(),
        currency: data.currency?.trim().toUpperCase(),
      },
      userId,
      organizationId
    );
  }

  update(
    serviceId: string,
    data: UpdateCaseServiceDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return this.repository.updateCaseService(
      serviceId,
      {
        ...data,
        ...(data.service_name !== undefined ? { service_name: data.service_name.trim() } : {}),
        ...(data.service_provider !== undefined
          ? { service_provider: data.service_provider.trim() }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes.trim() } : {}),
        ...(data.currency !== undefined ? { currency: data.currency.trim().toUpperCase() } : {}),
      },
      userId,
      organizationId
    );
  }

  delete(serviceId: string, organizationId?: string): Promise<void> {
    return this.repository.deleteCaseService(serviceId, organizationId);
  }
}
