import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';
import { scheduledReportService } from '@services/scheduledReportService';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_RETRY_ATTEMPTS = 1;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 120_000;

const toNumberOrDefault = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

class ScheduledReportSchedulerService {
  private runner: IntervalBatchRunner | null = null;
  private batchSize = DEFAULT_BATCH_SIZE;

  start(): void {
    if (this.runner) return;

    const intervalMs = toNumberOrDefault(
      process.env.SCHEDULED_REPORT_SCHEDULER_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );

    this.batchSize = toNumberOrDefault(
      process.env.SCHEDULED_REPORT_SCHEDULER_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    const retryAttempts = toNumberOrDefault(
      process.env.SCHEDULED_REPORT_SCHEDULER_RETRY_ATTEMPTS,
      DEFAULT_RETRY_ATTEMPTS
    );

    const retryDelayMs = toNumberOrDefault(
      process.env.SCHEDULED_REPORT_SCHEDULER_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS
    );

    const timeoutMs = toNumberOrDefault(
      process.env.SCHEDULED_REPORT_SCHEDULER_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    );

    this.runner = new IntervalBatchRunner({
      name: 'Scheduled report scheduler',
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
    const dueReports = await scheduledReportService.claimDueReports(this.batchSize);
    return scheduledReportService.processClaimedReports(dueReports);
  }
}

export const scheduledReportSchedulerService = new ScheduledReportSchedulerService();
