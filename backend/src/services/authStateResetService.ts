import { logger } from '@config/logger';
import { scanAndDeleteByPattern } from '@config/redis';
import {
  LOCKOUT_REDIS_PATTERN,
  resetAccountLockoutMemory,
} from '@middleware/accountLockout';

export interface AuthStateResetResult {
  lockoutKeysDeleted: number;
  authRateLimitKeysDeleted: number;
  inMemoryLockoutsCleared: boolean;
}

export const AUTH_RATE_LIMIT_REDIS_PATTERN = 'rl:auth:*';

export async function resetAuthState(): Promise<AuthStateResetResult> {
  const [lockoutKeysDeleted, authRateLimitKeysDeleted] = await Promise.all([
    scanAndDeleteByPattern(LOCKOUT_REDIS_PATTERN),
    scanAndDeleteByPattern(AUTH_RATE_LIMIT_REDIS_PATTERN),
  ]);

  resetAccountLockoutMemory();

  logger.info('Auth state reset completed', {
    lockoutKeysDeleted,
    authRateLimitKeysDeleted,
    inMemoryLockoutsCleared: true,
    nextStep: 'restart backend processes to clear rate limiter memory stores',
  });

  return {
    lockoutKeysDeleted,
    authRateLimitKeysDeleted,
    inMemoryLockoutsCleared: true,
  };
}
