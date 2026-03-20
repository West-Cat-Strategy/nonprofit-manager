import api from '../../../services/api';
import { buildDownloadedFile, type DownloadedFile } from '../../../services/fileDownload';
import { unwrapApiData, type ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  CreateFundedProgramDTO,
  CreateGrantApplicationDTO,
  CreateGrantAwardDTO,
  CreateGrantDisbursementDTO,
  CreateGrantDocumentDTO,
  CreateGrantFunderDTO,
  CreateGrantProgramDTO,
  CreateGrantReportDTO,
  CreateRecipientOrganizationDTO,
  GrantActivityLog,
  GrantApplication,
  GrantApplicationAwardResult,
  GrantApplicationStatusUpdateDTO,
  GrantAward,
  GrantCalendarItem,
  GrantDisbursement,
  GrantDocument,
  GrantFunder,
  GrantListFilters,
  GrantJurisdiction,
  GrantProgram,
  FundedProgram,
  RecipientOrganization,
  GrantReport,
  GrantSummary,
  PaginatedGrantResult,
  UpdateFundedProgramDTO,
  UpdateGrantApplicationDTO,
  UpdateGrantAwardDTO,
  UpdateGrantDisbursementDTO,
  UpdateGrantDocumentDTO,
  UpdateGrantFunderDTO,
  UpdateGrantProgramDTO,
  UpdateGrantReportDTO,
  UpdateRecipientOrganizationDTO,
} from '../types/contracts';

type CalendarQuery = {
  start_date?: string;
  end_date?: string;
  limit?: number;
};

type ExportFormat = 'csv' | 'xlsx';

const toQueryParams = (
  query: GrantListFilters | CalendarQuery | Record<string, string | number | undefined>
): Record<string, string | number | undefined> => {
  const params: Record<string, string | number | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value;
    }
  }
  return params;
};

