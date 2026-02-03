import rateLimit, { MemoryStore, Store, Options } from 'express-rate-limit';
import { Request } from 'express';
import { RATE_LIMIT, ERROR_MESSAGES, HTTP_STATUS } from '../config/constants';
import { getRedisClient } from '../config/redis';

interface RateLimitRequest extends Request {
  rateLimit?: {
    resetTime: Date;
  };
}

// Disable rate limiting in test environment
const isTestEnv = process.env.NODE_ENV === 'test';

class HybridRateLimitStore implements Store {
  localKeys = false;
  prefix?: string;
  private windowMs = RATE_LIMIT.WINDOW_MS;
  private memoryStore = new MemoryStore();

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    this.memoryStore.init?.(options);
  }

  async increment(key: string) {
    const redis = getRedisClient();
    if (!redis?.isReady) {
      return this.memoryStore.increment(key);
    }

    const redisKey = `${this.prefix}${key}`;
    const totalHits = await redis.incr(redisKey);
    if (totalHits === 1) {
      await redis.pExpire(redisKey, this.windowMs);
    }
    const ttl = await redis.pTTL(redisKey);
    const resetTime = new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs));
    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis?.isReady) {
      return this.memoryStore.decrement(key);
    }

    const redisKey = `${this.prefix}${key}`;
    await redis.decr(redisKey);
  }

  async resetKey(key: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis?.isReady) {
      return this.memoryStore.resetKey(key);
    }

    const redisKey = `${this.prefix}${key}`;
    await redis.del(redisKey);
  }
}

const buildStore = (prefix: string): Store => new HybridRateLimitStore(prefix);

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(RATE_LIMIT.WINDOW_MS)),
  max: isTestEnv ? 10000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || String(RATE_LIMIT.MAX_REQUESTS)),
  message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: buildStore('rl:api:'),
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
  store: buildStore('rl:auth:'),
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
  store: buildStore('rl:password-reset:'),
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
  store: buildStore('rl:registration:'),
  handler: (req, res) => {
    const rateLimitReq = req as RateLimitRequest;
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: 'Too many registration attempts',
      message: ERROR_MESSAGES.TOO_MANY_REGISTRATIONS,
      retryAfter: rateLimitReq.rateLimit?.resetTime,
    });
  },
});
