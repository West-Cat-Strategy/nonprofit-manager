import type {
  AlertChannel,
  AlertCondition,
  AlertConfig,
  AlertFrequency,
  AlertMetricType,
  AlertSeverity,
  CreateAlertDTO,
} from './types';

type Option<T extends string> = {
  value: T;
  label: string;
};

export const ALERT_METRIC_OPTIONS: Option<AlertMetricType>[] = [
  { value: 'donations', label: 'Donations' },
  { value: 'donation_amount', label: 'Donation Amount' },
  { value: 'volunteer_hours', label: 'Volunteer Hours' },
  { value: 'event_attendance', label: 'Event Attendance' },
  { value: 'case_volume', label: 'Case Volume' },
  { value: 'engagement_score', label: 'Engagement Score' },
];

export const ALERT_CONDITION_OPTIONS: Option<AlertCondition>[] = [
  { value: 'exceeds', label: 'Exceeds Threshold' },
  { value: 'drops_below', label: 'Drops Below Threshold' },
  { value: 'changes_by', label: 'Changes By Percentage' },
  { value: 'anomaly_detected', label: 'Anomaly Detected' },
  { value: 'trend_reversal', label: 'Trend Reversal' },
];

export const ALERT_FREQUENCY_OPTIONS: Option<AlertFrequency>[] = [
  { value: 'real_time', label: 'Real-time' },
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Summary' },
  { value: 'monthly', label: 'Monthly Report' },
];

export const ALERT_SEVERITY_OPTIONS: Option<AlertSeverity>[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const ALERT_CHANNEL_OPTIONS: Option<AlertChannel>[] = [
  { value: 'email', label: 'Email' },
  { value: 'in_app', label: 'In App' },
  { value: 'slack', label: 'Slack' },
  { value: 'webhook', label: 'Webhook' },
];

const metricLabels = Object.fromEntries(
  ALERT_METRIC_OPTIONS.map((option) => [option.value, option.label])
) as Record<AlertMetricType, string>;

const conditionLabels = Object.fromEntries(
  ALERT_CONDITION_OPTIONS.map((option) => [option.value, option.label])
) as Record<AlertCondition, string>;

export const createDefaultAlertConfig = (): CreateAlertDTO => ({
  name: '',
  description: '',
  metric_type: 'donations',
  condition: 'exceeds',
  threshold: undefined,
  percentage_change: undefined,
  sensitivity: 2,
  frequency: 'daily',
  channels: ['email', 'in_app'],
  severity: 'medium',
  enabled: true,
  recipients: [],
  filters: {},
});

export const toEditableAlertConfig = (config: AlertConfig | null): CreateAlertDTO =>
  config
    ? {
        name: config.name,
        description: config.description || '',
        metric_type: config.metric_type,
        condition: config.condition,
        threshold: config.threshold,
        percentage_change: config.percentage_change,
        sensitivity: config.sensitivity,
        frequency: config.frequency,
        channels: config.channels,
        severity: config.severity,
        enabled: config.enabled,
        recipients: config.recipients || [],
        filters: config.filters || {},
      }
    : createDefaultAlertConfig();

export const getAlertMetricLabel = (metric: AlertMetricType): string =>
  metricLabels[metric] || metric;

export const getAlertConditionLabel = (condition: AlertCondition): string =>
  conditionLabels[condition] || condition;

export const getAlertSeverityClasses = (severity: AlertSeverity): string => {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'text-app-accent bg-app-accent-soft';
    case 'medium':
      return 'text-app-accent bg-app-accent-soft';
    case 'low':
    default:
      return 'text-app-text-muted bg-app-surface-muted';
  }
};
