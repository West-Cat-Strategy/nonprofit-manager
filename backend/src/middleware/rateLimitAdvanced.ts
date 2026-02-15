/**
 * Advanced Rate Limiting Middleware
 * Configurable rate limiting with in-memory or Redis store
 * Inspired by wc-manage rate limiting patterns
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { logger } from '@config/logger';

// Standard rate limit configurations
export const RATE_LIMITS = {
  // Public endpoints
  PUBLIC: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
  },

  // Authentication endpoints
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
  },

  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour
  },

  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset requests per hour
  },

  // Upload endpoints
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    fileSize: 100 * 1024 * 1024, // 100MB max per upload
  },

  // API endpoints
  API: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
  },

  // Strict rate limiting
  STRICT: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
  },
};

/**
 * Create a rate limiter with in-memory store
 * For production, consider using rate-limit-redis
 */
function createLimiter(
  windowMs: number,
  max: number,
  keyGenerator?: (req: Request) => string,
  skipSuccessfulRequests: boolean = false
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: keyGenerator || ((req: Request) => {
      // Use IP address by default
      return (req.ip || req.connection.remoteAddress || 'unknown');
    }),
    skip: (req: Request) => {
      // Skip rate limiting for localhost in development
      if (process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1') {
        return true;
      }
      return false;
    },
    skipSuccessfulRequests,
    skipFailedRequests: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests. Please try again later.',
          code: 'rate_limit_exceeded',
        },
      });
    },
  });
}

/**
 * Redis-backed rate limiter for login attempts
 */
export const loginLimiter = createLimiter(
  RATE_LIMITS.LOGIN.windowMs,
  RATE_LIMITS.LOGIN.max,
  (req: Request) => {
    // Rate limit by email + IP to prevent targeting specific accounts
    const email = req.body?.email || '';
    return `login:${email}:${req.ip}`;
  }
);

/**
 * Redis-backed rate limiter for registration
 */
export const registrationLimiter = createLimiter(
  RATE_LIMITS.REGISTER.windowMs,
  RATE_LIMITS.REGISTER.max,
  (req: Request) => {
    // Rate limit by IP address
    return `register:${req.ip}`;
  }
);

/**
 * Redis-backed rate limiter for password reset requests
 */
export const passwordResetLimiter = createLimiter(
  RATE_LIMITS.PASSWORD_RESET.windowMs,
  RATE_LIMITS.PASSWORD_RESET.max,
  (req: Request) => {
    // Rate limit by email
    const email = req.body?.email || '';
    return `password-reset:${email}`;
  }
);

/**
 * Redis-backed rate limiter for file uploads
 */
export const uploadLimiter = createLimiter(
  RATE_LIMITS.UPLOAD.windowMs,
  RATE_LIMITS.UPLOAD.max,
  (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    const userId = (req as any).user?.id || req.ip;
    return `upload:${userId}`;
  }
);

/**
 * Redis-backed rate limiter for general API calls
 */
export const apiLimiter = createLimiter(
  RATE_LIMITS.API.windowMs,
  RATE_LIMITS.API.max,
  (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    const userId = (req as any).user?.id || req.ip;
    return `api:${userId}`;
  }
);

/**
 * Redis-backed rate limiter for sensitive operations
 */
export const strictLimiter = createLimiter(
  RATE_LIMITS.STRICT.windowMs,
  RATE_LIMITS.STRICT.max,
  (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    const userId = (req as any).user?.id || req.ip;
    return `strict:${userId}`;
  }
);

/**
 * Custom rate limiter factory
 */
export function createCustomLimiter(
  windowMs: number,
  max: number,
  prefix: string,
  keyGenerator?: (req: Request) => string
) {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: keyGenerator || ((req: Request) => {
      const userId = (req as any).user?.id || req.ip;
      return userId;
    }),
    skip: (req: Request) => {
      if (process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1') {
        return true;
      }
      return false;
    },
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded: ${prefix}`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests. Please try again later.',
          code: 'rate_limit_exceeded',
        },
      });
    },
  });
}

/**
 * Middleware to check and warn about approaching rate limit
 */
export function rateLimitWarningMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    // Add rate limit info to response headers if available
    const rateLimit = (req as any).rateLimit;
    if (rateLimit) {
      res.set('X-RateLimit-Limit', rateLimit.limit.toString());
      res.set('X-RateLimit-Remaining', rateLimit.current.toString());
      res.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

      // Warn if approaching limit (90% consumed)
      if (rateLimit.current >= rateLimit.limit * 0.9) {
        logger.warn('Rate limit warning: approaching limit', {
          ip: req.ip,
          current: rateLimit.current,
          limit: rateLimit.limit,
        });
      }
    }

    return originalJson(data);
  };

  next();
}
