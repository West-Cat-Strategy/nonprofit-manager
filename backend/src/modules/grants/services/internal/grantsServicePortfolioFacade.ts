import {
  type CreateGrantFunderDTO,
  type CreateGrantProgramDTO,
  type CreateFundedProgramDTO,
  type CreateRecipientOrganizationDTO,
  type FundedProgram,
  type GrantFunder,
  type GrantListFilters,
  type GrantProgram,
  type PaginatedGrantResult,
  type RecipientOrganization,
  type UpdateGrantFunderDTO,
  type UpdateGrantProgramDTO,
  type UpdateFundedProgramDTO,
  type UpdateRecipientOrganizationDTO,
} from '@app-types/grant';
import { GrantsPortfolioService } from '../grantsPortfolioService';

type SummaryInvalidationPort = {
  invalidateSummaryCache(organizationId: string): Promise<void>;
};

export class GrantsServicePortfolioFacade {
  constructor(
    private readonly summaryService: SummaryInvalidationPort,
    private readonly portfolioService: GrantsPortfolioService
  ) {}

  async listFunders(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantFunder>> {
    return this.portfolioService.listFunders(organizationId, filters);
  }

  async getFunderById(organizationId: string, id: string): Promise<GrantFunder | null> {
    return this.portfolioService.getFunderById(organizationId, id);
  }

  async createFunder(
    organizationId: string,
    userId: string,
    data: CreateGrantFunderDTO
  ): Promise<GrantFunder> {
    const funder = await this.portfolioService.createFunder(organizationId, userId, data);
    await this.summaryService.invalidateSummaryCache(organizationId);
    return funder;
  }

  async updateFunder(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantFunderDTO
  ): Promise<GrantFunder | null> {
    const funder = await this.portfolioService.updateFunder(organizationId, id, userId, data);
    if (funder) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return funder;
  }

  async deleteFunder(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    const deleted = await this.portfolioService.deleteFunder(organizationId, id, userId);
    if (deleted) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return deleted;
  }

  async listPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantProgram>> {
    return this.portfolioService.listPrograms(organizationId, filters);
  }

  async getProgramById(organizationId: string, id: string): Promise<GrantProgram | null> {
    return this.portfolioService.getProgramById(organizationId, id);
  }

  async createProgram(
    organizationId: string,
    userId: string,
    data: CreateGrantProgramDTO
  ): Promise<GrantProgram> {
    const program = await this.portfolioService.createProgram(organizationId, userId, data);
    await this.summaryService.invalidateSummaryCache(organizationId);
    return program;
  }

  async updateProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantProgramDTO
  ): Promise<GrantProgram | null> {
    const program = await this.portfolioService.updateProgram(organizationId, id, userId, data);
    if (program) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return program;
  }

  async deleteProgram(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    const deleted = await this.portfolioService.deleteProgram(organizationId, id, userId);
    if (deleted) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return deleted;
  }

  async listRecipients(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<RecipientOrganization>> {
    return this.portfolioService.listRecipients(organizationId, filters);
  }

  async getRecipientById(
    organizationId: string,
    id: string
  ): Promise<RecipientOrganization | null> {
    return this.portfolioService.getRecipientById(organizationId, id);
  }

  async createRecipient(
    organizationId: string,
    userId: string,
    data: CreateRecipientOrganizationDTO
  ): Promise<RecipientOrganization> {
    const recipient = await this.portfolioService.createRecipient(organizationId, userId, data);
    await this.summaryService.invalidateSummaryCache(organizationId);
    return recipient;
  }

  async updateRecipient(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateRecipientOrganizationDTO
  ): Promise<RecipientOrganization | null> {
    const recipient = await this.portfolioService.updateRecipient(organizationId, id, userId, data);
    if (recipient) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return recipient;
  }

  async deleteRecipient(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const deleted = await this.portfolioService.deleteRecipient(organizationId, id, userId);
    if (deleted) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return deleted;
  }

  async listFundedPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<FundedProgram>> {
    return this.portfolioService.listFundedPrograms(organizationId, filters);
  }

  async getFundedProgramById(
    organizationId: string,
    id: string
  ): Promise<FundedProgram | null> {
    return this.portfolioService.getFundedProgramById(organizationId, id);
  }

  async createFundedProgram(
    organizationId: string,
    userId: string,
    data: CreateFundedProgramDTO
  ): Promise<FundedProgram> {
    const fundedProgram = await this.portfolioService.createFundedProgram(
      organizationId,
      userId,
      data
    );
    await this.summaryService.invalidateSummaryCache(organizationId);
    return fundedProgram;
  }

  async updateFundedProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateFundedProgramDTO
  ): Promise<FundedProgram | null> {
    const fundedProgram = await this.portfolioService.updateFundedProgram(
      organizationId,
      id,
      userId,
      data
    );
    if (fundedProgram) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return fundedProgram;
  }

  async deleteFundedProgram(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const deleted = await this.portfolioService.deleteFundedProgram(organizationId, id, userId);
    if (deleted) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return deleted;
  }
}
