import pool from '@config/database';
import type { CaseServiceAssignmentsPort } from '../types/ports';
import type { CreateCaseServiceDTO, UpdateCaseServiceDTO } from '@app-types/case';
import {
  createCaseServiceQuery,
  deleteCaseServiceQuery,
  getCaseServicesQuery,
  updateCaseServiceQuery,
} from '../queries/servicesQueries';

export class CaseServicesRepository implements CaseServiceAssignmentsPort {
  async getCaseServices(caseId: string, organizationId?: string): Promise<unknown[]> {
    return getCaseServicesQuery(pool, caseId, organizationId);
  }

  async createCaseService(
    caseId: string,
    data: CreateCaseServiceDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return createCaseServiceQuery(pool, caseId, data, userId, organizationId);
  }

  async updateCaseService(
    serviceId: string,
    data: UpdateCaseServiceDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return updateCaseServiceQuery(pool, serviceId, data, userId, organizationId);
  }

  async deleteCaseService(serviceId: string, organizationId?: string): Promise<void> {
    return deleteCaseServiceQuery(pool, serviceId, organizationId);
  }
}
