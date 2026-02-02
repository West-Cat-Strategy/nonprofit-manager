import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { RATE_LIMIT, ERROR_MESSAGES, HTTP_STATUS } from '../config/constants';

interface RateLimitRequest extends Request {
  rateLimit?: {
    resetTime: Date;
  };
}

// Disable rate limiting in test environment
const isTestEnv = process.env.NODE_ENV === 'test';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(RATE_LIMIT.WINDOW_MS)),
  max: isTestEnv ? 10000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || String(RATE_LIMIT.MAX_REQUESTS)),
  message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    const rateLimitReq = req as RateLimitRequest;
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: rateLimitReq.rateLimit?.resetTime,
    });
  },
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(RATE_LIMIT.AUTH_WINDOW_MS)),
  max: isTestEnv ? 10000 : parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || String(RATE_LIMIT.AUTH_MAX_ATTEMPTS)),
  skipSuccessfulRequests: true, // Don't count successful requests
  message: ERROR_MESSAGES.TOO_MANY_LOGIN_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const rateLimitReq = req as RateLimitRequest;
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: 'Too many login attempts',
      message: ERROR_MESSAGES.TOO_MANY_LOGIN_ATTEMPTS,
      retryAfter: rateLimitReq.rateLimit?.resetTime,
    });
  },
});

// Rate limiter for password reset endpoints
export const passwordResetLimiter = rateLimit({
  windowMs: RATE_LIMIT.PASSWORD_RESET_WINDOW_MS,
  max: RATE_LIMIT.PASSWORD_RESET_MAX_ATTEMPTS,
  skipSuccessfulRequests: false,
  message: ERROR_MESSAGES.TOO_MANY_PASSWORD_RESETS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const rateLimitReq = req as RateLimitRequest;
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: 'Too many password reset requests',
      message: ERROR_MESSAGES.TOO_MANY_PASSWORD_RESETS,
      retryAfter: rateLimitReq.rateLimit?.resetTime,
    });
  },
});

// Rate limiter for registration endpoint
export const registrationLimiter = rateLimit({
  windowMs: RATE_LIMIT.REGISTRATION_WINDOW_MS,
  max: RATE_LIMIT.REGISTRATION_MAX_ATTEMPTS,
  skipSuccessfulRequests: false,
  message: ERROR_MESSAGES.TOO_MANY_REGISTRATIONS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const rateLimitReq = req as RateLimitRequest;
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: 'Too many registration attempts',
      message: ERROR_MESSAGES.TOO_MANY_REGISTRATIONS,
      retryAfter: rateLimitReq.rateLimit?.resetTime,
    });
  },
});
