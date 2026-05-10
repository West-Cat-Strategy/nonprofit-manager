import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';
import { reportExportJobService } from '@services/reportExportJobService';
import {
  REPORT_EXPORT_JOB_SCHEDULER_HEALTH_NAME,
  reportExportJobSchedulerService,
} from '@services/reportExportJobSchedulerService';

const mockStart = jest.fn();
const mockStop = jest.fn();
const mockTick = jest.fn();

jest.mock('@services/reportExportJobService', () => ({
  reportExportJobService: {
    processPendingJobs: jest.fn(),
  },
}));

jest.mock('@services/queue/intervalBatchRunner', () => ({
  IntervalBatchRunner: jest.fn().mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
    tick: mockTick,
  })),
}));

describe('reportExportJobSchedulerService', () => {
  const mockReportExportJobService = reportExportJobService as jest.Mocked<
    typeof reportExportJobService
  >;
  const mockIntervalBatchRunner = IntervalBatchRunner as jest.MockedClass<
    typeof IntervalBatchRunner
  >;

  const originalEnv = {
    REPORT_EXPORT_JOB_SCHEDULER_INTERVAL_MS:
      process.env.REPORT_EXPORT_JOB_SCHEDULER_INTERVAL_MS,
    REPORT_EXPORT_JOB_SCHEDULER_BATCH_SIZE:
      process.env.REPORT_EXPORT_JOB_SCHEDULER_BATCH_SIZE,
    REPORT_EXPORT_JOB_SCHEDULER_RETRY_ATTEMPTS:
      process.env.REPORT_EXPORT_JOB_SCHEDULER_RETRY_ATTEMPTS,
    REPORT_EXPORT_JOB_SCHEDULER_RETRY_DELAY_MS:
      process.env.REPORT_EXPORT_JOB_SCHEDULER_RETRY_DELAY_MS,
    REPORT_EXPORT_JOB_SCHEDULER_TIMEOUT_MS:
      process.env.REPORT_EXPORT_JOB_SCHEDULER_TIMEOUT_MS,
    REPORT_EXPORT_JOB_SCHEDULER_STARTUP_JITTER_MS:
      process.env.REPORT_EXPORT_JOB_SCHEDULER_STARTUP_JITTER_MS,
    REPORT_EXPORT_JOB_SCHEDULER_FAILED_RETRY_LIMIT:
      process.env.REPORT_EXPORT_JOB_SCHEDULER_FAILED_RETRY_LIMIT,
    REPORT_EXPORT_JOB_SCHEDULER_FAILED_RETRY_DELAY_MS:
      process.env.REPORT_EXPORT_JOB_SCHEDULER_FAILED_RETRY_DELAY_MS,
  };

  const restoreEnv = (): void => {
    (Object.keys(originalEnv) as Array<keyof typeof originalEnv>).forEach((key) => {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  };

  beforeEach(() => {
    restoreEnv();
    jest.clearAllMocks();
    reportExportJobSchedulerService.stop();
  });

  afterEach(() => {
    reportExportJobSchedulerService.stop();
    restoreEnv();
  });

  it('exposes the report export job scheduler health name', () => {
    expect(reportExportJobSchedulerService.healthName).toBe(REPORT_EXPORT_JOB_SCHEDULER_HEALTH_NAME);
  });

  it('processes pending report export jobs with the default batch size when ticked directly', async () => {
    mockReportExportJobService.processPendingJobs.mockResolvedValue(3);

    await expect(reportExportJobSchedulerService.tick()).resolves.toBe(3);

    expect(mockReportExportJobService.processPendingJobs).toHaveBeenCalledWith(5, {
      failedRetryLimit: 1,
      failedRetryDelayMs: 300000,
    });
  });

  it('passes env-tuned cadence, retry, timeout, jitter, and batch size to the runner', async () => {
    process.env.REPORT_EXPORT_JOB_SCHEDULER_INTERVAL_MS = '15000';
    process.env.REPORT_EXPORT_JOB_SCHEDULER_BATCH_SIZE = '2';
    process.env.REPORT_EXPORT_JOB_SCHEDULER_RETRY_ATTEMPTS = '3';
    process.env.REPORT_EXPORT_JOB_SCHEDULER_RETRY_DELAY_MS = '400';
    process.env.REPORT_EXPORT_JOB_SCHEDULER_TIMEOUT_MS = '90000';
    process.env.REPORT_EXPORT_JOB_SCHEDULER_STARTUP_JITTER_MS = '2500';
    process.env.REPORT_EXPORT_JOB_SCHEDULER_FAILED_RETRY_LIMIT = '2';
    process.env.REPORT_EXPORT_JOB_SCHEDULER_FAILED_RETRY_DELAY_MS = '120000';

    reportExportJobSchedulerService.start();

    expect(mockIntervalBatchRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Report export job scheduler',
        healthName: REPORT_EXPORT_JOB_SCHEDULER_HEALTH_NAME,
        intervalMs: 15000,
        retryAttempts: 3,
        retryDelayMs: 400,
        timeoutMs: 90000,
        startupJitterMs: 2500,
      })
    );
    expect(mockStart).toHaveBeenCalledTimes(1);

    const options = mockIntervalBatchRunner.mock.calls[0][0];
    mockReportExportJobService.processPendingJobs.mockResolvedValue(2);
    await expect(options.runBatch()).resolves.toBe(2);
    expect(mockReportExportJobService.processPendingJobs).toHaveBeenCalledWith(2, {
      failedRetryLimit: 2,
      failedRetryDelayMs: 120000,
    });
  });
});
