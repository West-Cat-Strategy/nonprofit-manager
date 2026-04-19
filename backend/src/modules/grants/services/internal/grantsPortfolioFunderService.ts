import {
  type CreateGrantFunderDTO,
  type GrantFunder,
  type GrantListFilters,
  type PaginatedGrantResult,
  type UpdateGrantFunderDTO,
} from '@app-types/grant';
import { GrantsPortfolioFunderCommandService } from '../grantsPortfolioFunderCommandService';
import { GrantsPortfolioFunderQueryService } from '../grantsPortfolioFunderQueryService';
import type { GrantsPortfolioDependencies } from '../grantsPortfolioTypes';

export class GrantsPortfolioFunderService {
  private readonly queryService: GrantsPortfolioFunderQueryService;
  private readonly commandService: GrantsPortfolioFunderCommandService;

  constructor(deps: GrantsPortfolioDependencies) {
    this.queryService = new GrantsPortfolioFunderQueryService(deps);
    this.commandService = new GrantsPortfolioFunderCommandService(deps);
  }

  async listFunders(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantFunder>> {
    return this.queryService.listFunders(organizationId, filters);
  }

  async getFunderById(organizationId: string, id: string): Promise<GrantFunder | null> {
    return this.queryService.getFunderById(organizationId, id);
  }

  async createFunder(
    organizationId: string,
    userId: string,
    data: CreateGrantFunderDTO
  ): Promise<GrantFunder> {
    return this.commandService.createFunder(organizationId, userId, data);
  }

  async updateFunder(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantFunderDTO
  ): Promise<GrantFunder | null> {
    return this.commandService.updateFunder(organizationId, id, userId, data);
  }

  async deleteFunder(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    return this.commandService.deleteFunder(organizationId, id, userId);
  }
}
