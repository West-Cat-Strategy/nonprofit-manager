import { Pool } from 'pg';
import pool from '@config/database';
import type {
  CreateGrantApplicationDTO,
  CreateGrantAwardDTO,
  CreateGrantDisbursementDTO,
  CreateGrantDocumentDTO,
  CreateGrantFunderDTO,
  CreateGrantProgramDTO,
  CreateGrantReportDTO,
  CreateFundedProgramDTO,
  FundedProgram,
  GrantActivityLog,
  GrantApplication,
  GrantApplicationStatus,
  GrantAward,
  GrantCalendarItem,
  GrantDisbursement,
  GrantDocument,
  GrantFunder,
  GrantListFilters,
  GrantProgram,
  GrantReport,
  PaginatedGrantResult,
  RecipientOrganization,
  CreateRecipientOrganizationDTO,
  UpdateGrantApplicationDTO,
  UpdateGrantAwardDTO,
  UpdateGrantDisbursementDTO,
  UpdateGrantDocumentDTO,
  UpdateGrantFunderDTO,
  UpdateGrantProgramDTO,
  UpdateGrantReportDTO,
  UpdateFundedProgramDTO,
  UpdateRecipientOrganizationDTO,
} from '@app-types/grant';
import { type GeneratedTabularFile } from '@modules/shared/export/tabularExport';
import { GrantsApplicationsService } from './grantsApplicationsService';
import { GrantsAwardsService } from './grantsAwardsService';
import { GrantsPortfolioService } from './grantsPortfolioService';
import { GrantsReportingService } from './grantsReportingService';
import { GrantsServiceCore } from './grantsServiceCore';
import { GrantsServiceApplicationsFacade } from './internal/grantsServiceApplicationsFacade';
import { GrantsServiceAwardsFacade } from './internal/grantsServiceAwardsFacade';
import { GrantsServiceExportFacade } from './internal/grantsServiceExportFacade';
import { GrantsServicePortfolioFacade } from './internal/grantsServicePortfolioFacade';
import { GrantsServiceReportingFacade } from './internal/grantsServiceReportingFacade';
import { GrantsServiceSummaryFacade } from './internal/grantsServiceSummaryFacade';
import { GrantsSummaryService, type GrantSummaryFilters } from './grantsSummaryService';

export class GrantsService {
  private readonly core: GrantsServiceCore;
  private readonly portfolioService: GrantsPortfolioService;
  private readonly summaryFacade: GrantsServiceSummaryFacade;
  private readonly portfolioFacade: GrantsServicePortfolioFacade;
  private readonly applicationsFacade: GrantsServiceApplicationsFacade;
  private readonly awardsFacade: GrantsServiceAwardsFacade;
  private readonly reportingFacade: GrantsServiceReportingFacade;
  private readonly exportFacade: GrantsServiceExportFacade;

  constructor(db: Pool) {
    this.core = new GrantsServiceCore(db);

    const summaryService = new GrantsSummaryService(this.core);
    const applicationsService = new GrantsApplicationsService(this.core, summaryService);
    const awardsService = new GrantsAwardsService(this.core, summaryService);
    const reportingService = new GrantsReportingService(this.core, summaryService);
    this.portfolioService = new GrantsPortfolioService({
      db,
      paginate: this.core.paginate.bind(this.core),
      fetchById: this.core.fetchById.bind(this.core),
      deleteById: this.core.deleteById.bind(this.core),
      recordActivity: this.core.recordActivity.bind(this.core),
      mapFunder: this.core.mapFunder.bind(this.core),
      mapProgram: this.core.mapProgram.bind(this.core),
      mapRecipient: this.core.mapRecipient.bind(this.core),
      mapFundedProgram: this.core.mapFundedProgram.bind(this.core),
    });

    this.summaryFacade = new GrantsServiceSummaryFacade(summaryService);
    this.portfolioFacade = new GrantsServicePortfolioFacade(
      summaryService,
      this.portfolioService
    );
    this.applicationsFacade = new GrantsServiceApplicationsFacade(applicationsService);
    this.awardsFacade = new GrantsServiceAwardsFacade(awardsService);
    this.reportingFacade = new GrantsServiceReportingFacade(reportingService);
    this.exportFacade = new GrantsServiceExportFacade(awardsService);
  }

