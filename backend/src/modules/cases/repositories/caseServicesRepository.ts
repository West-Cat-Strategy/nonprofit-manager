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
  async getCaseServices(caseId: string): Promise<unknown[]> {
    return getCaseServicesQuery(pool, caseId);
  }

  async createCaseService(caseId: string, data: CreateCaseServiceDTO, userId?: string): Promise<unknown> {
    return createCaseServiceQuery(pool, caseId, data, userId);
  }

  async updateCaseService(serviceId: string, data: UpdateCaseServiceDTO, userId?: string): Promise<unknown> {
    return updateCaseServiceQuery(pool, serviceId, data, userId);
  }

  async deleteCaseService(serviceId: string): Promise<void> {
    return deleteCaseServiceQuery(pool, serviceId);
  }
}
