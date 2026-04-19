import {
  type CreateRecipientOrganizationDTO,
  type GrantListFilters,
  type PaginatedGrantResult,
  type RecipientOrganization,
  type UpdateRecipientOrganizationDTO,
} from '@app-types/grant';
import { GrantsPortfolioRecipientCommandService } from '../grantsPortfolioRecipientCommandService';
import { GrantsPortfolioRecipientQueryService } from '../grantsPortfolioRecipientQueryService';
import type { GrantsPortfolioDependencies } from '../grantsPortfolioTypes';

export class GrantsPortfolioRecipientService {
  private readonly queryService: GrantsPortfolioRecipientQueryService;
  private readonly commandService: GrantsPortfolioRecipientCommandService;

  constructor(deps: GrantsPortfolioDependencies) {
    this.queryService = new GrantsPortfolioRecipientQueryService(deps);
    this.commandService = new GrantsPortfolioRecipientCommandService(deps);
  }

  async listRecipients(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<RecipientOrganization>> {
    return this.queryService.listRecipients(organizationId, filters);
  }

  async getRecipientById(
    organizationId: string,
    id: string
  ): Promise<RecipientOrganization | null> {
    return this.queryService.getRecipientById(organizationId, id);
  }

  async createRecipient(
    organizationId: string,
    userId: string,
    data: CreateRecipientOrganizationDTO
  ): Promise<RecipientOrganization> {
    return this.commandService.createRecipient(organizationId, userId, data);
  }

  async updateRecipient(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateRecipientOrganizationDTO
  ): Promise<RecipientOrganization | null> {
    return this.commandService.updateRecipient(organizationId, id, userId, data);
  }

  async deleteRecipient(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.commandService.deleteRecipient(organizationId, id, userId);
  }
}
