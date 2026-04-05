import { doubleCsrf } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import { AUTH_COOKIE_NAME, PORTAL_AUTH_COOKIE_NAME, extractToken } from '@utils/cookieHelper';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Validate CSRF secret in production
const getCsrfSecret = (): string => {
  const secret = process.env.CSRF_SECRET;

  if (isProduction) {
    if (!secret) {
      logger.error('CSRF_SECRET environment variable is required in production');
      throw new Error('CSRF_SECRET environment variable is required in production');
    }
    if (secret.length < 32) {
      logger.error('CSRF_SECRET must be at least 32 characters in production');
      throw new Error('CSRF_SECRET must be at least 32 characters in production');
    }
    if (secret.includes('change') || secret.includes('dev') || secret.includes('test')) {
      logger.warn('CSRF_SECRET appears to contain a placeholder value - please use a secure random secret');
    }
  }

  return secret || 'csrf-secret-dev-only-not-for-production';
};

const getAuthSessionToken = (
  req: Request
): { token: string; prefix: 'auth' | 'portal' } | null => {
  const authToken = extractToken(req.cookies, req.headers.authorization, AUTH_COOKIE_NAME);
  if (authToken) {
    return { token: authToken, prefix: 'auth' };
  }

  const portalAuthToken = extractToken(
    req.cookies,
    req.headers.authorization,
    PORTAL_AUTH_COOKIE_NAME
  );
  if (portalAuthToken) {
    return { token: portalAuthToken, prefix: 'portal' };
  }

  return null;
};

export const resolveCsrfSessionIdentifier = (req: Request): string => {
  const sessionToken = getAuthSessionToken(req);
  if (sessionToken) {
    return `${sessionToken.prefix}:${sessionToken.token}`;
  }

  // Anonymous and pre-auth requests do not have a stable auth cookie yet.
  // Fall back to the current network fingerprint so token bootstrap still works.
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  return `anon:${ip}-${ua}`;
};

// Configure double-submit cookie CSRF protection
const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: getCsrfSecret,
  // Prefer a stable authenticated session identifier, then fall back to anonymous fingerprinting.
  getSessionIdentifier: resolveCsrfSessionIdentifier,
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    secure: isProduction,
    path: '/',
  },
  size: 64,
  getCsrfTokenFromRequest: (req: Request) => {
    // Check header first (X-CSRF-Token)
    const headerToken = req.headers['x-csrf-token'];
    if (headerToken && typeof headerToken === 'string') {
      return headerToken;
    }
    // Fall back to body
    return req.body?._csrf;
  },
});

// Paths that should skip CSRF protection
const CSRF_SKIP_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/setup',
  '/api/auth/setup-status',
  '/api/auth/passkeys/login/options',
  '/api/auth/passkeys/login/verify',
  '/api/portal/auth/login',
  '/api/portal/auth/signup',
  '/api/portal/auth/register',
  '/api/payments/webhook',
  '/api/v2/auth/login',
  '/api/v2/auth/register',
  '/api/v2/auth/setup',
  '/api/v2/auth/setup-status',
  '/api/v2/auth/passkeys/login/options',
  '/api/v2/auth/passkeys/login/verify',
  '/api/v2/portal/auth/login',
  '/api/v2/portal/auth/signup',
  '/api/v2/portal/auth/register',
  '/api/v2/payments/webhook',
  '/api/v2/public/events',
  '/api/v2/public/forms',
  '/health',
  '/metrics',
];

// Methods that don't need CSRF protection
const CSRF_SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Middleware to conditionally apply CSRF protection
 */
export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF in test environment or if explicitly disabled
  if (isTest || process.env.CSRF_ENABLED === 'false') {
    return next();
  }

  // Skip safe methods
  if (CSRF_SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // Skip specific paths
  const path = req.path;
  const fullPath = req.originalUrl?.split('?')[0] || path;

  for (const skipPath of CSRF_SKIP_PATHS) {
    if (path.startsWith(skipPath) || fullPath.startsWith(skipPath)) {
      return next();
    }
  }

  // Apply CSRF protection
  doubleCsrfProtection(req, res, next);
};

/**
 * Handler to get a new CSRF token
 */
export const getCsrfToken = (req: Request, res: Response): void => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
};

export { generateCsrfToken };
