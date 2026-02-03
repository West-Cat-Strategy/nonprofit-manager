import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';

interface LoginAttempt {
  userId: string;
  attempts: number;
  lockedUntil: Date | null;
}

const loginAttempts = new Map<string, LoginAttempt>();
const LOCKOUT_KEY_PREFIX = 'auth:lockout:';

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
const LOCKOUT_DURATION_MS = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MS || '900000'); // 15 minutes

const getLoginAttempt = async (identifier: string): Promise<LoginAttempt | null> => {
  const key = identifier.toLowerCase();
  const redis = getRedisClient();
  const redisKey = `${LOCKOUT_KEY_PREFIX}${key}`;

  if (redis?.isReady) {
    const stored = await redis.hGetAll(redisKey);
    if (Object.keys(stored).length > 0) {
      return {
        userId: stored.userId || '',
        attempts: parseInt(stored.attempts || '0', 10),
        lockedUntil: stored.lockedUntil ? new Date(parseInt(stored.lockedUntil, 10)) : null,
      };
    }
    return null;
  }

  return loginAttempts.get(key) || null;
};

/**
 * Track failed login attempts and lock accounts if threshold is exceeded
 */
export const trackLoginAttempt = async (
  identifier: string,
  success: boolean,
  userId?: string,
  ipAddress?: string
): Promise<void> => {
  const key = identifier.toLowerCase();
  const redis = getRedisClient();
  const redisKey = `${LOCKOUT_KEY_PREFIX}${key}`;

  if (success) {
    // Clear attempts on successful login
    if (redis?.isReady) {
      await redis.del(redisKey);
    } else {
      loginAttempts.delete(key);
    }

    // Log successful login for audit
    if (userId) {
      try {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, details, ip_address, created_at) 
           VALUES ($1, $2, $3, $4, NOW())`,
          [userId, 'LOGIN_SUCCESS', 'User logged in successfully', ipAddress || 'unknown']
        );
      } catch (error) {
        logger.error('Failed to log successful login attempt', { error, userId });
      }
    }
    return;
  }

  // Handle failed login attempt
  let attempt = await getLoginAttempt(identifier);

  if (!attempt) {
    attempt = {
      userId: userId || '',
      attempts: 0,
      lockedUntil: null,
    };
  }

  attempt.userId = userId || attempt.userId;
  attempt.attempts += 1;

  // Check if account should be locked
  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    logger.warn('Account locked due to too many failed login attempts', {
      identifier,
      attempts: attempt.attempts,
      lockedUntil: attempt.lockedUntil,
    });

    // Log lockout event for audit
    if (userId) {
      try {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, details, ip_address, created_at) 
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            userId,
            'ACCOUNT_LOCKED',
            `Account locked after ${attempt.attempts} failed login attempts`,
            ipAddress || 'unknown',
          ]
        );
      } catch (error) {
        logger.error('Failed to log account lockout', { error, userId });
      }
    }
  } else {
    logger.info('Failed login attempt recorded', {
      identifier,
      attempts: attempt.attempts,
      remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.attempts,
    });
  }

  if (redis?.isReady) {
    await redis.hSet(redisKey, {
      userId: attempt.userId,
      attempts: String(attempt.attempts),
      lockedUntil: attempt.lockedUntil ? String(attempt.lockedUntil.getTime()) : '',
    });
    // Ensure lockout data expires eventually in Redis
    await redis.expire(redisKey, Math.ceil(LOCKOUT_DURATION_MS / 1000));
  } else {
    loginAttempts.set(key, attempt);
  }

  // Log failed login for audit
  if (userId) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, details, ip_address, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          userId,
          'LOGIN_FAILED',
          `Failed login attempt (${attempt.attempts}/${MAX_LOGIN_ATTEMPTS})`,
          ipAddress || 'unknown',
        ]
      );
    } catch (error) {
      logger.error('Failed to log failed login attempt', { error, userId });
    }
  }
};

/**
 * Check if an account is locked
 */
export const isAccountLocked = async (identifier: string): Promise<boolean> => {
  const redis = getRedisClient();
  const attempt = await getLoginAttempt(identifier);
  const key = identifier.toLowerCase();
  const redisKey = `${LOCKOUT_KEY_PREFIX}${key}`;

  if (!attempt || !attempt.lockedUntil) {
    return false;
  }

  // Check if lockout period has expired
  if (new Date() > attempt.lockedUntil) {
    if (redis?.isReady) {
      await redis.del(redisKey);
    } else {
      loginAttempts.delete(key);
    }
    return false;
  }

  return true;
};

/**
 * Get remaining lockout time in minutes
 */
export const getLockoutTimeRemaining = async (identifier: string): Promise<number> => {
  const attempt = await getLoginAttempt(identifier);

  if (!attempt || !attempt.lockedUntil) {
    return 0;
  }

  const remaining = attempt.lockedUntil.getTime() - Date.now();
  return Math.ceil(remaining / 60000); // Convert to minutes
};

/**
 * Middleware to check account lockout status
 */
export const checkAccountLockout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    return next();
  }

  if (await isAccountLocked(email)) {
    const minutesRemaining = await getLockoutTimeRemaining(email);
    const attempt = await getLoginAttempt(email);
    logger.warn('Login attempt on locked account', { email, minutesRemaining });

    res.status(423).json({
      error: 'Account locked',
      message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minutes.`,
      lockedUntil: attempt?.lockedUntil,
    });
    return;
  }

  next();
};

/**
 * Clean up expired lockouts periodically
 */
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const now = new Date();
    for (const [key, attempt] of loginAttempts.entries()) {
      if (attempt.lockedUntil && now > attempt.lockedUntil) {
        loginAttempts.delete(key);
        logger.info('Account lockout expired and cleared', { identifier: key });
      }
    }
  }, 300000); // Clean up every 5 minutes
}
