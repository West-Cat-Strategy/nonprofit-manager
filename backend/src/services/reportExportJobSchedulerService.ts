import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';
import { reportExportJobService } from '@services/reportExportJobService';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_RETRY_ATTEMPTS = 1;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_STARTUP_JITTER_MS = 0;
const DEFAULT_FAILED_RETRY_LIMIT = 1;
const DEFAULT_FAILED_RETRY_DELAY_MS = 300_000;
export const REPORT_EXPORT_JOB_SCHEDULER_HEALTH_NAME = 'report_export_jobs';

const toNumberOrDefault = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

class ReportExportJobSchedulerService {
  readonly healthName = REPORT_EXPORT_JOB_SCHEDULER_HEALTH_NAME;
  private runner: IntervalBatchRunner | null = null;
  private batchSize = DEFAULT_BATCH_SIZE;
  private failedRetryLimit = DEFAULT_FAILED_RETRY_LIMIT;
  private failedRetryDelayMs = DEFAULT_FAILED_RETRY_DELAY_MS;

  start(): void {
    if (this.runner) return;

    const intervalMs = toNumberOrDefault(
      process.env.REPORT_EXPORT_JOB_SCHEDULER_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );

    this.batchSize = toNumberOrDefault(
      process.env.REPORT_EXPORT_JOB_SCHEDULER_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    const retryAttempts = toNumberOrDefault(
      process.env.REPORT_EXPORT_JOB_SCHEDULER_RETRY_ATTEMPTS,
      DEFAULT_RETRY_ATTEMPTS
    );

    const retryDelayMs = toNumberOrDefault(
      process.env.REPORT_EXPORT_JOB_SCHEDULER_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS
    );

    const timeoutMs = toNumberOrDefault(
      process.env.REPORT_EXPORT_JOB_SCHEDULER_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    );

    const startupJitterMs = toNumberOrDefault(
      process.env.REPORT_EXPORT_JOB_SCHEDULER_STARTUP_JITTER_MS,
      DEFAULT_STARTUP_JITTER_MS
    );

    this.failedRetryLimit = toNumberOrDefault(
      process.env.REPORT_EXPORT_JOB_SCHEDULER_FAILED_RETRY_LIMIT,
      DEFAULT_FAILED_RETRY_LIMIT
    );

    this.failedRetryDelayMs = toNumberOrDefault(
      process.env.REPORT_EXPORT_JOB_SCHEDULER_FAILED_RETRY_DELAY_MS,
      DEFAULT_FAILED_RETRY_DELAY_MS
    );

    this.runner = new IntervalBatchRunner({
      name: 'Report export job scheduler',
      healthName: this.healthName,
      intervalMs,
      runBatch: async () => this.runBatch(),
      retryAttempts,
      retryDelayMs,
      timeoutMs,
      startupJitterMs,
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
    return reportExportJobService.processPendingJobs(this.batchSize, {
      failedRetryLimit: this.failedRetryLimit,
      failedRetryDelayMs: this.failedRetryDelayMs,
    });
  }
}

export const reportExportJobSchedulerService = new ReportExportJobSchedulerService();
