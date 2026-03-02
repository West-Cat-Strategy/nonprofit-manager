import { logger } from '@config/logger';

export interface IntervalBatchRunnerOptions {
  name: string;
  intervalMs: number;
  runBatch: () => Promise<number>;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export class IntervalBatchRunner {
  private readonly name: string;
  private readonly intervalMs: number;
  private readonly runBatch: () => Promise<number>;
  private readonly timeoutMs?: number;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;
  private intervalId: NodeJS.Timeout | null = null;
  private inFlight = false;

  constructor(options: IntervalBatchRunnerOptions) {
    this.name = options.name;
    this.intervalMs = options.intervalMs;
    this.runBatch = options.runBatch;
    this.timeoutMs = options.timeoutMs;
    this.retryAttempts = Math.max(0, options.retryAttempts ?? 0);
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? 1000);
  }

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      void this.tick();
    }, this.intervalMs);

    logger.info(`${this.name} started`, {
      intervalMs: this.intervalMs,
    });

    void this.tick();
  }

  stop(): void {
    if (!this.intervalId) return;

    clearInterval(this.intervalId);
    this.intervalId = null;

    logger.info(`${this.name} stopped`);
  }

  async tick(): Promise<number> {
    if (this.inFlight) {
      logger.warn(`${this.name} tick skipped due to in-flight batch`);
      return 0;
    }

    this.inFlight = true;
    const startedAt = Date.now();
    let processed = 0;

    try {
      processed = await this.runBatchWithRetries();
      return processed;
    } catch (error) {
      logger.error(`${this.name} tick failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return processed;
    } finally {
      logger.info(`${this.name} tick complete`, {
        processed,
        durationMs: Date.now() - startedAt,
      });
      this.inFlight = false;
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

    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${this.name} batch timed out after ${this.timeoutMs}ms`));
        }, this.timeoutMs);
      });

      return await Promise.race([this.runBatch(), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
