/**
 * Alert Configuration Types (Backend)
 * Type definitions for analytics alert system
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

/**
 * Alert configuration
 */
export interface AlertConfig {
  id: string;
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
  filters?: Record<string, any>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  last_triggered?: Date;
}

/**
 * Alert instance (triggered alert)
 */
export interface AlertInstance {
  id: string;
  alert_config_id: string;
  alert_name: string;
  metric_type: AlertMetricType;
  condition: AlertCondition;
  severity: AlertSeverity;
  status: AlertStatus;
  triggered_at: Date;
  resolved_at?: Date;
  current_value: number;
  threshold_value?: number;
  message: string;
  details?: Record<string, any>;
  acknowledged_by?: string;
  acknowledged_at?: Date;
}

/**
 * Create alert DTO
 */
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
  filters?: Record<string, any>;
}

/**
 * Update alert DTO
 */
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
  filters?: Record<string, any>;
}

/**
 * Alert test result
 */
export interface AlertTestResult {
  would_trigger: boolean;
  current_value: number;
  threshold_value?: number;
  message: string;
  details?: Record<string, any>;
}

export default {
  AlertConfig: {} as AlertConfig,
  AlertInstance: {} as AlertInstance,
  CreateAlertDTO: {} as CreateAlertDTO,
  UpdateAlertDTO: {} as UpdateAlertDTO,
  AlertTestResult: {} as AlertTestResult,
};
