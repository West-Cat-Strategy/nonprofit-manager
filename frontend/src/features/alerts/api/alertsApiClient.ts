import api from '../../../services/api';
import type {
  AlertConfig,
  AlertInstance,
  AlertInstanceFilters,
  AlertStats,
  AlertTestResult,
  CreateAlertDTO,
  UpdateAlertDTO,
} from '../types';

const buildQueryString = (filters?: AlertInstanceFilters): string => {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.append('status', filters.status);
  }

  if (filters?.severity) {
    params.append('severity', filters.severity);
  }

  if (filters?.limit) {
    params.append('limit', String(filters.limit));
  }

  const query = params.toString();
  return query.length > 0 ? `?${query}` : '';
};

export class AlertsApiClient {
  fetchAlertConfigs(): Promise<AlertConfig[]> {
    return api.get<AlertConfig[]>('/alerts/configs').then((response) => response.data);
  }

  fetchAlertConfig(id: string): Promise<AlertConfig> {
    return api.get<AlertConfig>(`/alerts/configs/${id}`).then((response) => response.data);
  }

  createAlertConfig(config: CreateAlertDTO): Promise<AlertConfig> {
    return api.post<AlertConfig>('/alerts/configs', config).then((response) => response.data);
  }

  updateAlertConfig(id: string, config: UpdateAlertDTO): Promise<AlertConfig> {
    return api.put<AlertConfig>(`/alerts/configs/${id}`, config).then((response) => response.data);
  }

  async deleteAlertConfig(id: string): Promise<void> {
    await api.delete(`/alerts/configs/${id}`);
  }

  toggleAlertConfig(id: string): Promise<AlertConfig> {
    return api.patch<AlertConfig>(`/alerts/configs/${id}/toggle`).then((response) => response.data);
  }

  testAlertConfig(config: CreateAlertDTO): Promise<AlertTestResult> {
    return api.post<AlertTestResult>('/alerts/test', config).then((response) => response.data);
  }

  fetchAlertInstances(filters?: AlertInstanceFilters): Promise<AlertInstance[]> {
    const query = buildQueryString(filters);
    return api.get<AlertInstance[]>(`/alerts/instances${query}`).then((response) => response.data);
  }

  acknowledgeAlert(id: string): Promise<AlertInstance> {
    return api.patch<AlertInstance>(`/alerts/instances/${id}/acknowledge`).then((response) => response.data);
  }

  resolveAlert(id: string): Promise<AlertInstance> {
    return api.patch<AlertInstance>(`/alerts/instances/${id}/resolve`).then((response) => response.data);
  }

  fetchAlertStats(): Promise<AlertStats> {
    return api.get<AlertStats>('/alerts/stats').then((response) => response.data);
  }
}

export const alertsApiClient = new AlertsApiClient();
