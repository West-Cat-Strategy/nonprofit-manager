import type {
  AlertCondition,
  AlertConfigFields,
  AlertCreateConfigRequest,
  AlertMetricType,
  AlertSeverity,
  AlertStatsContract,
  AlertStatus,
  AlertTestResultContract,
  AlertUpdateConfigRequest,
} from '@nonprofit-manager/contracts/alerts';

export type {
  AlertChannel,
  AlertCondition,
  AlertFrequency,
  AlertMetricType,
  AlertSeverity,
  AlertStatus,
} from '@nonprofit-manager/contracts/alerts';

export interface AlertConfig extends Omit<AlertConfigFields, 'filters'> {
  id: string;
  user_id: string;
  organization_id: string;
  filters?: Record<string, unknown>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  last_triggered?: Date | null;
}

export interface AlertInstance {
  id: string;
  alert_config_id: string;
  alert_name: string;
  metric_type: AlertMetricType;
  condition: AlertCondition;
  severity: AlertSeverity;
  status: AlertStatus;
  triggered_at: Date;
  resolved_at?: Date | null;
  current_value: number;
  threshold_value?: number | null;
  message: string;
  details?: Record<string, unknown>;
  acknowledged_by?: string | null;
  acknowledged_at?: Date | null;
}

export interface CreateAlertDTO extends Omit<AlertCreateConfigRequest, 'filters'> {
  user_id: string;
  organization_id: string;
  filters?: Record<string, unknown>;
}

export interface UpdateAlertDTO extends Omit<AlertUpdateConfigRequest, 'filters'> {
  filters?: Record<string, unknown>;
}

export type AlertTestResult = AlertTestResultContract;

export type AlertStats = AlertStatsContract;

export interface AlertInstanceFilters {
  userId: string;
  organizationId: string;
  status?: string;
  severity?: string;
  limit?: number;
}

export interface AlertInstanceFiltersInput {
  status?: string;
  severity?: string;
  limit?: number | string;
}

export interface AlertStatsSnapshot {
  total: string;
  active: string;
  triggered_today: string;
  triggered_week: string;
  triggered_month: string;
  severity_rows: Array<{ severity: AlertSeverity; count: string }>;
  metric_rows: Array<{ metric_type: AlertMetricType; count: string }>;
}

export interface AlertsRepositoryPort {
  getUserAlerts(userId: string, organizationId: string): Promise<AlertConfig[]>;
  getAlert(id: string, userId: string, organizationId: string): Promise<AlertConfig | null>;
  createAlert(data: CreateAlertDTO): Promise<AlertConfig>;
  updateAlert(id: string, userId: string, organizationId: string, data: UpdateAlertDTO): Promise<AlertConfig | null>;
  deleteAlert(id: string, userId: string, organizationId: string): Promise<boolean>;
  toggleAlert(id: string, userId: string, organizationId: string): Promise<AlertConfig | null>;
  getCurrentMetricValue(metricType: AlertMetricType, filters: Record<string, unknown>, organizationId: string): Promise<number>;
  getAlertInstances(filters: AlertInstanceFilters): Promise<AlertInstance[]>;
  acknowledgeAlert(id: string, userId: string, organizationId: string): Promise<AlertInstance | null>;
  resolveAlert(id: string, userId: string, organizationId: string): Promise<AlertInstance | null>;
  getAlertStatsSnapshot(userId: string, organizationId: string): Promise<AlertStatsSnapshot>;
}
