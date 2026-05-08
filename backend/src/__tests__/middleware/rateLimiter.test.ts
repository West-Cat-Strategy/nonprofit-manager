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

  const resetProductionEnv = (overrides: Record<string, string> = {}): void => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    delete process.env.AUTH_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.REGISTRATION_MAX_ATTEMPTS;
    delete process.env.REGISTRATION_RATE_LIMIT_WINDOW_MS;
    delete process.env.REGISTRATION_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PUBLIC_EVENT_CHECKIN_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_EVENT_CHECKIN_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.MAILCHIMP_WEBHOOK_RATE_LIMIT_WINDOW_MS;
    delete process.env.MAILCHIMP_WEBHOOK_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PUBLIC_WEBSITE_FORM_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_WEBSITE_FORM_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PUBLIC_WEBSITE_ACTION_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_WEBSITE_ACTION_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PUBLIC_NEWSLETTER_CONFIRM_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_NEWSLETTER_CONFIRM_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PUBLIC_SITE_ANALYTICS_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_SITE_ANALYTICS_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PUBLIC_CASE_FORM_DRAFT_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_CASE_FORM_DRAFT_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PUBLIC_CASE_FORM_SUBMIT_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_CASE_FORM_SUBMIT_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PUBLIC_CASE_FORM_ASSET_RATE_LIMIT_WINDOW_MS;
    delete process.env.PUBLIC_CASE_FORM_ASSET_RATE_LIMIT_MAX_REQUESTS;
    Object.assign(process.env, overrides);
  };

  const loadRateLimiterModule = async (
    overrides: Record<string, string> = {}
  ): Promise<typeof import('@middleware/rateLimiter')> => {
    jest.resetModules();
    mockRateLimit.mockClear();
    mockSendError.mockClear();
    mockGetRedisClient.mockClear();
    resetProductionEnv(overrides);
    return await import('@middleware/rateLimiter');
  };

  const loadTestRateLimiterModule = async (): Promise<typeof import('@middleware/rateLimiter')> => {
    jest.resetModules();
    mockRateLimit.mockClear();
    mockSendError.mockClear();
    mockGetRedisClient.mockClear();
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    return await import('@middleware/rateLimiter');
  };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('configures the higher shared-IP ceilings in production defaults', async () => {
    await loadRateLimiterModule();

    expect(mockRateLimit).toHaveBeenCalledTimes(14);

    const [
      apiOptions,
      authOptions,
      passwordResetOptions,
      registrationOptions,
      publicEventOptions,
      mailchimpWebhookOptions,
      publicEventRegistrationOptions,
      publicWebsiteFormOptions,
      publicWebsiteActionOptions,
      publicNewsletterConfirmationOptions,
      publicSiteAnalyticsOptions,
      publicCaseFormDraftOptions,
      publicCaseFormSubmitOptions,
      publicCaseFormAssetOptions,
    ] =
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

    expect(mailchimpWebhookOptions).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 60,
    });

    expect(publicEventRegistrationOptions).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 60,
    });

    expect(publicWebsiteFormOptions).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 60,
    });

    expect(publicWebsiteActionOptions).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 60,
    });

    expect(publicNewsletterConfirmationOptions).toMatchObject({
      windowMs: 15 * 60 * 1000,
      max: 30,
    });

    expect(publicSiteAnalyticsOptions).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 240,
    });

    expect(publicCaseFormDraftOptions).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 120,
    });

    expect(publicCaseFormSubmitOptions).toMatchObject({
      windowMs: 15 * 60 * 1000,
      max: 30,
    });

    expect(publicCaseFormAssetOptions).toMatchObject({
      windowMs: 15 * 60 * 1000,
      max: 20,
    });
  });

  it('honors explicit env overrides for the production ceilings', async () => {
    await loadRateLimiterModule({
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX_REQUESTS: '9001',
      AUTH_RATE_LIMIT_WINDOW_MS: '60000',
      AUTH_RATE_LIMIT_MAX_REQUESTS: '45',
      REGISTRATION_MAX_ATTEMPTS: '80',
      REGISTRATION_RATE_LIMIT_WINDOW_MS: '1',
      REGISTRATION_RATE_LIMIT_MAX_REQUESTS: '2',
      PUBLIC_EVENT_CHECKIN_RATE_LIMIT_WINDOW_MS: '120000',
      PUBLIC_EVENT_CHECKIN_RATE_LIMIT_MAX_REQUESTS: '320',
      MAILCHIMP_WEBHOOK_RATE_LIMIT_WINDOW_MS: '121000',
      MAILCHIMP_WEBHOOK_RATE_LIMIT_MAX_REQUESTS: '321',
      PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_WINDOW_MS: '122000',
      PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX_REQUESTS: '322',
      PUBLIC_WEBSITE_FORM_RATE_LIMIT_WINDOW_MS: '180000',
      PUBLIC_WEBSITE_FORM_RATE_LIMIT_MAX_REQUESTS: '31',
      PUBLIC_WEBSITE_ACTION_RATE_LIMIT_WINDOW_MS: '181000',
      PUBLIC_WEBSITE_ACTION_RATE_LIMIT_MAX_REQUESTS: '32',
      PUBLIC_NEWSLETTER_CONFIRM_RATE_LIMIT_WINDOW_MS: '182000',
      PUBLIC_NEWSLETTER_CONFIRM_RATE_LIMIT_MAX_REQUESTS: '33',
      PUBLIC_SITE_ANALYTICS_RATE_LIMIT_WINDOW_MS: '183000',
      PUBLIC_SITE_ANALYTICS_RATE_LIMIT_MAX_REQUESTS: '34',
      PUBLIC_CASE_FORM_DRAFT_RATE_LIMIT_WINDOW_MS: '184000',
      PUBLIC_CASE_FORM_DRAFT_RATE_LIMIT_MAX_REQUESTS: '35',
      PUBLIC_CASE_FORM_SUBMIT_RATE_LIMIT_WINDOW_MS: '185000',
      PUBLIC_CASE_FORM_SUBMIT_RATE_LIMIT_MAX_REQUESTS: '36',
      PUBLIC_CASE_FORM_ASSET_RATE_LIMIT_WINDOW_MS: '186000',
      PUBLIC_CASE_FORM_ASSET_RATE_LIMIT_MAX_REQUESTS: '37',
    });

    expect(mockRateLimit).toHaveBeenCalledTimes(14);

    const [
      apiOptions,
      authOptions,
      passwordResetOptions,
      registrationOptions,
      publicEventOptions,
      mailchimpWebhookOptions,
      publicEventRegistrationOptions,
      publicWebsiteFormOptions,
      publicWebsiteActionOptions,
      publicNewsletterConfirmationOptions,
      publicSiteAnalyticsOptions,
      publicCaseFormDraftOptions,
      publicCaseFormSubmitOptions,
      publicCaseFormAssetOptions,
    ] =
      mockRateLimit.mock.calls.map(([options]) => options as Record<string, unknown>);

    expect(apiOptions).toMatchObject({
      windowMs: 60000,
      max: 9001,
    });

    expect(authOptions).toMatchObject({
      windowMs: 60000,
      max: 45,
    });

    expect(passwordResetOptions).toMatchObject({
      windowMs: RATE_LIMIT.PASSWORD_RESET_WINDOW_MS,
      max: RATE_LIMIT.PASSWORD_RESET_MAX_ATTEMPTS,
    });

    expect(registrationOptions).toMatchObject({
      windowMs: RATE_LIMIT.REGISTRATION_WINDOW_MS,
      max: 80,
    });

    expect(publicEventOptions).toMatchObject({
      windowMs: 120000,
      max: 320,
    });

    expect(mailchimpWebhookOptions).toMatchObject({
      windowMs: 121000,
      max: 321,
    });

    expect(publicEventRegistrationOptions).toMatchObject({
      windowMs: 122000,
      max: 322,
    });

    expect(publicWebsiteFormOptions).toMatchObject({
      windowMs: 180000,
      max: 31,
    });

    expect(publicWebsiteActionOptions).toMatchObject({
      windowMs: 181000,
      max: 32,
    });

    expect(publicNewsletterConfirmationOptions).toMatchObject({
      windowMs: 182000,
      max: 33,
    });

    expect(publicSiteAnalyticsOptions).toMatchObject({
      windowMs: 183000,
      max: 34,
    });

    expect(publicCaseFormDraftOptions).toMatchObject({
      windowMs: 184000,
      max: 35,
    });

    expect(publicCaseFormSubmitOptions).toMatchObject({
      windowMs: 185000,
      max: 36,
    });

    expect(publicCaseFormAssetOptions).toMatchObject({
      windowMs: 186000,
      max: 37,
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

  it('keeps the canonical 429 envelope for public write limiters', async () => {
    await loadRateLimiterModule();

    const publicFormOptions = mockRateLimit.mock.calls[7]?.[0] as
      | {
          handler?: (req: Request, res: Response) => void;
        }
      | undefined;

    expect(publicFormOptions?.handler).toEqual(expect.any(Function));

    const req = {
      correlationId: 'corr-public-write-limit-test',
      rateLimit: {
        resetTime: new Date(Date.now() + 30_000),
      },
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    publicFormOptions?.handler?.(req, res);

    expect(mockSendError).toHaveBeenCalledWith(
      res,
      'rate_limit_exceeded',
      ERROR_MESSAGES.TOO_MANY_REQUESTS,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      expect.objectContaining({
        strategy: 'public_website_form',
        retryAfter: expect.any(String),
        retryAfterSeconds: expect.any(Number),
      }),
      'corr-public-write-limit-test'
    );
  });

  it('keeps public write middleware as no-ops in test env', async () => {
    const module = await loadTestRateLimiterModule();
    const next = jest.fn();

    module.publicWebsiteFormLimiterMiddleware({} as Request, {} as Response, next);
    module.publicWebsiteActionLimiterMiddleware({} as Request, {} as Response, next);
    module.publicNewsletterConfirmationLimiterMiddleware({} as Request, {} as Response, next);
    module.publicSiteAnalyticsLimiterMiddleware({} as Request, {} as Response, next);
    module.mailchimpWebhookLimiterMiddleware({} as Request, {} as Response, next);
    module.publicEventRegistrationLimiterMiddleware({} as Request, {} as Response, next);
    module.publicCaseFormDraftLimiterMiddleware({} as Request, {} as Response, next);
    module.publicCaseFormSubmitLimiterMiddleware({} as Request, {} as Response, next);
    module.publicCaseFormAssetLimiterMiddleware({} as Request, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(9);
    expect(module.publicWebsiteFormLimiterMiddleware).not.toBe(module.publicWebsiteFormLimiter);
    expect(module.publicWebsiteActionLimiterMiddleware).not.toBe(module.publicWebsiteActionLimiter);
    expect(module.publicNewsletterConfirmationLimiterMiddleware).not.toBe(
      module.publicNewsletterConfirmationLimiter
    );
    expect(module.publicSiteAnalyticsLimiterMiddleware).not.toBe(module.publicSiteAnalyticsLimiter);
    expect(module.mailchimpWebhookLimiterMiddleware).not.toBe(module.mailchimpWebhookLimiter);
    expect(module.publicEventRegistrationLimiterMiddleware).not.toBe(
      module.publicEventRegistrationLimiter
    );
    expect(module.publicCaseFormDraftLimiterMiddleware).not.toBe(module.publicCaseFormDraftLimiter);
    expect(module.publicCaseFormSubmitLimiterMiddleware).not.toBe(module.publicCaseFormSubmitLimiter);
    expect(module.publicCaseFormAssetLimiterMiddleware).not.toBe(module.publicCaseFormAssetLimiter);
  });

  it('skips startup auth and CSRF read-only checks in the shared API limiter', async () => {
    await loadRateLimiterModule();

    const apiOptions = mockRateLimit.mock.calls[0]?.[0] as
      | {
          skip?: (req: Request) => boolean;
        }
      | undefined;

    expect(apiOptions?.skip).toEqual(expect.any(Function));

    const makeRequest = (path: string) =>
      ({
        method: 'GET',
        path,
        originalUrl: path,
        ip: '203.0.113.10',
        connection: { remoteAddress: '203.0.113.10' },
      }) as Request;

    expect(apiOptions?.skip?.(makeRequest('/api/v2/auth/bootstrap'))).toBe(true);
    expect(apiOptions?.skip?.(makeRequest('/api/v2/auth/setup-status'))).toBe(true);
    expect(apiOptions?.skip?.(makeRequest('/api/v2/auth/registration-status'))).toBe(true);
    expect(apiOptions?.skip?.(makeRequest('/api/v2/auth/csrf-token'))).toBe(true);
    expect(apiOptions?.skip?.(makeRequest('/api/v2/portal/auth/bootstrap'))).toBe(true);
    expect(apiOptions?.skip?.(makeRequest('/api/v2/dashboard'))).toBe(false);
  });
});
