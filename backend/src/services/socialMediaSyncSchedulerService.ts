import { logger } from '@config/logger';
import { socialMediaService } from '@modules/socialMedia';
import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';

const toNumberOrDefault = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

class SocialMediaSyncSchedulerService {
  private readonly runner: IntervalBatchRunner;
  private readonly batchSize: number;

  constructor() {
    const intervalMs = toNumberOrDefault(
      process.env.SOCIAL_MEDIA_SYNC_INTERVAL_MS,
      5 * 60 * 1000
    );
    this.batchSize = toNumberOrDefault(process.env.SOCIAL_MEDIA_SYNC_BATCH_SIZE, 25);

    this.runner = new IntervalBatchRunner({
      name: 'Social media sync scheduler',
      intervalMs,
      runBatch: async () => {
        const result = await socialMediaService.syncDueFacebookPages(this.batchSize);
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
