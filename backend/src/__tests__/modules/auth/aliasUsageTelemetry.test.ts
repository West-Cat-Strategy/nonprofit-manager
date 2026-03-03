import type { NextFunction, Request, Response } from 'express';
import { logger } from '@config/logger';
import { aliasUsageTelemetry } from '@modules/auth/middleware/aliasUsageTelemetry';
import { createAuthRoutes } from '@modules/auth/routes';

describe('auth alias usage telemetry middleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits auth.alias_input_used when alias fields are used', () => {
    const loggerSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    const middleware = aliasUsageTelemetry({
      route: '/api/v2/auth/register',
      aliasFields: ['first_name', 'last_name', 'password_confirm'],
    });

    const req = {
      body: { first_name: 'Ada', email: 'ada@example.com' },
      headers: { 'user-agent': 'jest-agent' },
      correlationId: 'corr-auth-alias',
    } as unknown as Request;

    const next = jest.fn() as NextFunction;
    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(
      'auth.alias_input_used',
      expect.objectContaining({
        event: 'auth.alias_input_used',
        route: '/api/v2/auth/register',
        aliasFields: ['first_name'],
        correlationId: 'corr-auth-alias',
        userAgent: 'jest-agent',
      })
    );
  });

  it('does not emit telemetry for canonical-only payloads', () => {
    const loggerSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    const middleware = aliasUsageTelemetry({
      route: '/api/v2/auth/password',
      aliasFields: ['current_password', 'new_password', 'new_password_confirm'],
    });

    const req = {
      body: {
        currentPassword: 'current-pass',
        newPassword: 'new-password',
        newPasswordConfirm: 'new-password',
      },
      headers: { 'user-agent': 'jest-agent' },
      correlationId: 'corr-auth-canonical',
    } as unknown as Request;

    const next = jest.fn() as NextFunction;
    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalled();
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  it('attaches middleware on register/setup/password routes', () => {
    const router = createAuthRoutes('v2') as unknown as {
      stack: Array<{
        route?: {
          path?: string;
          methods?: Record<string, boolean>;
          stack?: Array<{ handle: { __aliasUsageTelemetry?: boolean } }>;
        };
      }>;
    };

    const hasAliasMiddleware = (path: string, method: 'post' | 'put') => {
      const layer = router.stack.find(
        (entry) => entry.route?.path === path && entry.route?.methods?.[method]
      );
      return Boolean(
        layer?.route?.stack?.some((stackEntry) => stackEntry.handle.__aliasUsageTelemetry === true)
      );
    };

    expect(hasAliasMiddleware('/register', 'post')).toBe(true);
    expect(hasAliasMiddleware('/setup', 'post')).toBe(true);
    expect(hasAliasMiddleware('/password', 'put')).toBe(true);
  });
});
