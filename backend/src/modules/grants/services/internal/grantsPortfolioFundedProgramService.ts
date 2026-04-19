import {
  type CreateFundedProgramDTO,
  type FundedProgram,
  type GrantListFilters,
  type PaginatedGrantResult,
  type UpdateFundedProgramDTO,
} from '@app-types/grant';
import { GrantsPortfolioFundedProgramCommandService } from '../grantsPortfolioFundedProgramCommandService';
import { GrantsPortfolioFundedProgramQueryService } from '../grantsPortfolioFundedProgramQueryService';
import type { GrantsPortfolioDependencies } from '../grantsPortfolioTypes';

export class GrantsPortfolioFundedProgramService {
  private readonly queryService: GrantsPortfolioFundedProgramQueryService;
  private readonly commandService: GrantsPortfolioFundedProgramCommandService;

  constructor(deps: GrantsPortfolioDependencies) {
    this.queryService = new GrantsPortfolioFundedProgramQueryService(deps);
    this.commandService = new GrantsPortfolioFundedProgramCommandService(deps);
  }

  async listFundedPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<FundedProgram>> {
    return this.queryService.listFundedPrograms(organizationId, filters);
  }

  async getFundedProgramById(
    organizationId: string,
    id: string
  ): Promise<FundedProgram | null> {
    return this.queryService.getFundedProgramById(organizationId, id);
  }

  async createFundedProgram(
    organizationId: string,
    userId: string,
    data: CreateFundedProgramDTO
  ): Promise<FundedProgram> {
    return this.commandService.createFundedProgram(organizationId, userId, data);
  }

  async updateFundedProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateFundedProgramDTO
  ): Promise<FundedProgram | null> {
    return this.commandService.updateFundedProgram(organizationId, id, userId, data);
  }

  async deleteFundedProgram(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.commandService.deleteFundedProgram(organizationId, id, userId);
  }
}
