import api from '../../../services/api';
import type {
  ReportDefinition,
  ReportEntity,
  ReportField,
  ReportResult,
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

  async exportReport(definition: ReportDefinition, format: 'csv' | 'xlsx'): Promise<BlobPart> {
    const response = await api.post('/v2/reports/export', {
      definition,
      format,
    }, { responseType: 'blob' });
    return response.data;
  }

  async instantiateTemplate(templateId: string): Promise<ReportDefinition> {
    const response = await api.post<ReportDefinition>(`/v2/reports/templates/${templateId}/instantiate`, {});
    return response.data;
  }

  async listTemplates(params?: Record<string, unknown>): Promise<unknown[]> {
    const response = await api.get<unknown[]>('/v2/reports/templates', { params });
    return response.data;
  }
}

export const reportsApiClient = new ReportsApiClient();
