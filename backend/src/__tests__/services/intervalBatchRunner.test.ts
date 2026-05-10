import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';
import { schedulerHealthService } from '@services/queue/schedulerHealthService';

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

const flushMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) {
    await Promise.resolve();
  }
};

describe('IntervalBatchRunner', () => {
  const mockSchedulerHealthService = schedulerHealthService as jest.Mocked<
    typeof schedulerHealthService
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('prevents overlapping ticks while a batch is still in flight', async () => {
    jest.useFakeTimers();

    let resolveBatch: ((value: number) => void) | null = null;
    const runBatch = jest.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveBatch = resolve;
        })
    );

    const runner = new IntervalBatchRunner({
      name: 'Overlap Test Runner',
      healthName: 'test_runner',
      intervalMs: 1000,
      runBatch,
    });

    runner.start();
    await flushMicrotasks();

    expect(runBatch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(3000);
    await flushMicrotasks();

    expect(runBatch).toHaveBeenCalledTimes(1);

    resolveBatch?.(1);
    await flushMicrotasks();

    await jest.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();

    expect(runBatch).toHaveBeenCalledTimes(2);

    runner.stop();
  });

  it('handles batch errors without throwing to callers', async () => {
    const runBatch = jest
      .fn<Promise<number>, []>()
      .mockRejectedValueOnce(new Error('batch-failure'))
      .mockResolvedValueOnce(2);

    const runner = new IntervalBatchRunner({
      name: 'Error Test Runner',
      healthName: 'test_runner',
      intervalMs: 1000,
      runBatch,
    });

    const first = await runner.tick();
    const second = await runner.tick();

    expect(first).toBe(0);
    expect(second).toBe(2);
  });

  it('supports start/stop lifecycle with immediate and interval ticks', async () => {
    jest.useFakeTimers();

    const runBatch = jest.fn<Promise<number>, []>().mockResolvedValue(1);

    const runner = new IntervalBatchRunner({
      name: 'Lifecycle Test Runner',
      healthName: 'test_runner',
      intervalMs: 1000,
      runBatch,
    });

    runner.start();
    await flushMicrotasks();
    expect(runBatch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();
    expect(runBatch).toHaveBeenCalledTimes(2);

    runner.stop();

    await jest.advanceTimersByTimeAsync(3000);
    await flushMicrotasks();
    expect(runBatch).toHaveBeenCalledTimes(2);
  });

  it('delays the first tick by startup jitter before starting the interval cadence', async () => {
    jest.useFakeTimers();
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const runBatch = jest.fn<Promise<number>, []>().mockResolvedValue(1);

    const runner = new IntervalBatchRunner({
      name: 'Jitter Test Runner',
      healthName: 'test_runner',
      intervalMs: 1000,
      startupJitterMs: 500,
      runBatch,
    });

    runner.start();
    await flushMicrotasks();
    expect(runBatch).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(249);
    await flushMicrotasks();
    expect(runBatch).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    await flushMicrotasks();
    expect(runBatch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();
    expect(runBatch).toHaveBeenCalledTimes(2);

    runner.stop();
    randomSpy.mockRestore();
  });

  it('can stop a startup-jittered runner before the first tick starts', async () => {
    jest.useFakeTimers();
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);

    const runBatch = jest.fn<Promise<number>, []>().mockResolvedValue(1);

    const runner = new IntervalBatchRunner({
      name: 'Jitter Stop Test Runner',
      healthName: 'test_runner',
      intervalMs: 1000,
      startupJitterMs: 1000,
      runBatch,
    });

    runner.start();
    runner.stop();

    await jest.advanceTimersByTimeAsync(2000);
    await flushMicrotasks();

    expect(runBatch).not.toHaveBeenCalled();
    randomSpy.mockRestore();
  });

  it('retries failed batches with bounded attempts', async () => {
    const runBatch = jest
      .fn<Promise<number>, []>()
      .mockRejectedValueOnce(new Error('retry-me'))
      .mockResolvedValueOnce(3);

    const runner = new IntervalBatchRunner({
      name: 'Retry Test Runner',
      healthName: 'test_runner',
      intervalMs: 1000,
      runBatch,
      retryAttempts: 1,
      retryDelayMs: 0,
    });

    const processed = await runner.tick();

    expect(processed).toBe(3);
    expect(runBatch).toHaveBeenCalledTimes(2);
  });

  it('enforces timeout guardrail for long-running batches', async () => {
    jest.useFakeTimers();

    const runBatch = jest.fn(
      () =>
        new Promise<number>(() => {
          // intentionally unresolved
        })
    );

    const runner = new IntervalBatchRunner({
      name: 'Timeout Test Runner',
      healthName: 'test_runner',
      intervalMs: 1000,
      runBatch,
      timeoutMs: 50,
    });

    const tickPromise = runner.tick();
    await jest.advanceTimersByTimeAsync(60);
    await flushMicrotasks();

    await expect(tickPromise).resolves.toBe(0);
  });

  it('keeps timed-out batches in flight until the original batch settles', async () => {
    jest.useFakeTimers();

    let resolveBatch: ((value: number) => void) | null = null;
    const runBatch = jest.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveBatch = resolve;
        })
    );

    const runner = new IntervalBatchRunner({
      name: 'Timeout Overlap Test Runner',
      healthName: 'test_runner',
      intervalMs: 1000,
      runBatch,
      timeoutMs: 50,
    });

    const tickPromise = runner.tick();
    await jest.advanceTimersByTimeAsync(60);
    await flushMicrotasks();

    await expect(tickPromise).resolves.toBe(0);
    expect(runBatch).toHaveBeenCalledTimes(1);

    await expect(runner.tick()).resolves.toBe(0);
    expect(runBatch).toHaveBeenCalledTimes(1);

    resolveBatch?.(1);
    await flushMicrotasks();

    const nextTickPromise = runner.tick();
    await jest.advanceTimersByTimeAsync(60);
    await flushMicrotasks();

    await expect(nextTickPromise).resolves.toBe(0);
    expect(runBatch).toHaveBeenCalledTimes(2);
  });

  it('records tick health transitions with the configured scheduler name', async () => {
    const runBatch = jest.fn<Promise<number>, []>().mockResolvedValue(4);

    const runner = new IntervalBatchRunner({
      name: 'Health Test Runner',
      healthName: 'health_test_runner',
      intervalMs: 1000,
      runBatch,
    });

    await expect(runner.tick()).resolves.toBe(4);

    expect(mockSchedulerHealthService.recordTickStarted).toHaveBeenCalledWith('health_test_runner');
    expect(mockSchedulerHealthService.recordTickSucceeded).toHaveBeenCalledWith(
      'health_test_runner',
      4
    );
    expect(mockSchedulerHealthService.recordTickFailed).not.toHaveBeenCalled();
  });
});
