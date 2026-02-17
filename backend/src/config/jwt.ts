import { logger } from './logger';

/**
 * Get JWT secret from environment or throw error.
 * Never use fallback secrets in production.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET environment variable is not set');
    throw new Error('JWT_SECRET must be configured');
  }
  return secret;
};
