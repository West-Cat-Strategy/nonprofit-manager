export type AlertMetricType =
  | 'donations'
  | 'donation_amount'
  | 'volunteer_hours'
  | 'event_attendance'
  | 'case_volume'
  | 'engagement_score';

export type AlertCondition =
  | 'exceeds'
  | 'drops_below'
  | 'changes_by'
  | 'anomaly_detected'
  | 'trend_reversal';

export type AlertFrequency = 'real_time' | 'daily' | 'weekly' | 'monthly';

export type AlertChannel = 'email' | 'in_app' | 'slack' | 'webhook';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'active' | 'paused' | 'triggered' | 'resolved';

export interface AlertConfig {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  metric_type: AlertMetricType;
  condition: AlertCondition;
  threshold?: number | null;
  percentage_change?: number | null;
  sensitivity?: number | null;
  frequency: AlertFrequency;
  channels: AlertChannel[];
  severity: AlertSeverity;
  enabled: boolean;
  recipients?: string[];
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

export interface CreateAlertDTO {
  user_id: string;
  name: string;
  description?: string;
  metric_type: AlertMetricType;
  condition: AlertCondition;
  threshold?: number;
  percentage_change?: number;
  sensitivity?: number;
  frequency: AlertFrequency;
  channels: AlertChannel[];
  severity: AlertSeverity;
  enabled: boolean;
  recipients?: string[];
  filters?: Record<string, unknown>;
}

export interface UpdateAlertDTO {
  name?: string;
  description?: string;
  metric_type?: AlertMetricType;
  condition?: AlertCondition;
  threshold?: number;
  percentage_change?: number;
  sensitivity?: number;
  frequency?: AlertFrequency;
  channels?: AlertChannel[];
  severity?: AlertSeverity;
  enabled?: boolean;
  recipients?: string[];
  filters?: Record<string, unknown>;
}

export interface AlertTestResult {
  would_trigger: boolean;
  current_value: number;
  threshold_value?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  triggered_today: number;
  triggered_this_week: number;
  triggered_this_month: number;
  by_severity: Record<AlertSeverity, number>;
  by_metric: Partial<Record<AlertMetricType, number>>;
}

export interface AlertInstanceFilters {
  userId: string;
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
  getUserAlerts(userId: string): Promise<AlertConfig[]>;
  getAlert(id: string, userId: string): Promise<AlertConfig | null>;
  createAlert(data: CreateAlertDTO): Promise<AlertConfig>;
  updateAlert(id: string, userId: string, data: UpdateAlertDTO): Promise<AlertConfig | null>;
  deleteAlert(id: string, userId: string): Promise<boolean>;
  toggleAlert(id: string, userId: string): Promise<AlertConfig | null>;
  getCurrentMetricValue(metricType: AlertMetricType, filters: Record<string, unknown>): Promise<number>;
  getAlertInstances(filters: AlertInstanceFilters): Promise<AlertInstance[]>;
  acknowledgeAlert(id: string, userId: string): Promise<AlertInstance | null>;
  resolveAlert(id: string, userId: string): Promise<AlertInstance | null>;
  getAlertStatsSnapshot(userId: string): Promise<AlertStatsSnapshot>;
}
