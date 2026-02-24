import rateLimit, { MemoryStore, Store, Options } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { RATE_LIMIT, ERROR_MESSAGES, HTTP_STATUS } from '@config/constants';
import { getRedisClient } from '@config/redis';
import { rateLimitKeys } from '@utils/rateLimitKeys';
import { sendError } from '@modules/shared/http/envelope';

interface RateLimitRequest extends Request {
  rateLimit?: {
    resetTime: Date;
  };
}

// Disable rate limiting in test environment
const isTestEnv = process.env.NODE_ENV === 'test';
const noopLimiter = (_req: Request, _res: Response, next: NextFunction) => next();
const isDevEnv = process.env.NODE_ENV === 'development';
const shouldSkipRateLimit = (req: Request): boolean => {
  if (!isDevEnv) return false;
  const ip = req.ip || req.connection.remoteAddress || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('::ffff:127.0.0.1') ||
    ip.startsWith('192.168.') || // Docker/LAN
    ip.startsWith('172.') ||     // Docker
    ip.startsWith('10.')         // LAN
  );
};

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

const buildRetryDetails = (req: Request, strategy: string): Record<string, unknown> => {
  const rateLimitReq = req as RateLimitRequest;
  const resetTime = rateLimitReq.rateLimit?.resetTime;
  if (!resetTime) {
    return { strategy };
  }

  const retryAfterMs = Math.max(0, resetTime.getTime() - Date.now());
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

  return {
    strategy,
    retryAfter: resetTime.toISOString(),
    retryAfterSeconds,
  };
};

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(RATE_LIMIT.WINDOW_MS)),
  max: isTestEnv ? 10000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || String(RATE_LIMIT.MAX_REQUESTS)),
  keyGenerator: (req) => rateLimitKeys.api(req),
  skip: shouldSkipRateLimit,
  message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: buildStore('rl:api:'),
  handler: (req, res) => {
    sendError(
      res,
      'rate_limit_exceeded',
      ERROR_MESSAGES.TOO_MANY_REQUESTS,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      buildRetryDetails(req, 'api'),
      req.correlationId
    );
  },
});
export const apiLimiterMiddleware = isTestEnv ? noopLimiter : apiLimiter;

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(RATE_LIMIT.AUTH_WINDOW_MS)),
  max: isTestEnv ? 10000 : parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || String(RATE_LIMIT.AUTH_MAX_ATTEMPTS)),
  keyGenerator: (req) => rateLimitKeys.auth(req),
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: shouldSkipRateLimit,
  message: ERROR_MESSAGES.TOO_MANY_LOGIN_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:auth:'),
  handler: (req, res) => {
    sendError(
      res,
      'rate_limit_exceeded',
      ERROR_MESSAGES.TOO_MANY_LOGIN_ATTEMPTS,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      buildRetryDetails(req, 'auth'),
      req.correlationId
    );
  },
});
export const authLimiterMiddleware = isTestEnv ? noopLimiter : authLimiter;

// Rate limiter for password reset endpoints
export const passwordResetLimiter = rateLimit({
  windowMs: RATE_LIMIT.PASSWORD_RESET_WINDOW_MS,
  max: RATE_LIMIT.PASSWORD_RESET_MAX_ATTEMPTS,
  keyGenerator: (req) => rateLimitKeys.passwordReset(req),
  skipSuccessfulRequests: false,
  skip: shouldSkipRateLimit,
  message: ERROR_MESSAGES.TOO_MANY_PASSWORD_RESETS,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:password-reset:'),
  handler: (req, res) => {
    sendError(
      res,
      'rate_limit_exceeded',
      ERROR_MESSAGES.TOO_MANY_PASSWORD_RESETS,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      buildRetryDetails(req, 'password_reset'),
      req.correlationId
    );
  },
});
export const passwordResetLimiterMiddleware = isTestEnv ? noopLimiter : passwordResetLimiter;

// Rate limiter for registration endpoint
export const registrationLimiter = rateLimit({
  windowMs: RATE_LIMIT.REGISTRATION_WINDOW_MS,
  max: isTestEnv ? 10000 : parseInt(process.env.REGISTRATION_MAX_ATTEMPTS || String(RATE_LIMIT.REGISTRATION_MAX_ATTEMPTS)),
  keyGenerator: (req) => rateLimitKeys.registration(req),
  skipSuccessfulRequests: false,
  skip: shouldSkipRateLimit,
  message: ERROR_MESSAGES.TOO_MANY_REGISTRATIONS,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:registration:'),
  handler: (req, res) => {
    sendError(
      res,
      'rate_limit_exceeded',
      ERROR_MESSAGES.TOO_MANY_REGISTRATIONS,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      buildRetryDetails(req, 'registration'),
      req.correlationId
    );
  },
});
export const registrationLimiterMiddleware = isTestEnv ? noopLimiter : registrationLimiter;
