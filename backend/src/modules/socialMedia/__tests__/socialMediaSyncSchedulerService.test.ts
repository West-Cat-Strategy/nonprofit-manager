import { logger } from '@config/logger';
import { SocialMediaSyncSchedulerService } from '../services/socialMediaSyncSchedulerService';
import type { SocialMediaServicePort } from '../types/contracts';

jest.mock('@config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const createSocialMediaServiceMock = (): jest.Mocked<Pick<SocialMediaServicePort, 'syncDueFacebookPages'>> => ({
  syncDueFacebookPages: jest.fn(),
});

describe('SocialMediaSyncSchedulerService', () => {
  const originalBatchSize = process.env.SOCIAL_MEDIA_SYNC_BATCH_SIZE;
  const originalIntervalMs = process.env.SOCIAL_MEDIA_SYNC_INTERVAL_MS;

  afterEach(() => {
    if (originalBatchSize === undefined) {
      delete process.env.SOCIAL_MEDIA_SYNC_BATCH_SIZE;
    } else {
      process.env.SOCIAL_MEDIA_SYNC_BATCH_SIZE = originalBatchSize;
    }

    if (originalIntervalMs === undefined) {
      delete process.env.SOCIAL_MEDIA_SYNC_INTERVAL_MS;
    } else {
      process.env.SOCIAL_MEDIA_SYNC_INTERVAL_MS = originalIntervalMs;
    }

    jest.clearAllMocks();
  });

  it('runs due Facebook syncs with the configured batch size', async () => {
    process.env.SOCIAL_MEDIA_SYNC_BATCH_SIZE = '7';
    const service = createSocialMediaServiceMock();
    service.syncDueFacebookPages.mockResolvedValue({
      processed: 3,
      synced: 2,
      failed: 1,
      errors: ['Downtown Campaign: Facebook rate limit'],
    });

    const scheduler = new SocialMediaSyncSchedulerService(service as SocialMediaServicePort);
    const runner = (scheduler as unknown as { runner: { tick: () => Promise<number> } }).runner;

    await expect(runner.tick()).resolves.toBe(3);

    expect(service.syncDueFacebookPages).toHaveBeenCalledWith(7);
    expect(logger.info).toHaveBeenCalledWith('Social media sync batch completed', {
      processed: 3,
      synced: 2,
      failed: 1,
      errors: ['Downtown Campaign: Facebook rate limit'],
    });
  });

  it('falls back to defaults for invalid scheduler environment values', () => {
    process.env.SOCIAL_MEDIA_SYNC_INTERVAL_MS = 'nope';
    process.env.SOCIAL_MEDIA_SYNC_BATCH_SIZE = '-3';
    const service = createSocialMediaServiceMock();

    const scheduler = new SocialMediaSyncSchedulerService(service as SocialMediaServicePort);
    const runner = (scheduler as unknown as { runner: unknown; batchSize: number }).runner as {
      intervalMs: number;
    };

    expect(runner.intervalMs).toBe(5 * 60 * 1000);
    expect((scheduler as unknown as { batchSize: number }).batchSize).toBe(25);
  });
});