export class GrantsApiClient {
  private async getPaginated<T>(
    path: string,
    query: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<T>> {
    const response = await api.get<ApiEnvelope<PaginatedGrantResult<T>>>(path, {
      params: toQueryParams(query),
    });
    return unwrapApiData(response.data);
  }

  private async getSingle<T>(path: string): Promise<T> {
    const response = await api.get<ApiEnvelope<T>>(path);
    return unwrapApiData(response.data);
  }

  async getSummary(
    query: { jurisdiction?: GrantJurisdiction; fiscal_year?: string } = {}
  ): Promise<GrantSummary> {
    const response = await api.get<ApiEnvelope<GrantSummary>>('/v2/grants/summary', {
      params: toQueryParams(query),
    });
    return unwrapApiData(response.data);
  }

  async listFunders(query: GrantListFilters = {}): Promise<PaginatedGrantResult<GrantFunder>> {
    return this.getPaginated<GrantFunder>('/v2/grants/funders', query);
  }

  async getFunderById(id: string): Promise<GrantFunder> {
    return this.getSingle<GrantFunder>(`/v2/grants/funders/${id}`);
  }

  async createFunder(payload: CreateGrantFunderDTO): Promise<GrantFunder> {
    const response = await api.post<ApiEnvelope<GrantFunder>>('/v2/grants/funders', payload);
    return unwrapApiData(response.data);
  }

  async updateFunder(id: string, payload: UpdateGrantFunderDTO): Promise<GrantFunder> {
    const response = await api.put<ApiEnvelope<GrantFunder>>(`/v2/grants/funders/${id}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteFunder(id: string): Promise<void> {
    await api.delete(`/v2/grants/funders/${id}`);
  }

  async listPrograms(query: GrantListFilters = {}): Promise<PaginatedGrantResult<GrantProgram>> {
    return this.getPaginated<GrantProgram>('/v2/grants/programs', query);
  }

  async getProgramById(id: string): Promise<GrantProgram> {
    return this.getSingle<GrantProgram>(`/v2/grants/programs/${id}`);
  }

  async createProgram(payload: CreateGrantProgramDTO): Promise<GrantProgram> {
    const response = await api.post<ApiEnvelope<GrantProgram>>('/v2/grants/programs', payload);
    return unwrapApiData(response.data);
  }

  async updateProgram(id: string, payload: UpdateGrantProgramDTO): Promise<GrantProgram> {
    const response = await api.put<ApiEnvelope<GrantProgram>>(`/v2/grants/programs/${id}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteProgram(id: string): Promise<void> {
    await api.delete(`/v2/grants/programs/${id}`);
  }

  async listRecipients(
    query: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<RecipientOrganization>> {
    const response = await api.get<ApiEnvelope<PaginatedGrantResult<RecipientOrganization>>>(
      '/v2/grants/recipients',
      {
        params: toQueryParams(query),
      }
    );
    return unwrapApiData(response.data);
  }

  async getRecipientById(id: string): Promise<RecipientOrganization> {
    return this.getSingle<RecipientOrganization>(`/v2/grants/recipients/${id}`);
  }

  async createRecipient(payload: CreateRecipientOrganizationDTO): Promise<RecipientOrganization> {
    const response = await api.post<ApiEnvelope<RecipientOrganization>>('/v2/grants/recipients', payload);
    return unwrapApiData(response.data);
  }

  async updateRecipient(
    id: string,
    payload: UpdateRecipientOrganizationDTO
  ): Promise<RecipientOrganization> {
    const response = await api.put<ApiEnvelope<RecipientOrganization>>(
      `/v2/grants/recipients/${id}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async deleteRecipient(id: string): Promise<void> {
    await api.delete(`/v2/grants/recipients/${id}`);
  }

  async listFundedPrograms(query: GrantListFilters = {}): Promise<PaginatedGrantResult<FundedProgram>> {
    return this.getPaginated<FundedProgram>('/v2/grants/funded-programs', query);
  }

  async getFundedProgramById(id: string): Promise<FundedProgram> {
    return this.getSingle<FundedProgram>(`/v2/grants/funded-programs/${id}`);
  }

  async createFundedProgram(payload: CreateFundedProgramDTO): Promise<FundedProgram> {
    const response = await api.post<ApiEnvelope<FundedProgram>>('/v2/grants/funded-programs', payload);
    return unwrapApiData(response.data);
  }

  async updateFundedProgram(id: string, payload: UpdateFundedProgramDTO): Promise<FundedProgram> {
    const response = await api.put<ApiEnvelope<FundedProgram>>(`/v2/grants/funded-programs/${id}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteFundedProgram(id: string): Promise<void> {
    await api.delete(`/v2/grants/funded-programs/${id}`);
  }

  async listApplications(query: GrantListFilters = {}): Promise<PaginatedGrantResult<GrantApplication>> {
    return this.getPaginated<GrantApplication>('/v2/grants/applications', query);
  }

  async getApplicationById(id: string): Promise<GrantApplication> {
    return this.getSingle<GrantApplication>(`/v2/grants/applications/${id}`);
  }

  async createApplication(payload: CreateGrantApplicationDTO): Promise<GrantApplication> {
    const response = await api.post<ApiEnvelope<GrantApplication>>('/v2/grants/applications', payload);
    return unwrapApiData(response.data);
  }

  async updateApplication(id: string, payload: UpdateGrantApplicationDTO): Promise<GrantApplication> {
    const response = await api.put<ApiEnvelope<GrantApplication>>(
      `/v2/grants/applications/${id}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async updateApplicationStatus(
    id: string,
    payload: GrantApplicationStatusUpdateDTO
  ): Promise<GrantApplication> {
    const response = await api.patch<ApiEnvelope<GrantApplication>>(
      `/v2/grants/applications/${id}/status`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async awardApplication(
    id: string,
    payload: CreateGrantAwardDTO
  ): Promise<GrantApplicationAwardResult> {
    const response = await api.post<ApiEnvelope<GrantApplicationAwardResult>>(
      `/v2/grants/applications/${id}/award`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async deleteApplication(id: string): Promise<void> {
    await api.delete(`/v2/grants/applications/${id}`);
  }

  async listAwards(query: GrantListFilters = {}): Promise<PaginatedGrantResult<GrantAward>> {
    return this.getPaginated<GrantAward>('/v2/grants/awards', query);
  }

  async getAwardById(id: string): Promise<GrantAward> {
    return this.getSingle<GrantAward>(`/v2/grants/awards/${id}`);
  }

  async createAward(payload: CreateGrantAwardDTO): Promise<GrantAward> {
    const response = await api.post<ApiEnvelope<GrantAward>>('/v2/grants/awards', payload);
    return unwrapApiData(response.data);
  }

  async updateAward(id: string, payload: UpdateGrantAwardDTO): Promise<GrantAward> {
    const response = await api.put<ApiEnvelope<GrantAward>>(`/v2/grants/awards/${id}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteAward(id: string): Promise<void> {
    await api.delete(`/v2/grants/awards/${id}`);
  }

  async listDisbursements(query: GrantListFilters = {}): Promise<PaginatedGrantResult<GrantDisbursement>> {
    return this.getPaginated<GrantDisbursement>('/v2/grants/disbursements', query);
  }

  async getDisbursementById(id: string): Promise<GrantDisbursement> {
    return this.getSingle<GrantDisbursement>(`/v2/grants/disbursements/${id}`);
  }

  async createDisbursement(payload: CreateGrantDisbursementDTO): Promise<GrantDisbursement> {
    const response = await api.post<ApiEnvelope<GrantDisbursement>>('/v2/grants/disbursements', payload);
    return unwrapApiData(response.data);
  }

  async updateDisbursement(id: string, payload: UpdateGrantDisbursementDTO): Promise<GrantDisbursement> {
    const response = await api.put<ApiEnvelope<GrantDisbursement>>(
      `/v2/grants/disbursements/${id}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async deleteDisbursement(id: string): Promise<void> {
    await api.delete(`/v2/grants/disbursements/${id}`);
  }

  async listReports(query: GrantListFilters = {}): Promise<PaginatedGrantResult<GrantReport>> {
    return this.getPaginated<GrantReport>('/v2/grants/reports', query);
  }

  async getReportById(id: string): Promise<GrantReport> {
    return this.getSingle<GrantReport>(`/v2/grants/reports/${id}`);
  }

  async createReport(payload: CreateGrantReportDTO): Promise<GrantReport> {
    const response = await api.post<ApiEnvelope<GrantReport>>('/v2/grants/reports', payload);
    return unwrapApiData(response.data);
  }

  async updateReport(id: string, payload: UpdateGrantReportDTO): Promise<GrantReport> {
    const response = await api.put<ApiEnvelope<GrantReport>>(`/v2/grants/reports/${id}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteReport(id: string): Promise<void> {
    await api.delete(`/v2/grants/reports/${id}`);
  }

  async listDocuments(query: GrantListFilters = {}): Promise<PaginatedGrantResult<GrantDocument>> {
    return this.getPaginated<GrantDocument>('/v2/grants/documents', query);
  }

  async getDocumentById(id: string): Promise<GrantDocument> {
    return this.getSingle<GrantDocument>(`/v2/grants/documents/${id}`);
  }

  async createDocument(payload: CreateGrantDocumentDTO): Promise<GrantDocument> {
    const response = await api.post<ApiEnvelope<GrantDocument>>('/v2/grants/documents', payload);
    return unwrapApiData(response.data);
  }

  async updateDocument(id: string, payload: UpdateGrantDocumentDTO): Promise<GrantDocument> {
    const response = await api.put<ApiEnvelope<GrantDocument>>(`/v2/grants/documents/${id}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/v2/grants/documents/${id}`);
  }

  async listActivities(query: GrantListFilters = {}): Promise<PaginatedGrantResult<GrantActivityLog>> {
    return this.getPaginated<GrantActivityLog>('/v2/grants/activities', query);
  }

  async getCalendar(query: CalendarQuery = {}): Promise<GrantCalendarItem[]> {
    const response = await api.get<ApiEnvelope<GrantCalendarItem[]>>('/v2/grants/calendar', {
      params: toQueryParams(query),
    });
    return unwrapApiData(response.data);
  }

  async exportGrants(
    query: GrantListFilters = {},
    format: ExportFormat = 'csv'
  ): Promise<DownloadedFile> {
    const { page: _page, limit: _limit, ...exportFilters } = query;
    const response = await api.get<Blob>('/v2/grants/export', {
      params: toQueryParams({ ...exportFilters, format }),
      responseType: 'blob',
    });

    return buildDownloadedFile(
      response,
      `grants_export_${new Date().toISOString().slice(0, 10)}.${format}`
    );
  }
}

export const grantsApiClient = new GrantsApiClient();
