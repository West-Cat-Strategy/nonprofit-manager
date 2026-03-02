import { webhookRetrySchedulerService } from '@services/webhookRetrySchedulerService';
import { processRetries } from '@services/webhookService';

jest.mock('@services/webhookService', () => ({
  processRetries: jest.fn().mockResolvedValue(0),
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockProcessRetries = processRetries as jest.MockedFunction<typeof processRetries>;

const flushMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) {
    await Promise.resolve();
  }
};

describe('webhookRetrySchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    webhookRetrySchedulerService.stop();
    delete process.env.WEBHOOK_RETRY_SCHEDULER_INTERVAL_MS;
    delete process.env.WEBHOOK_RETRY_SCHEDULER_BATCH_SIZE;
    delete process.env.WEBHOOK_RETRY_SCHEDULER_RETRY_ATTEMPTS;
    delete process.env.WEBHOOK_RETRY_SCHEDULER_RETRY_DELAY_MS;
    delete process.env.WEBHOOK_RETRY_SCHEDULER_TIMEOUT_MS;
  });

  afterEach(() => {
    webhookRetrySchedulerService.stop();
    jest.useRealTimers();
  });

  it('uses default batch size when ticking without start', async () => {
    await webhookRetrySchedulerService.tick();

    expect(mockProcessRetries).toHaveBeenCalledWith(100);
  });

  it('starts with env-configured settings and executes immediate + interval ticks', async () => {
    jest.useFakeTimers();
    process.env.WEBHOOK_RETRY_SCHEDULER_INTERVAL_MS = '1000';
    process.env.WEBHOOK_RETRY_SCHEDULER_BATCH_SIZE = '7';

    webhookRetrySchedulerService.start();
    await flushMicrotasks();

    expect(mockProcessRetries).toHaveBeenCalledWith(7);
    expect(mockProcessRetries).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(mockProcessRetries).toHaveBeenCalledTimes(2);
    expect(mockProcessRetries).toHaveBeenLastCalledWith(7);

    webhookRetrySchedulerService.stop();
    jest.advanceTimersByTime(3000);
    await flushMicrotasks();

    expect(mockProcessRetries).toHaveBeenCalledTimes(2);
  });

  it('passes retry and timeout guardrail settings to interval runner', async () => {
    jest.useFakeTimers();
    process.env.WEBHOOK_RETRY_SCHEDULER_INTERVAL_MS = '3000';
    process.env.WEBHOOK_RETRY_SCHEDULER_BATCH_SIZE = '11';
    process.env.WEBHOOK_RETRY_SCHEDULER_RETRY_ATTEMPTS = '3';
    process.env.WEBHOOK_RETRY_SCHEDULER_RETRY_DELAY_MS = '250';
    process.env.WEBHOOK_RETRY_SCHEDULER_TIMEOUT_MS = '12000';

    webhookRetrySchedulerService.start();
    await flushMicrotasks();

    const runner = (webhookRetrySchedulerService as any).runner;
    expect(runner).toBeTruthy();
    expect(runner.intervalMs).toBe(3000);
    expect(runner.retryAttempts).toBe(3);
    expect(runner.retryDelayMs).toBe(250);
    expect(runner.timeoutMs).toBe(12000);

    expect(mockProcessRetries).toHaveBeenCalledWith(11);
  });
});
