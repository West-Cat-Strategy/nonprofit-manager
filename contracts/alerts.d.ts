/**
 * Canonical alert contracts shared across backend and frontend.
 */

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

export interface AlertFilters {
  account_type?: string;
  category?: string;
  date_range?: string;
  [key: string]: unknown;
}

export interface AlertConfigFields {
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
  filters?: AlertFilters;
}

export interface AlertCreateConfigRequest {
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
  filters?: AlertFilters;
}

export type AlertUpdateConfigRequest = Partial<AlertCreateConfigRequest>;

export interface AlertConfigContract extends AlertConfigFields {
  id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  last_triggered?: string | null;
}

export interface AlertInstanceContract {
  id: string;
  alert_config_id: string;
  alert_name: string;
  metric_type: AlertMetricType;
  condition: AlertCondition;
  severity: AlertSeverity;
  status: AlertStatus;
  triggered_at: string;
  resolved_at?: string | null;
  current_value: number;
  threshold_value?: number | null;
  message: string;
  details?: Record<string, unknown>;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
}

export interface AlertStatsContract {
  total_alerts: number;
  active_alerts: number;
  triggered_today: number;
  triggered_this_week: number;
  triggered_this_month: number;
  by_severity: Record<AlertSeverity, number>;
  by_metric: Partial<Record<AlertMetricType, number>>;
}

export interface AlertTestResultContract {
  would_trigger: boolean;
  current_value: number;
  threshold_value?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface AlertInstanceFiltersContract {
  status?: string;
  severity?: string;
  limit?: number;
}
