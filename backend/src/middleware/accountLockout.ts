import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { logger } from '../config/logger';

interface LoginAttempt {
  userId: string;
  attempts: number;
  lockedUntil: Date | null;
}

const loginAttempts = new Map<string, LoginAttempt>();

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
const LOCKOUT_DURATION_MS = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MS || '900000'); // 15 minutes

/**
 * Track failed login attempts and lock accounts if threshold is exceeded
 */
export const trackLoginAttempt = async (
  identifier: string,
  success: boolean,
  userId?: string
): Promise<void> => {
  const key = identifier.toLowerCase();

  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(key);

    // Log successful login for audit
    if (userId) {
      try {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, details, ip_address, created_at) 
           VALUES ($1, $2, $3, $4, NOW())`,
          [userId, 'LOGIN_SUCCESS', 'User logged in successfully', identifier]
        );
      } catch (error) {
        logger.error('Failed to log successful login attempt', { error, userId });
      }
    }
    return;
  }

  // Handle failed login attempt
  const attempt = loginAttempts.get(key) || {
    userId: userId || '',
    attempts: 0,
    lockedUntil: null,
  };

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
            identifier,
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

  loginAttempts.set(key, attempt);

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
          identifier,
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
export const isAccountLocked = (identifier: string): boolean => {
  const key = identifier.toLowerCase();
  const attempt = loginAttempts.get(key);

  if (!attempt || !attempt.lockedUntil) {
    return false;
  }

  // Check if lockout period has expired
  if (new Date() > attempt.lockedUntil) {
    loginAttempts.delete(key);
    return false;
  }

  return true;
};

/**
 * Get remaining lockout time in minutes
 */
export const getLockoutTimeRemaining = (identifier: string): number => {
  const key = identifier.toLowerCase();
  const attempt = loginAttempts.get(key);

  if (!attempt || !attempt.lockedUntil) {
    return 0;
  }

  const remaining = attempt.lockedUntil.getTime() - Date.now();
  return Math.ceil(remaining / 60000); // Convert to minutes
};

/**
 * Middleware to check account lockout status
 */
export const checkAccountLockout = (req: Request, res: Response, next: NextFunction): void => {
  const { email } = req.body;

  if (!email) {
    return next();
  }

  if (isAccountLocked(email)) {
    const minutesRemaining = getLockoutTimeRemaining(email);
    logger.warn('Login attempt on locked account', { email, minutesRemaining });

    res.status(423).json({
      error: 'Account locked',
      message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minutes.`,
      lockedUntil: loginAttempts.get(email.toLowerCase())?.lockedUntil,
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
