import {
  type CreateGrantApplicationDTO,
  type CreateGrantAwardDTO,
  type GrantApplication,
  type GrantApplicationStatus,
  type GrantListFilters,
  type GrantAward,
  type PaginatedGrantResult,
  type UpdateGrantApplicationDTO,
} from '@app-types/grant';
import { GrantsApplicationsService } from '../grantsApplicationsService';

export class GrantsServiceApplicationsFacade {
  constructor(private readonly applicationsService: GrantsApplicationsService) {}

  async listApplications(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantApplication>> {
    return this.applicationsService.listApplications(organizationId, filters);
  }

  async getApplicationById(
    organizationId: string,
    id: string
  ): Promise<GrantApplication | null> {
    return this.applicationsService.getApplicationById(organizationId, id);
  }

  async createApplication(
    organizationId: string,
    userId: string,
    data: CreateGrantApplicationDTO
  ): Promise<GrantApplication> {
    return this.applicationsService.createApplication(organizationId, userId, data);
  }

  async updateApplication(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantApplicationDTO
  ): Promise<GrantApplication | null> {
    return this.applicationsService.updateApplication(organizationId, id, userId, data);
  }

  async updateApplicationStatus(
    organizationId: string,
    id: string,
    userId: string,
    status: GrantApplicationStatus,
    data: {
      reviewed_at?: string | null;
      decision_at?: string | null;
      approved_amount?: number | null;
      outcome_reason?: string | null;
      notes?: string | null;
    }
  ): Promise<GrantApplication | null> {
    return this.applicationsService.updateApplicationStatus(organizationId, id, userId, status, data);
  }

  async deleteApplication(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.applicationsService.deleteApplication(organizationId, id, userId);
  }

  async awardApplication(
    organizationId: string,
    applicationId: string,
    userId: string,
    data: CreateGrantAwardDTO
  ): Promise<{ application: GrantApplication; grant: GrantAward } | null> {
    return this.applicationsService.awardApplication(organizationId, applicationId, userId, data);
  }
}
