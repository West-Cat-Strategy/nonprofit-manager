import { drainDueLocalCampaignRuns } from '../services/localCampaignDrainService';
import {
  LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME,
  localCampaignDeliverySchedulerService,
} from '../services/localCampaignDeliverySchedulerService';

jest.mock('../services/localCampaignDrainService', () => ({
  drainDueLocalCampaignRuns: jest.fn().mockResolvedValue(0),
}));

jest.mock('@config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@services/queue/schedulerHealthService', () => ({
  schedulerHealthService: {
    recordTickStarted: jest.fn().mockResolvedValue(undefined),
    recordTickSucceeded: jest.fn().mockResolvedValue(undefined),
    recordTickFailed: jest.fn().mockResolvedValue(undefined),
  },
}));

import { schedulerHealthService } from '@services/queue/schedulerHealthService';

const mockDrainDueLocalCampaignRuns =
  drainDueLocalCampaignRuns as jest.MockedFunction<typeof drainDueLocalCampaignRuns>;
const mockSchedulerHealthService = schedulerHealthService as jest.Mocked<typeof schedulerHealthService>;

const flushMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
};

describe('localCampaignDeliverySchedulerService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockDrainDueLocalCampaignRuns.mockResolvedValue(0);
    mockSchedulerHealthService.recordTickStarted.mockResolvedValue(undefined);
    mockSchedulerHealthService.recordTickSucceeded.mockResolvedValue(undefined);
    mockSchedulerHealthService.recordTickFailed.mockResolvedValue(undefined);
    localCampaignDeliverySchedulerService.stop();
    delete process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_INTERVAL_MS;
    delete process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_BATCH_SIZE;
    delete process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_RETRY_ATTEMPTS;
    delete process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_RETRY_DELAY_MS;
    delete process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_TIMEOUT_MS;
  });

  afterEach(() => {
    localCampaignDeliverySchedulerService.stop();
    jest.useRealTimers();
  });

  it('uses the default batch size when ticking without start', async () => {
    mockDrainDueLocalCampaignRuns.mockResolvedValueOnce(2);

    const processed = await localCampaignDeliverySchedulerService.tick();

    expect(processed).toBe(2);
    expect(mockDrainDueLocalCampaignRuns).toHaveBeenCalledWith(10);
    expect(mockSchedulerHealthService.recordTickStarted).not.toHaveBeenCalled();
  });

  it('starts with env-configured settings and executes immediate and interval ticks', async () => {
    jest.useFakeTimers();
    process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_INTERVAL_MS = '1000';
    process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_BATCH_SIZE = '4';

    localCampaignDeliverySchedulerService.start();
    await flushMicrotasks();

    expect(mockDrainDueLocalCampaignRuns).toHaveBeenCalledWith(4);
    expect(mockDrainDueLocalCampaignRuns).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(mockDrainDueLocalCampaignRuns).toHaveBeenCalledTimes(2);
    expect(mockDrainDueLocalCampaignRuns).toHaveBeenLastCalledWith(4);

    localCampaignDeliverySchedulerService.stop();
    jest.advanceTimersByTime(3000);
    await flushMicrotasks();

    expect(mockDrainDueLocalCampaignRuns).toHaveBeenCalledTimes(2);
  });

  it('passes retry and timeout guardrail settings to the interval runner', async () => {
    jest.useFakeTimers();
    process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_INTERVAL_MS = '3000';
    process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_BATCH_SIZE = '6';
    process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_RETRY_ATTEMPTS = '3';
    process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_RETRY_DELAY_MS = '250';
    process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_TIMEOUT_MS = '12000';

    localCampaignDeliverySchedulerService.start();
    await flushMicrotasks();

    const runner = (localCampaignDeliverySchedulerService as any).runner;
    expect(runner).toBeTruthy();
    expect(runner.intervalMs).toBe(3000);
    expect(runner.retryAttempts).toBe(3);
    expect(runner.retryDelayMs).toBe(250);
    expect(runner.timeoutMs).toBe(12000);

    expect(mockDrainDueLocalCampaignRuns).toHaveBeenCalledWith(6);
    expect(mockSchedulerHealthService.recordTickStarted).toHaveBeenCalledWith(
      LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME
    );
    expect(mockSchedulerHealthService.recordTickSucceeded).toHaveBeenCalledWith(
      LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME,
      expect.any(Number)
    );
  });
});
