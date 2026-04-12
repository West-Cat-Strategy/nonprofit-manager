import {
  closeRedis,
  deleteCachedPattern,
  initializeRedis,
  scanAndDeleteByPattern,
} from '@config/redis';

const mockRedisClient = {
  isReady: true,
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  scanIterator: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const asyncChunks = (chunks: string[][]): AsyncIterable<string[]> => ({
  async *[Symbol.asyncIterator]() {
    for (const chunk of chunks) {
      yield chunk;
    }
  },
});

describe('redis pattern deletion helpers', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.REDIS_ENABLED = 'true';
    process.env.REDIS_URL = 'redis://localhost:6379';
    mockRedisClient.isReady = true;
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.quit.mockResolvedValue('OK');
    await closeRedis();
    await initializeRedis();
  });

  afterEach(async () => {
    await closeRedis();
  });

  it('deletes matching keys with SCAN iterator in batches', async () => {
    mockRedisClient.scanIterator.mockReturnValueOnce(
      asyncChunks([['cache:a', 'cache:b'], ['cache:c']])
    );
    mockRedisClient.del.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const deleted = await scanAndDeleteByPattern('cache:*', {
      scanCount: 100,
      deleteBatchSize: 2,
    });

    expect(deleted).toBe(3);
    expect(mockRedisClient.scanIterator).toHaveBeenCalledWith({
      MATCH: 'cache:*',
      COUNT: 100,
    });
    expect(mockRedisClient.del).toHaveBeenNthCalledWith(1, ['cache:a', 'cache:b']);
    expect(mockRedisClient.del).toHaveBeenNthCalledWith(2, ['cache:c']);
  });

  it('deleteCachedPattern delegates to scan-based deletion', async () => {
    mockRedisClient.scanIterator.mockReturnValueOnce(asyncChunks([['site:a']]));
    mockRedisClient.del.mockResolvedValueOnce(1);

    await expect(deleteCachedPattern('site:*')).resolves.toBe(1);
    expect(mockRedisClient.scanIterator).toHaveBeenCalledWith({
      MATCH: 'site:*',
      COUNT: 200,
    });
  });

  it('returns 0 when redis scan/delete fails', async () => {
    mockRedisClient.scanIterator.mockImplementationOnce(() => {
      throw new Error('scan failure');
    });

    await expect(scanAndDeleteByPattern('cache:*')).resolves.toBe(0);
    expect(mockRedisClient.del).not.toHaveBeenCalled();
  });

  it('stays disabled in test env unless redis is explicitly enabled with a url', async () => {
    await closeRedis();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    delete process.env.REDIS_ENABLED;
    delete process.env.REDIS_URL;

    await initializeRedis();

    expect(mockRedisClient.connect).not.toHaveBeenCalled();
    expect(mockRedisClient.on).not.toHaveBeenCalled();
  });
});
