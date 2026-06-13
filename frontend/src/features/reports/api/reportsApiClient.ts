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
    const response = await api.post<ReportResult>('/reports/generate', definition);
    return response.data;
  }

  async fetchAvailableFields(entity: ReportEntity): Promise<{ entity: ReportEntity; fields: ReportField[] }> {
    const response = await api.get<{ entity: ReportEntity; fields: ReportField[] }>(`/reports/fields/${entity}`);
    return response.data;
  }

  async createExportJob(payload: CreateReportExportJobRequest): Promise<ReportExportJob> {
    const response = await api.post<ReportExportJob>(
      '/reports/exports',
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
    const response = await api.get<ReportExportJob[]>('/reports/exports', {
      params: { limit },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getExportJob(jobId: string): Promise<ReportExportJob> {
    const response = await api.get<ReportExportJob>(`/reports/exports/${jobId}`);
    return response.data;
  }

  async downloadExportJob(jobId: string, fallbackFilename: string): Promise<DownloadedFile> {
    const response = await api.get<Blob>(`/reports/exports/${jobId}/download`, {
      responseType: 'blob',
    });
    return buildDownloadedFile(response, fallbackFilename);
  }

  async instantiateTemplate(templateId: string): Promise<ReportDefinition> {
    const response = await api.post<ReportDefinition>(`/reports/templates/${templateId}/instantiate`, {});
    return response.data;
  }

  async fetchWorkflowCoverageReport(
    filters: WorkflowCoverageFilters = {}
  ): Promise<WorkflowCoverageReportResult> {
    const response = await api.get<WorkflowCoverageReportResult>('/reports/workflow-coverage', {
      params: filters,
    });
    return response.data;
  }

  async listTemplates(params?: Record<string, unknown>): Promise<unknown[]> {
    const response = await api.get<unknown[]>('/reports/templates', { params });
    return response.data;
  }
}

export const reportsApiClient = new ReportsApiClient();