  async getSummary(organizationId: string, filters: GrantSummaryFilters = {}) {
    return this.summaryFacade.getSummary(organizationId, filters);
  }

  async listFunders(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantFunder>> {
    return this.portfolioFacade.listFunders(organizationId, filters);
  }

  async getFunderById(organizationId: string, id: string): Promise<GrantFunder | null> {
    return this.portfolioFacade.getFunderById(organizationId, id);
  }

  async createFunder(
    organizationId: string,
    userId: string,
    data: CreateGrantFunderDTO
  ): Promise<GrantFunder> {
    return this.portfolioFacade.createFunder(organizationId, userId, data);
  }

  async updateFunder(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantFunderDTO
  ): Promise<GrantFunder | null> {
    return this.portfolioFacade.updateFunder(organizationId, id, userId, data);
  }

  async deleteFunder(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    return this.portfolioFacade.deleteFunder(organizationId, id, userId);
  }

  async listPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantProgram>> {
    return this.portfolioFacade.listPrograms(organizationId, filters);
  }

  async getProgramById(organizationId: string, id: string): Promise<GrantProgram | null> {
    return this.portfolioFacade.getProgramById(organizationId, id);
  }

  async createProgram(
    organizationId: string,
    userId: string,
    data: CreateGrantProgramDTO
  ): Promise<GrantProgram> {
    return this.portfolioFacade.createProgram(organizationId, userId, data);
  }

  async updateProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantProgramDTO
  ): Promise<GrantProgram | null> {
    return this.portfolioFacade.updateProgram(organizationId, id, userId, data);
  }

  async deleteProgram(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    return this.portfolioFacade.deleteProgram(organizationId, id, userId);
  }

  async listRecipients(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<RecipientOrganization>> {
    return this.portfolioFacade.listRecipients(organizationId, filters);
  }

  async getRecipientById(
    organizationId: string,
    id: string
  ): Promise<RecipientOrganization | null> {
    return this.portfolioFacade.getRecipientById(organizationId, id);
  }

  async createRecipient(
    organizationId: string,
    userId: string,
    data: CreateRecipientOrganizationDTO
  ): Promise<RecipientOrganization> {
    return this.portfolioFacade.createRecipient(organizationId, userId, data);
  }

  async updateRecipient(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateRecipientOrganizationDTO
  ): Promise<RecipientOrganization | null> {
    return this.portfolioFacade.updateRecipient(organizationId, id, userId, data);
  }

  async deleteRecipient(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.portfolioFacade.deleteRecipient(organizationId, id, userId);
  }

  async listFundedPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<FundedProgram>> {
    return this.portfolioFacade.listFundedPrograms(organizationId, filters);
  }

  async getFundedProgramById(
    organizationId: string,
    id: string
  ): Promise<FundedProgram | null> {
    return this.portfolioFacade.getFundedProgramById(organizationId, id);
  }

  async createFundedProgram(
    organizationId: string,
    userId: string,
    data: CreateFundedProgramDTO
  ): Promise<FundedProgram> {
    return this.portfolioFacade.createFundedProgram(organizationId, userId, data);
  }

  async updateFundedProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateFundedProgramDTO
  ): Promise<FundedProgram | null> {
    return this.portfolioFacade.updateFundedProgram(organizationId, id, userId, data);
  }

  async deleteFundedProgram(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.portfolioFacade.deleteFundedProgram(organizationId, id, userId);
  }

