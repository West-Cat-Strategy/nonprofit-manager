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
  description?: string;
};

export const ALERT_METRIC_OPTIONS: Option<AlertMetricType>[] = [
  { value: 'donations', label: 'Donations' },
  { value: 'donation_amount', label: 'Donation amount' },
  { value: 'volunteer_hours', label: 'Volunteer hours' },
  { value: 'event_attendance', label: 'Event attendance' },
  { value: 'case_volume', label: 'Case volume' },
  { value: 'engagement_score', label: 'Engagement score' },
];

export const ALERT_CONDITION_OPTIONS: Option<AlertCondition>[] = [
  { value: 'exceeds', label: 'Goes above a value' },
  { value: 'drops_below', label: 'Drops below a value' },
  { value: 'changes_by', label: 'Changes by a percentage' },
  { value: 'anomaly_detected', label: 'Looks unusual' },
  { value: 'trend_reversal', label: 'Trend changes direction' },
];

export const ALERT_FREQUENCY_OPTIONS: Option<AlertFrequency>[] = [
  { value: 'real_time', label: 'Right away' },
  { value: 'daily', label: 'Daily summary' },
  { value: 'weekly', label: 'Weekly summary' },
  { value: 'monthly', label: 'Monthly summary' },
];

export const ALERT_SEVERITY_OPTIONS: Option<AlertSeverity>[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const ALERT_CHANNEL_OPTIONS: Option<AlertChannel>[] = [
  { value: 'email', label: 'Email', description: 'Send an email to the selected recipients.' },
  { value: 'in_app', label: 'In-app', description: 'Show the alert inside the staff app.' },
  { value: 'slack', label: 'Slack', description: 'Post the alert to the connected Slack channel.' },
  {
    value: 'webhook',
    label: 'Webhook',
    description: 'Send the alert to a configured webhook URL.',
  },
];

const metricLabels = Object.fromEntries(
  ALERT_METRIC_OPTIONS.map((option) => [option.value, option.label])
) as Record<AlertMetricType, string>;

const conditionLabels = Object.fromEntries(
  ALERT_CONDITION_OPTIONS.map((option) => [option.value, option.label])
) as Record<AlertCondition, string>;

const frequencyLabels = Object.fromEntries(
  ALERT_FREQUENCY_OPTIONS.map((option) => [option.value, option.label])
) as Record<AlertFrequency, string>;

const channelLabels = Object.fromEntries(
  ALERT_CHANNEL_OPTIONS.map((option) => [option.value, option.label])
) as Record<AlertChannel, string>;

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

export const getAlertFrequencyLabel = (frequency: AlertFrequency): string =>
  frequencyLabels[frequency] || frequency;

export const getAlertChannelLabel = (channel: AlertChannel): string =>
  channelLabels[channel] || channel;

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
