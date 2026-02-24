import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('IntervalBatchRunner', () => {
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
      intervalMs: 1000,
      runBatch,
    });

    runner.start();
    await flushMicrotasks();

    expect(runBatch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(3000);
    await flushMicrotasks();

    expect(runBatch).toHaveBeenCalledTimes(1);

    resolveBatch?.(1);
    await flushMicrotasks();

    jest.advanceTimersByTime(1000);
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
      intervalMs: 1000,
      runBatch,
    });

    runner.start();
    await flushMicrotasks();
    expect(runBatch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await flushMicrotasks();
    expect(runBatch).toHaveBeenCalledTimes(2);

    runner.stop();

    jest.advanceTimersByTime(3000);
    await flushMicrotasks();
    expect(runBatch).toHaveBeenCalledTimes(2);
  });
});
