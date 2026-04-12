import pool from '@config/database';
import { getRedisClient } from '@config/redis';
import { logger } from '@config/logger';
import { errorPayload } from '@utils/responseHelpers';
import {
  ACCOUNT_LOCKOUT_DURATION_MINUTES,
  ACCOUNT_LOCKOUT_DURATION_MS,
  checkAccountLockout,
  getLockoutTimeRemaining,
  MAX_LOGIN_ATTEMPTS,
  isAccountLocked,
  trackLoginAttempt,
} from '@middleware/accountLockout';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('@config/redis', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@utils/responseHelpers', () => ({
  errorPayload: jest.fn(() => ({
    success: false,
    error: { code: 'account_locked', message: 'Account locked' },
  })),
}));

const createResponse = () =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as any;

describe('accountLockout middleware', () => {
  const poolQueryMock = pool.query as jest.MockedFunction<typeof pool.query>;
  const getRedisClientMock = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
  const errorPayloadMock = errorPayload as jest.MockedFunction<typeof errorPayload>;

  beforeEach(() => {
    jest.clearAllMocks();
    getRedisClientMock.mockReturnValue(null as any);
    poolQueryMock.mockResolvedValue({ rows: [], rowCount: 1 } as never);
  });

<<<<<<< HEAD
  beforeAll(() => {
    process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = 'true';
  });

  afterAll(() => {
    process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = 'false';
  });


=======
  afterAll(() => {
    process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = 'true';
  });

>>>>>>> origin/main
  it('tracks failed attempts in memory and locks accounts after threshold', async () => {
    const identifier = `lock-memory-${Date.now()}@example.com`;

    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i += 1) {
      await trackLoginAttempt(identifier, false, 'user-memory', '127.0.0.1');
    }

    expect(await isAccountLocked(identifier)).toBe(true);
    expect(await getLockoutTimeRemaining(identifier)).toBeGreaterThan(0);
    expect(logger.warn).toHaveBeenCalledWith(
      'Account locked due to too many failed login attempts',
      expect.objectContaining({ identifier })
    );
  });

  it('clears attempts on successful login and writes success audit entries', async () => {
    const identifier = `lock-success-${Date.now()}@example.com`;

    await trackLoginAttempt(identifier, false, 'user-success', '10.0.0.1');
    await trackLoginAttempt(identifier, true, 'user-success', '10.0.0.1');

    expect(await isAccountLocked(identifier)).toBe(false);
    expect(poolQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.arrayContaining(['user-success', 'LOGIN_SUCCESS', 'User logged in successfully', '10.0.0.1'])
    );
  });

  it('uses Redis lockout storage when a ready client is available', async () => {
    const redis = {
      isReady: true,
      hGetAll: jest.fn().mockResolvedValue({}),
      hSet: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };
    getRedisClientMock.mockReturnValue(redis as any);

    await trackLoginAttempt('redis-user@example.com', false, 'user-redis', '192.168.1.1');

    expect(redis.hSet).toHaveBeenCalledWith(
      expect.stringContaining('auth:lockout:redis-user@example.com'),
      expect.objectContaining({ attempts: '1' })
    );
    expect(redis.expire).toHaveBeenCalledWith(
      expect.stringContaining('auth:lockout:redis-user@example.com'),
      Math.ceil(ACCOUNT_LOCKOUT_DURATION_MS / 1000)
    );

    await trackLoginAttempt('redis-user@example.com', true, 'user-redis', '192.168.1.1');
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('auth:lockout:redis-user@example.com'));
  });

  it('detects active Redis lockouts and clears expired Redis lockouts', async () => {
    const redis = {
      isReady: true,
      hGetAll: jest
        .fn()
        .mockResolvedValueOnce({
          userId: 'user-redis',
          attempts: '5',
          lockedUntil: String(Date.now() + 120000),
        })
        .mockResolvedValueOnce({
          userId: 'user-redis',
          attempts: '5',
          lockedUntil: String(Date.now() - 1000),
        }),
      hSet: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
    };
    getRedisClientMock.mockReturnValue(redis as any);

    expect(await isAccountLocked('redis-check@example.com')).toBe(true);
    expect(await isAccountLocked('redis-check@example.com')).toBe(false);
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('auth:lockout:redis-check@example.com'));
  });

  it('allows checkAccountLockout to pass through when lockout checks are disabled for tests', async () => {
    process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = 'false';
    const req = { body: { email: 'skip@example.com' } } as any;
    const res = createResponse();
    const next = jest.fn();

    await checkAccountLockout(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = 'true';
  });

  it('returns locked response payload when checkAccountLockout detects a lock', async () => {
    const identifier = `lock-check-${Date.now()}@example.com`;
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i += 1) {
      await trackLoginAttempt(identifier, false, 'user-lock', '127.0.0.1');
    }

    const req = { body: { email: identifier } } as any;
    const res = createResponse();
    const next = jest.fn();

    await checkAccountLockout(req, res, next);

    expect(errorPayloadMock).toHaveBeenCalledWith(
      res,
      'Account locked',
      expect.objectContaining({
        message: expect.stringContaining(`${ACCOUNT_LOCKOUT_DURATION_MINUTES} minutes`),
      }),
      'account_locked'
    );
    expect(res.status).toHaveBeenCalledWith(423);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
