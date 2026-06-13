import api from '../../../services/api';
import type {
  CreateScheduledReportDTO,
  ScheduledReport,
  ScheduledReportRun,
  UpdateScheduledReportDTO,
} from '../types/contracts';

export class ScheduledReportsApiClient {
  async fetchScheduledReports(): Promise<ScheduledReport[]> {
    const response = await api.get<ScheduledReport[]>('/scheduled-reports');
    return response.data;
  }

  async fetchScheduledReportById(scheduledReportId: string): Promise<ScheduledReport> {
    const response = await api.get<ScheduledReport>(`/scheduled-reports/${scheduledReportId}`);
    return response.data;
  }

  async createScheduledReport(payload: CreateScheduledReportDTO): Promise<ScheduledReport> {
    const response = await api.post<ScheduledReport>('/scheduled-reports', payload);
    return response.data;
  }

  async updateScheduledReport(
    scheduledReportId: string,
    data: UpdateScheduledReportDTO
  ): Promise<ScheduledReport> {
    const response = await api.put<ScheduledReport>(`/scheduled-reports/${scheduledReportId}`, data);
    return response.data;
  }

  async toggleScheduledReport(
    scheduledReportId: string,
    payload: { is_active?: boolean }
  ): Promise<ScheduledReport> {
    const response = await api.post<ScheduledReport>(`/scheduled-reports/${scheduledReportId}/toggle`, payload);
    return response.data;
  }

  async runScheduledReportNow(scheduledReportId: string): Promise<ScheduledReportRun> {
    const response = await api.post<ScheduledReportRun>(`/scheduled-reports/${scheduledReportId}/run-now`);
    return response.data;
  }

  async deleteScheduledReport(scheduledReportId: string): Promise<void> {
    await api.delete(`/scheduled-reports/${scheduledReportId}`);
  }

  async fetchScheduledReportRuns(
    scheduledReportId: string,
    limit?: number
  ): Promise<ScheduledReportRun[]> {
    const response = await api.get<ScheduledReportRun[]>(`/scheduled-reports/${scheduledReportId}/runs`, {
      params: limit ? { limit } : undefined,
    });
    return response.data;
  }
}

export const scheduledReportsApiClient = new ScheduledReportsApiClient();
