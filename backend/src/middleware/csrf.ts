import { doubleCsrf } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Configure double-submit cookie CSRF protection
const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'csrf-secret-change-in-production',
  // Use IP + User-Agent as session identifier (stateless)
  getSessionIdentifier: (req: Request) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    return `${ip}-${ua}`;
  },
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
  '/api/portal/auth/register',
  '/api/payments/webhook',
  '/api/webhooks',
  '/health',
  '/metrics',
];

// Methods that don't need CSRF protection
const CSRF_SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Middleware to conditionally apply CSRF protection
 */
export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF in test environment
  if (isTest) {
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
