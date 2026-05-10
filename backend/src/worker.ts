/**
 * Nonprofit Manager - Background Worker Process
 * Handles all scheduled tasks and background workers.
 */

import dotenv from 'dotenv';
import { logger } from './config/logger';
import { initializeRedis, closeRedis } from './config/redis';
import pool from './config/database';
import { schedulerHealthService } from './services/queue/schedulerHealthService';
import { createWorkerSchedulerRegistry } from './workerSchedulerRegistry';

// Load environment variables
dotenv.config({ path: '.env', quiet: true });

interface StartWorkerOptions {
  exitOnFailure?: boolean;
}

interface StopWorkerOptions {
  exitProcess?: boolean;
}

export const startWorker = async (options: StartWorkerOptions = {}): Promise<void> => {
  logger.info('Starting background worker process...');

  try {
    // Initialize shared resources
    await initializeRedis();
    logger.info('Worker: Redis initialized');

    const schedulers = createWorkerSchedulerRegistry();

    for (const scheduler of schedulers) {
      await schedulerHealthService.recordSchedulerState(scheduler.healthName, scheduler.enabled);
      if (scheduler.enabled) {
        scheduler.service.start();
        logger.info(`Worker: Started ${scheduler.name} scheduler`);
      } else {
        logger.info(`Worker: ${scheduler.name} scheduler disabled (skipped)`);
      }
    }

    logger.info('Background worker process fully initialized');
  } catch (error) {
    logger.error('Worker: Failed to initialize background processes', error);
    if (options.exitOnFailure) {
      process.exit(1);
    }
    throw error;
  }
};

export const stopWorker = async (
  signal: string,
  options: StopWorkerOptions = {}
): Promise<void> => {
  logger.info(`${signal} received, closing worker gracefully...`);

  const schedulers = createWorkerSchedulerRegistry();

  for (const scheduler of schedulers) {
    scheduler.service.stop();
  }

  await Promise.allSettled(
    schedulers.map((scheduler) =>
      schedulerHealthService.recordSchedulerStopped(scheduler.healthName)
    )
  );

  try {
    await Promise.all([closeRedis(), pool.end()]);
    logger.info('Worker: Shared resources closed');
  } catch (error) {
    logger.error('Worker: Error closing resources', error);
  }

  if (options.exitProcess) {
    process.exit(0);
  }
};

export const registerWorkerSignalHandlers = (): void => {
  process.on('SIGTERM', () => {
    void stopWorker('SIGTERM', { exitProcess: true });
  });
  process.on('SIGINT', () => {
    void stopWorker('SIGINT', { exitProcess: true });
  });
};

const isWorkerEntrypoint = (): boolean => /(?:^|[/\\])worker\.(?:ts|js)$/.test(process.argv[1] ?? '');

if (isWorkerEntrypoint()) {
  registerWorkerSignalHandlers();
  void startWorker({ exitOnFailure: true });
}
