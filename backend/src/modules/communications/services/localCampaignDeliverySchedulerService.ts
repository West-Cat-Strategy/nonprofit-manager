import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';
import { drainDueLocalCampaignRuns } from './localCampaignDrainService';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_RETRY_ATTEMPTS = 1;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 120_000;
export const LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME = 'local_campaign_delivery';

const toNumberOrDefault = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

class LocalCampaignDeliverySchedulerService {
  private runner: IntervalBatchRunner | null = null;
  private batchSize = DEFAULT_BATCH_SIZE;

  start(): void {
    if (this.runner) return;

    const intervalMs = toNumberOrDefault(
      process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );

    this.batchSize = toNumberOrDefault(
      process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    const retryAttempts = toNumberOrDefault(
      process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_RETRY_ATTEMPTS,
      DEFAULT_RETRY_ATTEMPTS
    );
    const retryDelayMs = toNumberOrDefault(
      process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS
    );
    const timeoutMs = toNumberOrDefault(
      process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    );

    this.runner = new IntervalBatchRunner({
      name: 'Local campaign delivery scheduler',
      healthName: LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME,
      intervalMs,
      runBatch: async () => this.runBatch(),
      retryAttempts,
      retryDelayMs,
      timeoutMs,
    });

    this.runner.start();
  }

  stop(): void {
    if (!this.runner) return;
    this.runner.stop();
    this.runner = null;
  }

  async tick(): Promise<number> {
    if (this.runner) {
      return this.runner.tick();
    }

    return this.runBatch();
  }

  private async runBatch(): Promise<number> {
    return drainDueLocalCampaignRuns(this.batchSize);
  }
}

export const localCampaignDeliverySchedulerService = new LocalCampaignDeliverySchedulerService();
