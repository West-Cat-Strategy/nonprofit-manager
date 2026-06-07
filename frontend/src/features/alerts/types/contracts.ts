import type {
  AlertConfigContract,
  AlertCreateConfigRequest,
  AlertFilters,
  AlertInstanceContract,
  AlertInstanceFiltersContract,
  AlertStatsContract,
  AlertTestResultContract,
} from '@nonprofit-manager/contracts/alerts';

export type {
  AlertChannel,
  AlertCondition,
  AlertFrequency,
  AlertMetricType,
  AlertSeverity,
  AlertStatus,
} from '@nonprofit-manager/contracts/alerts';

type AlertConfigFilters = Pick<AlertFilters, 'account_type' | 'category' | 'date_range'>;

export interface AlertConfig
  extends Omit<AlertConfigContract, 'filters'> {
  filters?: AlertConfigFilters;
}

export type AlertInstance = AlertInstanceContract;

export interface AlertHistory {
  alert_config_id: string;
  alert_name: string;
  triggered_count: number;
  last_triggered: string;
  average_resolution_time?: number;
  instances: AlertInstance[];
}

export type AlertStats = AlertStatsContract;

export interface CreateAlertDTO extends Omit<AlertCreateConfigRequest, 'filters'> {
  created_by?: string;
  filters?: AlertConfigFilters;
}

export type UpdateAlertDTO = Partial<CreateAlertDTO>;

export type AlertTestResult = AlertTestResultContract;

export type AlertInstanceFilters = AlertInstanceFiltersContract;
