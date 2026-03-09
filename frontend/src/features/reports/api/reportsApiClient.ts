import api from '../../../services/api';
import { buildDownloadedFile, type DownloadedFile } from '../../../services/fileDownload';
import type {
  CreateReportExportJobRequest,
  ReportDefinition,
  ReportEntity,
  ReportExportJob,
  ReportField,
  ReportResult,
  WorkflowCoverageFilters,
  WorkflowCoverageReportResult,
} from '../types/contracts';

export class ReportsApiClient {
  async generateReport(definition: ReportDefinition): Promise<ReportResult> {
    const response = await api.post<ReportResult>('/v2/reports/generate', definition);
    return response.data;
  }

  async fetchAvailableFields(entity: ReportEntity): Promise<{ entity: ReportEntity; fields: ReportField[] }> {
    const response = await api.get<{ entity: ReportEntity; fields: ReportField[] }>(`/v2/reports/fields/${entity}`);
    return response.data;
  }

  async exportReport(definition: ReportDefinition, format: 'csv' | 'xlsx'): Promise<DownloadedFile> {
    const response = await api.post<Blob>('/v2/reports/export', {
      definition,
      format,
    }, { responseType: 'blob' });

    return buildDownloadedFile(
      response,
      `${definition.entity}_report_${new Date().toISOString().split('T')[0]}.${format}`
    );
  }

  async createExportJob(payload: CreateReportExportJobRequest): Promise<ReportExportJob> {
    const response = await api.post<ReportExportJob>(
      '/v2/reports/exports',
      payload,
      payload.idempotencyKey
        ? {
            headers: {
              'Idempotency-Key': payload.idempotencyKey,
            },
          }
        : undefined
    );
    return response.data;
  }

  async listExportJobs(limit: number = 10): Promise<ReportExportJob[]> {
    const response = await api.get<ReportExportJob[]>('/v2/reports/exports', {
      params: { limit },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getExportJob(jobId: string): Promise<ReportExportJob> {
    const response = await api.get<ReportExportJob>(`/v2/reports/exports/${jobId}`);
    return response.data;
  }

  async downloadExportJob(jobId: string, fallbackFilename: string): Promise<DownloadedFile> {
    const response = await api.get<Blob>(`/v2/reports/exports/${jobId}/download`, {
      responseType: 'blob',
    });
    return buildDownloadedFile(response, fallbackFilename);
  }

  async instantiateTemplate(templateId: string): Promise<ReportDefinition> {
    const response = await api.post<ReportDefinition>(`/v2/reports/templates/${templateId}/instantiate`, {});
    return response.data;
  }

  async fetchWorkflowCoverageReport(
    filters: WorkflowCoverageFilters = {}
  ): Promise<WorkflowCoverageReportResult> {
    const response = await api.get<WorkflowCoverageReportResult>('/v2/reports/workflow-coverage', {
      params: filters,
    });
    return response.data;
  }

  async listTemplates(params?: Record<string, unknown>): Promise<unknown[]> {
    const response = await api.get<unknown[]>('/v2/reports/templates', { params });
    return response.data;
  }
}

export const reportsApiClient = new ReportsApiClient();
