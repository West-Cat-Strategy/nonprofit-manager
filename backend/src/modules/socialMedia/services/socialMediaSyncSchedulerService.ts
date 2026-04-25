import { logger } from '@config/logger';
import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';
import type { SocialMediaServicePort } from '../types/contracts';
import { socialMediaService } from './socialMediaService';

const DEFAULT_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_SYNC_BATCH_SIZE = 25;

const toNumberOrDefault = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class SocialMediaSyncSchedulerService {
  private readonly runner: IntervalBatchRunner;
  private readonly batchSize: number;

  constructor(service: SocialMediaServicePort = socialMediaService) {
    const intervalMs = toNumberOrDefault(
      process.env.SOCIAL_MEDIA_SYNC_INTERVAL_MS,
      DEFAULT_SYNC_INTERVAL_MS
    );
    this.batchSize = toNumberOrDefault(
      process.env.SOCIAL_MEDIA_SYNC_BATCH_SIZE,
      DEFAULT_SYNC_BATCH_SIZE
    );

    this.runner = new IntervalBatchRunner({
      name: 'Social media sync scheduler',
      intervalMs,
      runBatch: async () => {
        const result = await service.syncDueFacebookPages(this.batchSize);
        if (result.processed > 0) {
          logger.info('Social media sync batch completed', result);
        }
        return result.processed;
      },
    });
  }

  start(): void {
    this.runner.start();
  }

  stop(): void {
    this.runner.stop();
  }
}

export const socialMediaSyncSchedulerService = new SocialMediaSyncSchedulerService();
