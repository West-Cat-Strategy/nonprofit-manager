import {
  type CreateGrantProgramDTO,
  type GrantListFilters,
  type GrantProgram,
  type PaginatedGrantResult,
  type UpdateGrantProgramDTO,
} from '@app-types/grant';
import { GrantsPortfolioProgramCommandService } from '../grantsPortfolioProgramCommandService';
import { GrantsPortfolioProgramQueryService } from '../grantsPortfolioProgramQueryService';
import type { GrantsPortfolioDependencies } from '../grantsPortfolioTypes';

export class GrantsPortfolioProgramService {
  private readonly queryService: GrantsPortfolioProgramQueryService;
  private readonly commandService: GrantsPortfolioProgramCommandService;

  constructor(deps: GrantsPortfolioDependencies) {
    this.queryService = new GrantsPortfolioProgramQueryService(deps);
    this.commandService = new GrantsPortfolioProgramCommandService(deps);
  }

  async listPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantProgram>> {
    return this.queryService.listPrograms(organizationId, filters);
  }

  async getProgramById(organizationId: string, id: string): Promise<GrantProgram | null> {
    return this.queryService.getProgramById(organizationId, id);
  }

  async createProgram(
    organizationId: string,
    userId: string,
    data: CreateGrantProgramDTO
  ): Promise<GrantProgram> {
    return this.commandService.createProgram(organizationId, userId, data);
  }

  async updateProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantProgramDTO
  ): Promise<GrantProgram | null> {
    return this.commandService.updateProgram(organizationId, id, userId, data);
  }

  async deleteProgram(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    return this.commandService.deleteProgram(organizationId, id, userId);
  }
}
