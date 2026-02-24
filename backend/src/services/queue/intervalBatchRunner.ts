import { logger } from '@config/logger';

export interface IntervalBatchRunnerOptions {
  name: string;
  intervalMs: number;
  runBatch: () => Promise<number>;
}

export class IntervalBatchRunner {
  private readonly name: string;
  private readonly intervalMs: number;
  private readonly runBatch: () => Promise<number>;
  private intervalId: NodeJS.Timeout | null = null;
  private inFlight = false;

  constructor(options: IntervalBatchRunnerOptions) {
    this.name = options.name;
    this.intervalMs = options.intervalMs;
    this.runBatch = options.runBatch;
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
      return 0;
    }

    this.inFlight = true;
    const startedAt = Date.now();
    let processed = 0;

    try {
      processed = await this.runBatch();
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
}
