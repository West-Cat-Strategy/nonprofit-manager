import {
  type CreateGrantAwardDTO,
  type CreateGrantDisbursementDTO,
  type GrantDisbursement,
  type GrantListFilters,
  type GrantAward,
  type PaginatedGrantResult,
  type UpdateGrantAwardDTO,
  type UpdateGrantDisbursementDTO,
} from '@app-types/grant';
import { GrantsAwardsService } from '../grantsAwardsService';

export class GrantsServiceAwardsFacade {
  constructor(private readonly awardsService: GrantsAwardsService) {}

  async listGrants(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantAward>> {
    return this.awardsService.listGrants(organizationId, filters);
  }

  async getGrantById(organizationId: string, id: string): Promise<GrantAward | null> {
    return this.awardsService.getGrantById(organizationId, id);
  }

  async createGrant(
    organizationId: string,
    userId: string,
    data: CreateGrantAwardDTO
  ): Promise<GrantAward> {
    return this.awardsService.createGrant(organizationId, userId, data);
  }

  async updateGrant(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantAwardDTO
  ): Promise<GrantAward | null> {
    return this.awardsService.updateGrant(organizationId, id, userId, data);
  }

  async deleteGrant(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    return this.awardsService.deleteGrant(organizationId, id, userId);
  }

  async listDisbursements(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantDisbursement>> {
    return this.awardsService.listDisbursements(organizationId, filters);
  }

  async getDisbursementById(
    organizationId: string,
    id: string
  ): Promise<GrantDisbursement | null> {
    return this.awardsService.getDisbursementById(organizationId, id);
  }

  async createDisbursement(
    organizationId: string,
    userId: string,
    data: CreateGrantDisbursementDTO
  ): Promise<GrantDisbursement> {
    return this.awardsService.createDisbursement(organizationId, userId, data);
  }

  async updateDisbursement(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantDisbursementDTO
  ): Promise<GrantDisbursement | null> {
    return this.awardsService.updateDisbursement(organizationId, id, userId, data);
  }

  async deleteDisbursement(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.awardsService.deleteDisbursement(organizationId, id, userId);
  }
}
