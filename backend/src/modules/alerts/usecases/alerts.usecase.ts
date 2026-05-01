import type {
  AlertCondition,
  AlertInstance,
  AlertInstanceFilters,
  AlertInstanceFiltersInput,
  AlertSeverity,
  AlertStats,
  AlertTestResult,
  AlertsRepositoryPort,
  CreateAlertDTO,
  UpdateAlertDTO,
} from '../types';

export class AlertsUseCase {
  constructor(private readonly repository: AlertsRepositoryPort) {}

  getUserAlerts(userId: string) {
    return this.repository.getUserAlerts(userId);
  }

  getAlert(id: string, userId: string) {
    return this.repository.getAlert(id, userId);
  }

  createAlert(data: CreateAlertDTO) {
    return this.repository.createAlert(data);
  }

  updateAlert(id: string, userId: string, data: UpdateAlertDTO) {
    return this.repository.updateAlert(id, userId, data);
  }

  deleteAlert(id: string, userId: string) {
    return this.repository.deleteAlert(id, userId);
  }

  toggleAlert(id: string, userId: string) {
    return this.repository.toggleAlert(id, userId);
  }

  async testAlert(data: CreateAlertDTO): Promise<AlertTestResult> {
    const currentValue = await this.repository.getCurrentMetricValue(
      data.metric_type,
      data.filters || {}
    );

    let wouldTrigger = false;
    let message: string;

    switch (data.condition) {
      case 'exceeds':
        wouldTrigger = currentValue > (data.threshold || 0);
        message = wouldTrigger
          ? `Current value ${currentValue} exceeds threshold ${data.threshold}`
          : `Current value ${currentValue} is below threshold ${data.threshold}`;
        break;
      case 'drops_below':
        wouldTrigger = currentValue < (data.threshold || 0);
        message = wouldTrigger
          ? `Current value ${currentValue} dropped below threshold ${data.threshold}`
          : `Current value ${currentValue} is above threshold ${data.threshold}`;
        break;
      case 'changes_by':
        message = 'Percentage change requires historical data. Alert configured successfully.';
        break;
      case 'anomaly_detected':
        message = `Anomaly detection configured with sensitivity ${data.sensitivity || 2.0}`;
        break;
      case 'trend_reversal':
        message = 'Trend reversal detection configured successfully.';
        break;
      default:
        message = this.getUnhandledConditionMessage(data.condition);
        break;
    }

    return {
      would_trigger: wouldTrigger,
      current_value: currentValue,
      threshold_value: data.threshold,
      message,
      details: {
        metric_type: data.metric_type,
        condition: data.condition,
      },
    };
  }

  async getAlertInstances(userId: string, filters?: AlertInstanceFiltersInput): Promise<AlertInstance[]> {
    return this.repository.getAlertInstances(this.normalizeInstanceFilters(userId, filters));
  }

  acknowledgeAlert(id: string, userId: string) {
    return this.repository.acknowledgeAlert(id, userId);
  }

  resolveAlert(id: string, userId: string) {
    return this.repository.resolveAlert(id, userId);
  }

  async getAlertStats(userId: string): Promise<AlertStats> {
    const snapshot = await this.repository.getAlertStatsSnapshot(userId);
    const bySeverity: Record<AlertSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    snapshot.severity_rows.forEach((row) => {
      bySeverity[row.severity] = parseInt(row.count, 10);
    });

    const byMetric: AlertStats['by_metric'] = {};
    snapshot.metric_rows.forEach((row) => {
      byMetric[row.metric_type] = parseInt(row.count, 10);
    });

    return {
      total_alerts: parseInt(snapshot.total, 10),
      active_alerts: parseInt(snapshot.active, 10),
      triggered_today: parseInt(snapshot.triggered_today, 10),
      triggered_this_week: parseInt(snapshot.triggered_week, 10),
      triggered_this_month: parseInt(snapshot.triggered_month, 10),
      by_severity: bySeverity,
      by_metric: byMetric,
    };
  }

  private normalizeInstanceFilters(
    userId: string,
    filters?: AlertInstanceFiltersInput
  ): AlertInstanceFilters {
    if (!filters) {
      return { userId };
    }

    const parsedLimit =
      typeof filters.limit === 'number'
        ? filters.limit
        : Number.parseInt(String(filters.limit ?? ''), 10);

    return {
      userId,
      status: filters.status,
      severity: filters.severity,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    };
  }

  private getUnhandledConditionMessage(condition: never | AlertCondition): string {
    return `Unhandled alert condition: ${String(condition)}`;
  }
}
