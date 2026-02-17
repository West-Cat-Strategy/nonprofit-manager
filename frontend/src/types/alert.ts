/**
 * Alert Configuration Types
 * Type definitions for analytics alert system
 */

/**
 * Alert metric types that can be monitored
 */
export type AlertMetricType =
  | 'donations'
  | 'donation_amount'
  | 'volunteer_hours'
  | 'event_attendance'
  | 'case_volume'
  | 'engagement_score';

/**
 * Alert condition types
 */
export type AlertCondition =
  | 'exceeds'          // Value exceeds threshold
  | 'drops_below'      // Value drops below threshold
  | 'changes_by'       // Value changes by percentage
  | 'anomaly_detected' // Statistical anomaly detected
  | 'trend_reversal';  // Trend direction changes

/**
 * Alert frequency
 */
export type AlertFrequency =
  | 'real_time'   // Immediate notification
  | 'daily'       // Once per day digest
  | 'weekly'      // Weekly summary
  | 'monthly';    // Monthly summary

/**
 * Alert channel
 */
export type AlertChannel =
  | 'email'
  | 'in_app'
  | 'slack'
  | 'webhook';

/**
 * Alert severity
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Alert status
 */
export type AlertStatus = 'active' | 'paused' | 'triggered' | 'resolved';

/**
 * Alert configuration
 */
export interface AlertConfig {
  id?: string;
  name: string;
  description?: string;
  metric_type: AlertMetricType;
  condition: AlertCondition;
  threshold?: number;           // For exceeds/drops_below
  percentage_change?: number;   // For changes_by
  sensitivity?: number;         // For anomaly_detected (1.0-4.0)
  frequency: AlertFrequency;
  channels: AlertChannel[];
  severity: AlertSeverity;
  enabled: boolean;
  recipients?: string[];        // Email addresses or user IDs
  filters?: {
    account_type?: string;
    category?: string;
    date_range?: string;
  };
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  last_triggered?: string;
}

/**
 * Alert instance (when an alert is triggered)
 */
export interface AlertInstance {
  id: string;
  alert_config_id: string;
  alert_name: string;
  metric_type: AlertMetricType;
  condition: AlertCondition;
  severity: AlertSeverity;
  status: AlertStatus;
  triggered_at: string;
  resolved_at?: string;
  current_value: number;
  threshold_value?: number;
  message: string;
  details?: Record<string, unknown>;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

/**
 * Alert history entry
 */
export interface AlertHistory {
  alert_config_id: string;
  alert_name: string;
  triggered_count: number;
  last_triggered: string;
  average_resolution_time?: number; // In minutes
  instances: AlertInstance[];
}

/**
 * Alert statistics
 */
export interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  triggered_today: number;
  triggered_this_week: number;
  triggered_this_month: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  by_metric: Record<AlertMetricType, number>;
}

/**
 * Create alert DTO
 */
export type CreateAlertDTO = Omit<AlertConfig, 'id' | 'created_at' | 'updated_at' | 'last_triggered'>;

/**
 * Update alert DTO
 */
export type UpdateAlertDTO = Partial<CreateAlertDTO>;

/**
 * Alert test result
 */
export interface AlertTestResult {
  would_trigger: boolean;
  current_value: number;
  threshold_value?: number;
  message: string;
  details?: Record<string, unknown>;
}

export default {
  AlertMetricType: {} as AlertMetricType,
  AlertCondition: {} as AlertCondition,
  AlertFrequency: {} as AlertFrequency,
  AlertChannel: {} as AlertChannel,
  AlertSeverity: {} as AlertSeverity,
  AlertStatus: {} as AlertStatus,
  AlertConfig: {} as AlertConfig,
  AlertInstance: {} as AlertInstance,
  AlertHistory: {} as AlertHistory,
  AlertStats: {} as AlertStats,
  CreateAlertDTO: {} as CreateAlertDTO,
  UpdateAlertDTO: {} as UpdateAlertDTO,
  AlertTestResult: {} as AlertTestResult,
};
