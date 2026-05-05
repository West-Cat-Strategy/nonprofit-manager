jest.mock('@config/database', () => ({
  query: jest.fn(),
}));

jest.mock('@config/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

import pool from '@config/database';
import { logger } from '@config/logger';
import { schedulerHealthService } from '@services/queue/schedulerHealthService';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('schedulerHealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists scheduler enabled state for operator visibility', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await schedulerHealthService.recordSchedulerState('local_campaign_delivery', true);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO worker_scheduler_health'),
      expect.arrayContaining(['local_campaign_delivery', expect.any(String), 'enabled', true])
    );
  });

  it('records last success and clears prior error state', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await schedulerHealthService.recordTickSucceeded('local_campaign_delivery', 3);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('last_success_at = CURRENT_TIMESTAMP'),
      ['local_campaign_delivery', 3]
    );
    expect(String(mockPool.query.mock.calls[0]?.[0])).toContain('last_error = NULL');
    expect(String(mockPool.query.mock.calls[0]?.[0])).toContain('consecutive_failures = 0');
  });

  it('records last error without throwing when persistence succeeds', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await schedulerHealthService.recordTickFailed(
      'local_campaign_delivery',
      new Error('scheduler timeout'),
      1
    );

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'error'"),
      ['local_campaign_delivery', 'scheduler timeout', 1]
    );
  });

  it('logs and swallows health persistence failures', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('table unavailable'));

    await expect(
      schedulerHealthService.recordTickStarted('local_campaign_delivery')
    ).resolves.toBeUndefined();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Worker scheduler health persistence failed',
      { error: 'table unavailable' }
    );
  });
});
