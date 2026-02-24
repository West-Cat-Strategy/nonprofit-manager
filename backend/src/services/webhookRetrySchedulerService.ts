import { processRetries } from '@services/webhookService';
import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 100;

const toNumberOrDefault = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

class WebhookRetrySchedulerService {
  private runner: IntervalBatchRunner | null = null;
  private batchSize = DEFAULT_BATCH_SIZE;

  start(): void {
    if (this.runner) return;

    const intervalMs = toNumberOrDefault(
      process.env.WEBHOOK_RETRY_SCHEDULER_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );

    this.batchSize = toNumberOrDefault(
      process.env.WEBHOOK_RETRY_SCHEDULER_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    this.runner = new IntervalBatchRunner({
      name: 'Webhook retry scheduler',
      intervalMs,
      runBatch: async () => processRetries(this.batchSize),
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
    return processRetries(this.batchSize);
  }
}

export const webhookRetrySchedulerService = new WebhookRetrySchedulerService();
