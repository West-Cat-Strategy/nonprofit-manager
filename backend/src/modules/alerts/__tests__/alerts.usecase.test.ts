import { AlertsUseCase } from '../usecases/alerts.usecase';
import type {
  AlertStatsSnapshot,
  AlertsRepositoryPort,
  CreateAlertDTO,
} from '../types';

const createRepositoryMock = (): jest.Mocked<AlertsRepositoryPort> => ({
  getUserAlerts: jest.fn(),
  getAlert: jest.fn(),
  createAlert: jest.fn(),
  updateAlert: jest.fn(),
  deleteAlert: jest.fn(),
  toggleAlert: jest.fn(),
  getCurrentMetricValue: jest.fn(),
  getAlertInstances: jest.fn(),
  acknowledgeAlert: jest.fn(),
  resolveAlert: jest.fn(),
  getAlertStatsSnapshot: jest.fn(),
});

describe('AlertsUseCase', () => {
  let repository: jest.Mocked<AlertsRepositoryPort>;
  let usecase: AlertsUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    usecase = new AlertsUseCase(repository);
  });

  it('normalizes alert instance query filters before delegating to the repository', async () => {
    repository.getAlertInstances.mockResolvedValue([]);

    await usecase.getAlertInstances({
      status: 'triggered',
      severity: 'critical',
      limit: '25',
    });

    expect(repository.getAlertInstances).toHaveBeenCalledWith({
      status: 'triggered',
      severity: 'critical',
      limit: 25,
    });
  });

  it('aggregates alert stats snapshot rows into numeric response data', async () => {
    const snapshot: AlertStatsSnapshot = {
      total: '5',
      active: '3',
      triggered_today: '1',
      triggered_week: '7',
      triggered_month: '12',
      severity_rows: [
        { severity: 'low', count: '2' },
        { severity: 'critical', count: '1' },
      ],
      metric_rows: [
        { metric_type: 'donations', count: '4' },
        { metric_type: 'event_attendance', count: '3' },
      ],
    };
    repository.getAlertStatsSnapshot.mockResolvedValue(snapshot);

    const result = await usecase.getAlertStats('user-1');

    expect(result).toEqual({
      total_alerts: 5,
      active_alerts: 3,
      triggered_today: 1,
      triggered_this_week: 7,
      triggered_this_month: 12,
      by_severity: {
        low: 2,
        medium: 0,
        high: 0,
        critical: 1,
      },
      by_metric: {
        donations: 4,
        event_attendance: 3,
      },
    });
  });

  it('evaluates threshold-based test alerts using repository metric values', async () => {
    const payload: CreateAlertDTO = {
      user_id: 'user-1',
      name: 'Donations threshold',
      metric_type: 'donations',
      condition: 'exceeds',
      threshold: 10,
      frequency: 'daily',
      channels: ['email'],
      severity: 'medium',
      enabled: true,
    };
    repository.getCurrentMetricValue.mockResolvedValue(15);

    const result = await usecase.testAlert(payload);

    expect(repository.getCurrentMetricValue).toHaveBeenCalledWith('donations', {});
    expect(result).toMatchObject({
      would_trigger: true,
      current_value: 15,
      threshold_value: 10,
    });
    expect(result.message).toContain('exceeds threshold 10');
  });
});
