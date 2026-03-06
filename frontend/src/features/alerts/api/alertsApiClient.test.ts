import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import { AlertsApiClient } from './alertsApiClient';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('AlertsApiClient', () => {
  const client = new AlertsApiClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches alert configs', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ id: 'alert-1' }] } as never);

    const result = await client.fetchAlertConfigs();

    expect(api.get).toHaveBeenCalledWith('/alerts/configs');
    expect(result).toEqual([{ id: 'alert-1' }]);
  });

  it('creates alert configs', async () => {
    const payload = {
      name: 'New alert',
      metric_type: 'donations',
      condition: 'exceeds',
      threshold: 12,
      frequency: 'daily',
      channels: ['email'],
      severity: 'medium',
      enabled: true,
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'alert-2', ...payload } } as never);

    const result = await client.createAlertConfig(payload);

    expect(api.post).toHaveBeenCalledWith('/alerts/configs', payload);
    expect(result).toMatchObject({ id: 'alert-2', name: 'New alert' });
  });

  it('adds query params when fetching alert instances', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ id: 'instance-1' }] } as never);

    const result = await client.fetchAlertInstances({
      status: 'triggered',
      severity: 'critical',
      limit: 10,
    });

    expect(api.get).toHaveBeenCalledWith(
      '/alerts/instances?status=triggered&severity=critical&limit=10'
    );
    expect(result).toEqual([{ id: 'instance-1' }]);
  });

  it('fetches alert stats', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { total_alerts: 3 } } as never);

    const result = await client.fetchAlertStats();

    expect(api.get).toHaveBeenCalledWith('/alerts/stats');
    expect(result).toEqual({ total_alerts: 3 });
  });
});