  async listApplications(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantApplication>> {
    return this.applicationsFacade.listApplications(organizationId, filters);
  }

  async getApplicationById(
    organizationId: string,
    id: string
  ): Promise<GrantApplication | null> {
    return this.applicationsFacade.getApplicationById(organizationId, id);
  }

  async createApplication(
    organizationId: string,
    userId: string,
    data: CreateGrantApplicationDTO
  ): Promise<GrantApplication> {
    return this.applicationsFacade.createApplication(organizationId, userId, data);
  }

  async updateApplication(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantApplicationDTO
  ): Promise<GrantApplication | null> {
    return this.applicationsFacade.updateApplication(organizationId, id, userId, data);
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
    return this.applicationsFacade.updateApplicationStatus(
      organizationId,
      id,
      userId,
      status,
      data
    );
  }

  async deleteApplication(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.applicationsFacade.deleteApplication(organizationId, id, userId);
  }

  async awardApplication(
    organizationId: string,
    applicationId: string,
    userId: string,
    data: CreateGrantAwardDTO
  ): Promise<{ application: GrantApplication; grant: GrantAward } | null> {
    return this.applicationsFacade.awardApplication(organizationId, applicationId, userId, data);
  }

  async listGrants(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantAward>> {
    return this.awardsFacade.listGrants(organizationId, filters);
  }

  async getGrantById(organizationId: string, id: string): Promise<GrantAward | null> {
    return this.awardsFacade.getGrantById(organizationId, id);
  }

  async createGrant(
    organizationId: string,
    userId: string,
    data: CreateGrantAwardDTO
  ): Promise<GrantAward> {
    return this.awardsFacade.createGrant(organizationId, userId, data);
  }

  async updateGrant(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantAwardDTO
  ): Promise<GrantAward | null> {
    return this.awardsFacade.updateGrant(organizationId, id, userId, data);
  }

  async deleteGrant(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.awardsFacade.deleteGrant(organizationId, id, userId);
  }

  async listDisbursements(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantDisbursement>> {
    return this.awardsFacade.listDisbursements(organizationId, filters);
  }

  async getDisbursementById(
    organizationId: string,
    id: string
  ): Promise<GrantDisbursement | null> {
    return this.awardsFacade.getDisbursementById(organizationId, id);
  }

  async createDisbursement(
    organizationId: string,
    userId: string,
    data: CreateGrantDisbursementDTO
  ): Promise<GrantDisbursement> {
    return this.awardsFacade.createDisbursement(organizationId, userId, data);
  }

  async updateDisbursement(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantDisbursementDTO
  ): Promise<GrantDisbursement | null> {
    return this.awardsFacade.updateDisbursement(organizationId, id, userId, data);
  }

  async deleteDisbursement(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.awardsFacade.deleteDisbursement(organizationId, id, userId);
  }

  async listReports(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantReport>> {
    return this.reportingFacade.listReports(organizationId, filters);
  }

  async getReportById(organizationId: string, id: string): Promise<GrantReport | null> {
    return this.reportingFacade.getReportById(organizationId, id);
  }

  async createReport(
    organizationId: string,
    userId: string,
    data: CreateGrantReportDTO
  ): Promise<GrantReport> {
    return this.reportingFacade.createReport(organizationId, userId, data);
  }

  async updateReport(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantReportDTO
  ): Promise<GrantReport | null> {
    return this.reportingFacade.updateReport(organizationId, id, userId, data);
  }

  async deleteReport(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.reportingFacade.deleteReport(organizationId, id, userId);
  }

  async listDocuments(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantDocument>> {
    return this.reportingFacade.listDocuments(organizationId, filters);
  }

  async getDocumentById(organizationId: string, id: string): Promise<GrantDocument | null> {
    return this.reportingFacade.getDocumentById(organizationId, id);
  }

  async createDocument(
    organizationId: string,
    userId: string,
    data: CreateGrantDocumentDTO
  ): Promise<GrantDocument> {
    return this.reportingFacade.createDocument(organizationId, userId, data);
  }

  async updateDocument(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantDocumentDTO
  ): Promise<GrantDocument | null> {
    return this.reportingFacade.updateDocument(organizationId, id, userId, data);
  }

  async deleteDocument(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.reportingFacade.deleteDocument(organizationId, id, userId);
  }

  async listActivities(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantActivityLog>> {
    return this.reportingFacade.listActivities(organizationId, filters);
  }

  async getCalendar(
    organizationId: string,
    options: { start_date?: string; end_date?: string; limit?: number } = {}
  ): Promise<GrantCalendarItem[]> {
    return this.reportingFacade.getCalendar(organizationId, options);
  }

  async exportGrants(
    organizationId: string,
    filters: GrantListFilters = {},
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<GeneratedTabularFile> {
    return this.exportFacade.exportGrants(organizationId, filters, format);
  }
}

export const grantService = new GrantsService(pool);
