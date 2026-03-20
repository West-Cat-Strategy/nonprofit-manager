import type { NextFunction, Request, Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS, RATE_LIMIT } from '@config/constants';

const mockRateLimit = jest.fn((_options: Record<string, unknown>) => {
  const middleware = (_req: Request, _res: Response, next: NextFunction) => next();
  return middleware;
});

const mockSendError = jest.fn();
const mockGetRedisClient = jest.fn(() => null);

jest.mock('express-rate-limit', () => {
  class MemoryStore {
    init = jest.fn();
    increment = jest.fn();
    decrement = jest.fn();
    resetKey = jest.fn();
  }

  return {
    __esModule: true,
    default: (...args: unknown[]) => mockRateLimit(...args),
    MemoryStore,
  };
});

jest.mock('@config/redis', () => ({
  getRedisClient: (...args: unknown[]) => mockGetRedisClient(...args),
}));

jest.mock('@modules/shared/http/envelope', () => ({
  sendError: (...args: unknown[]) => mockSendError(...args),
}));

describe('rateLimiter defaults', () => {
  const originalEnv = { ...process.env };

  const resetProductionEnv = (): void => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    delete process.env.AUTH_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.REGISTRATION_MAX_ATTEMPTS;
    delete process.env.PUBLIC_EVENT_CHECKIN_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_EVENT_CHECKIN_RATE_LIMIT_MAX_REQUESTS;
  };

  const loadRateLimiterModule = async (): Promise<typeof import('@middleware/rateLimiter')> => {
    jest.resetModules();
    mockRateLimit.mockClear();
    mockSendError.mockClear();
    mockGetRedisClient.mockClear();
    resetProductionEnv();
    return await import('@middleware/rateLimiter');
  };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('configures the higher shared-IP ceilings in production defaults', async () => {
    await loadRateLimiterModule();

    expect(mockRateLimit).toHaveBeenCalledTimes(5);

    const [apiOptions, authOptions, passwordResetOptions, registrationOptions, publicEventOptions] =
      mockRateLimit.mock.calls.map(([options]) => options as Record<string, unknown>);

    expect(apiOptions).toMatchObject({
      windowMs: RATE_LIMIT.WINDOW_MS,
      max: RATE_LIMIT.MAX_REQUESTS,
    });

    expect(authOptions).toMatchObject({
      windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
      max: RATE_LIMIT.AUTH_MAX_ATTEMPTS,
      skipSuccessfulRequests: true,
    });

    expect(passwordResetOptions).toMatchObject({
      windowMs: RATE_LIMIT.PASSWORD_RESET_WINDOW_MS,
      max: RATE_LIMIT.PASSWORD_RESET_MAX_ATTEMPTS,
    });

    expect(registrationOptions).toMatchObject({
      windowMs: RATE_LIMIT.REGISTRATION_WINDOW_MS,
      max: RATE_LIMIT.REGISTRATION_MAX_ATTEMPTS,
    });

    expect(publicEventOptions).toMatchObject({
      windowMs: RATE_LIMIT.PUBLIC_EVENT_CHECKIN_WINDOW_MS,
      max: RATE_LIMIT.PUBLIC_EVENT_CHECKIN_MAX_REQUESTS,
    });
  });

  it('keeps the canonical 429 envelope when the API limiter is exceeded', async () => {
    await loadRateLimiterModule();

    const apiOptions = mockRateLimit.mock.calls[0]?.[0] as
      | {
          handler?: (req: Request, res: Response) => void;
        }
      | undefined;

    expect(apiOptions?.handler).toEqual(expect.any(Function));

    const req = {
      correlationId: 'corr-rate-limit-test',
      rateLimit: {
        resetTime: new Date(Date.now() + 45_000),
      },
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    apiOptions?.handler?.(req, res);

    expect(mockSendError).toHaveBeenCalledWith(
      res,
      'rate_limit_exceeded',
      ERROR_MESSAGES.TOO_MANY_REQUESTS,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      expect.objectContaining({
        strategy: 'api',
        retryAfter: expect.any(String),
        retryAfterSeconds: expect.any(Number),
      }),
      'corr-rate-limit-test'
    );
  });
});
