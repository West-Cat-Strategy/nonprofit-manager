import type {
  CreateGrantFunderDTO,
  CreateGrantProgramDTO,
  CreateFundedProgramDTO,
  CreateRecipientOrganizationDTO,
  FundedProgram,
  GrantFunder,
  GrantListFilters,
  GrantProgram,
  PaginatedGrantResult,
  RecipientOrganization,
  UpdateGrantFunderDTO,
  UpdateGrantProgramDTO,
  UpdateFundedProgramDTO,
  UpdateRecipientOrganizationDTO,
} from '@app-types/grant';
import { GrantsPortfolioFundedProgramService } from './internal/grantsPortfolioFundedProgramService';
import { GrantsPortfolioFunderService } from './internal/grantsPortfolioFunderService';
import { GrantsPortfolioProgramService } from './internal/grantsPortfolioProgramService';
import { GrantsPortfolioRecipientService } from './internal/grantsPortfolioRecipientService';
import type { GrantsPortfolioDependencies } from './grantsPortfolioTypes';

export class GrantsPortfolioService {
  private readonly funderService: GrantsPortfolioFunderService;
  private readonly programService: GrantsPortfolioProgramService;
  private readonly recipientService: GrantsPortfolioRecipientService;
  private readonly fundedProgramService: GrantsPortfolioFundedProgramService;

  constructor(deps: GrantsPortfolioDependencies) {
    this.funderService = new GrantsPortfolioFunderService(deps);
    this.programService = new GrantsPortfolioProgramService(deps);
    this.recipientService = new GrantsPortfolioRecipientService(deps);
    this.fundedProgramService = new GrantsPortfolioFundedProgramService(deps);
  }

  async listFunders(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantFunder>> {
    return this.funderService.listFunders(organizationId, filters);
  }

  async getFunderById(organizationId: string, id: string): Promise<GrantFunder | null> {
    return this.funderService.getFunderById(organizationId, id);
  }

  async createFunder(
    organizationId: string,
    userId: string,
    data: CreateGrantFunderDTO
  ): Promise<GrantFunder> {
    return this.funderService.createFunder(organizationId, userId, data);
  }

  async updateFunder(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantFunderDTO
  ): Promise<GrantFunder | null> {
    return this.funderService.updateFunder(organizationId, id, userId, data);
  }

  async deleteFunder(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    return this.funderService.deleteFunder(organizationId, id, userId);
  }

  async listPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantProgram>> {
    return this.programService.listPrograms(organizationId, filters);
  }

  async getProgramById(organizationId: string, id: string): Promise<GrantProgram | null> {
    return this.programService.getProgramById(organizationId, id);
  }

  async createProgram(
    organizationId: string,
    userId: string,
    data: CreateGrantProgramDTO
  ): Promise<GrantProgram> {
    return this.programService.createProgram(organizationId, userId, data);
  }

  async updateProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantProgramDTO
  ): Promise<GrantProgram | null> {
    return this.programService.updateProgram(organizationId, id, userId, data);
  }

  async deleteProgram(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    return this.programService.deleteProgram(organizationId, id, userId);
  }

  async listRecipients(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<RecipientOrganization>> {
    return this.recipientService.listRecipients(organizationId, filters);
  }

  async getRecipientById(
    organizationId: string,
    id: string
  ): Promise<RecipientOrganization | null> {
    return this.recipientService.getRecipientById(organizationId, id);
  }

  async createRecipient(
    organizationId: string,
    userId: string,
    data: CreateRecipientOrganizationDTO
  ): Promise<RecipientOrganization> {
    return this.recipientService.createRecipient(organizationId, userId, data);
  }

  async updateRecipient(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateRecipientOrganizationDTO
  ): Promise<RecipientOrganization | null> {
    return this.recipientService.updateRecipient(organizationId, id, userId, data);
  }

  async deleteRecipient(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.recipientService.deleteRecipient(organizationId, id, userId);
  }

  async listFundedPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<FundedProgram>> {
    return this.fundedProgramService.listFundedPrograms(organizationId, filters);
  }

  async getFundedProgramById(
    organizationId: string,
    id: string
  ): Promise<FundedProgram | null> {
    return this.fundedProgramService.getFundedProgramById(organizationId, id);
  }

  async createFundedProgram(
    organizationId: string,
    userId: string,
    data: CreateFundedProgramDTO
  ): Promise<FundedProgram> {
    return this.fundedProgramService.createFundedProgram(organizationId, userId, data);
  }

  async updateFundedProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateFundedProgramDTO
  ): Promise<FundedProgram | null> {
    return this.fundedProgramService.updateFundedProgram(organizationId, id, userId, data);
  }

  async deleteFundedProgram(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.fundedProgramService.deleteFundedProgram(organizationId, id, userId);
  }
}
