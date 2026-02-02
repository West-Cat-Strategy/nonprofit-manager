import rateLimit from 'express-rate-limit';
import { Request } from 'express';

interface RateLimitRequest extends Request {
  rateLimit?: {
    resetTime: Date;
  };
}

// Disable rate limiting in test environment
const isTestEnv = process.env.NODE_ENV === 'test';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: isTestEnv ? 10000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    const rateLimitReq = req as RateLimitRequest;
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: rateLimitReq.rateLimit?.resetTime,
    });
  },
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: isTestEnv ? 10000 : parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'), // 5 login attempts per window
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const rateLimitReq = req as RateLimitRequest;
    res.status(429).json({
      error: 'Too many login attempts',
      message:
        'Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
      retryAfter: rateLimitReq.rateLimit?.resetTime,
    });
  },
});

// Rate limiter for password reset endpoints
export const passwordResetLimiter = rateLimit({
  windowMs: 3600000, // 1 hour
  max: 3, // 3 requests per hour
  skipSuccessfulRequests: false,
  message: 'Too many password reset requests.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const rateLimitReq = req as RateLimitRequest;
    res.status(429).json({
      error: 'Too many password reset requests',
      message: 'Please wait before requesting another password reset.',
      retryAfter: rateLimitReq.rateLimit?.resetTime,
    });
  },
});

// Rate limiter for registration endpoint
export const registrationLimiter = rateLimit({
  windowMs: 3600000, // 1 hour
  max: 5, // 5 registrations per IP per hour
  skipSuccessfulRequests: false,
  message: 'Too many accounts created from this IP.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const rateLimitReq = req as RateLimitRequest;
    res.status(429).json({
      error: 'Too many registration attempts',
      message: 'Too many accounts created from this IP address. Please try again later.',
      retryAfter: rateLimitReq.rateLimit?.resetTime,
    });
  },
});
