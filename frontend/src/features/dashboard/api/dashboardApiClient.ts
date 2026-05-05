import api from '../../../services/api';
import { unwrapApiData, type ApiEnvelope } from '../../../services/apiEnvelope';
import type { DashboardConfig } from '../types/contracts';

export type DashboardWorkqueueSummaryId = 'intake_resolution' | 'portal_escalations';

export interface DashboardWorkqueueAction {
  label: string;
  href: string;
}

export interface DashboardWorkqueueRow {
  id: string;
  label: string;
  detail: string;
  href: string;
}

export interface DashboardWorkqueueSummaryCard {
  id: DashboardWorkqueueSummaryId;
  label: string;
  count: number;
  detail: string;
  permissionScope: string[];
  primaryAction: DashboardWorkqueueAction;
  rows?: DashboardWorkqueueRow[];
}

export class DashboardApiClient {
  async fetchDashboards(): Promise<DashboardConfig[]> {
    const response = await api.get<DashboardConfig[]>('/v2/dashboard/configs');
    return response.data;
  }

  async fetchDashboard(dashboardId: string): Promise<DashboardConfig> {
    const response = await api.get<DashboardConfig>(`/v2/dashboard/configs/${dashboardId}`);
    return response.data;
  }

  async fetchDefaultDashboard(): Promise<DashboardConfig> {
    const response = await api.get<DashboardConfig>('/v2/dashboard/configs/default');
    return response.data;
  }

  async createDashboard(config: Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'>): Promise<DashboardConfig> {
    const response = await api.post<DashboardConfig>('/v2/dashboard/configs', config);
    return response.data;
  }

  async updateDashboard(id: string, config: Partial<DashboardConfig>): Promise<DashboardConfig> {
    const response = await api.put<DashboardConfig>(`/v2/dashboard/configs/${id}`, config);
    return response.data;
  }

  async deleteDashboard(dashboardId: string): Promise<void> {
    await api.delete(`/v2/dashboard/configs/${dashboardId}`);
  }

  async saveDashboardLayout(id: string, layout: unknown[]): Promise<DashboardConfig> {
    const response = await api.put<DashboardConfig>(`/v2/dashboard/configs/${id}/layout`, { layout });
    return response.data;
  }

  async fetchWorkqueueSummary(): Promise<DashboardWorkqueueSummaryCard[]> {
    const response = await api.get<ApiEnvelope<DashboardWorkqueueSummaryCard[]>>(
      '/v2/dashboard/workqueue-summary'
    );
    return unwrapApiData(response.data);
  }
}

export const dashboardApiClient = new DashboardApiClient();
