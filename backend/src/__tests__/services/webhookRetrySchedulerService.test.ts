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
  await Promise.resolve();
  await Promise.resolve();
};

describe('webhookRetrySchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    webhookRetrySchedulerService.stop();
    delete process.env.WEBHOOK_RETRY_SCHEDULER_INTERVAL_MS;
    delete process.env.WEBHOOK_RETRY_SCHEDULER_BATCH_SIZE;
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
});
