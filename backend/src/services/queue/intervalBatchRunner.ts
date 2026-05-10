import { logger } from '@config/logger';
import { schedulerHealthService } from './schedulerHealthService';

export interface IntervalBatchRunnerOptions {
  name: string;
  intervalMs: number;
  runBatch: () => Promise<number>;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  startupJitterMs?: number;
  healthName: string;
}

class BatchTimeoutError extends Error {}

export class IntervalBatchRunner {
  private readonly name: string;
  private readonly intervalMs: number;
  private readonly runBatch: () => Promise<number>;
  private readonly timeoutMs?: number;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;
  private readonly startupJitterMs: number;
  private readonly healthName: string;
  private intervalId: NodeJS.Timeout | null = null;
  private startupTimeoutId: NodeJS.Timeout | null = null;
  private inFlight = false;
  private deferInFlightRelease = false;

  constructor(options: IntervalBatchRunnerOptions) {
    this.name = options.name;
    this.intervalMs = options.intervalMs;
    this.runBatch = options.runBatch;
    this.timeoutMs = options.timeoutMs;
    this.retryAttempts = Math.max(0, options.retryAttempts ?? 0);
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? 1000);
    this.startupJitterMs = Math.max(0, options.startupJitterMs ?? 0);
    this.healthName = options.healthName;
  }

  start(): void {
    if (this.intervalId || this.startupTimeoutId) return;

    const startInterval = (): void => {
      if (this.intervalId) return;
      this.intervalId = setInterval(() => {
        void this.tick();
      }, this.intervalMs);
    };

    const runInitialTick = (): void => {
      this.startupTimeoutId = null;
      startInterval();
      void this.tick();
    };

    if (this.startupJitterMs > 0) {
      const startupDelayMs = Math.floor(Math.random() * this.startupJitterMs);
      this.startupTimeoutId = setTimeout(runInitialTick, startupDelayMs);
    } else {
      startInterval();
      void this.tick();
    }

    logger.debug(`${this.name} started`, {
      intervalMs: this.intervalMs,
      startupJitterMs: this.startupJitterMs,
    });
  }

  stop(): void {
    if (!this.intervalId && !this.startupTimeoutId) return;

    if (this.startupTimeoutId) {
      clearTimeout(this.startupTimeoutId);
      this.startupTimeoutId = null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.debug(`${this.name} stopped`);
  }

  async tick(): Promise<number> {
    if (this.inFlight) {
      logger.debug(`${this.name} tick skipped due to in-flight batch`);
      return 0;
    }

    this.inFlight = true;
    const startedAt = Date.now();
    let processed = 0;

    try {
      await this.recordTickStarted();
      processed = await this.runBatchWithRetries();
      await this.recordTickSucceeded(processed);
      return processed;
    } catch (error) {
      logger.error(`${this.name} tick failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      await this.recordTickFailed(error, processed);
      return processed;
    } finally {
      logger.debug(`${this.name} tick complete`, {
        processed,
        durationMs: Date.now() - startedAt,
      });
      if (!this.deferInFlightRelease) {
        this.inFlight = false;
      }
    }
  }

  private async runBatchWithRetries(): Promise<number> {
    const maxAttempts = this.retryAttempts + 1;
    let attempt = 1;
    let lastError: unknown;

    while (attempt <= maxAttempts) {
      try {
        return await this.runBatchWithTimeout();
      } catch (error) {
        lastError = error;
        if (error instanceof BatchTimeoutError) {
          break;
        }

        if (attempt >= maxAttempts) {
          break;
        }

        logger.warn(`${this.name} batch attempt failed; retrying`, {
          attempt,
          maxAttempts,
          retryDelayMs: this.retryDelayMs,
          error: error instanceof Error ? error.message : String(error),
        });
        await sleep(this.retryDelayMs);
        attempt += 1;
      }
    }

    throw lastError;
  }

  private async runBatchWithTimeout(): Promise<number> {
    if (!this.timeoutMs) {
      return this.runBatch();
    }

    const batchPromise = this.runBatch();
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new BatchTimeoutError(`${this.name} batch timed out after ${this.timeoutMs}ms`));
        }, this.timeoutMs);
      });

      return await Promise.race([batchPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof BatchTimeoutError) {
        this.deferInFlightRelease = true;
        void batchPromise.then(
          () => {
            this.inFlight = false;
            this.deferInFlightRelease = false;
            logger.debug(`${this.name} timed-out batch settled`);
          },
          (lateError) => {
            this.inFlight = false;
            this.deferInFlightRelease = false;
            logger.warn(`${this.name} timed-out batch failed after timeout`, {
              error: lateError instanceof Error ? lateError.message : String(lateError),
            });
          }
        );
      }

      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async recordTickStarted(): Promise<void> {
    await schedulerHealthService.recordTickStarted(this.healthName);
  }

  private async recordTickSucceeded(processed: number): Promise<void> {
    await schedulerHealthService.recordTickSucceeded(this.healthName, processed);
  }

  private async recordTickFailed(error: unknown, processed: number): Promise<void> {
    await schedulerHealthService.recordTickFailed(this.healthName, error, processed);
  }
}

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
