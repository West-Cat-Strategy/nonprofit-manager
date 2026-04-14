import { logger } from '@config/logger';
import { scanAndDeleteByPattern } from '@config/redis';
import {
  LOCKOUT_REDIS_PATTERN,
  resetAccountLockoutMemory,
} from '@middleware/accountLockout';

const AUTH_RATE_LIMIT_REDIS_PATTERN = 'rl:auth:*';

export type AuthStateResetResult = {
  lockoutKeysDeleted: number;
  authRateLimitKeysDeleted: number;
  inMemoryLockoutsCleared: boolean;
};

export const resetAuthState = async (): Promise<AuthStateResetResult> => {
  const lockoutKeysDeleted = await scanAndDeleteByPattern(LOCKOUT_REDIS_PATTERN);
  const authRateLimitKeysDeleted = await scanAndDeleteByPattern(AUTH_RATE_LIMIT_REDIS_PATTERN);

  resetAccountLockoutMemory();

  const result: AuthStateResetResult = {
    lockoutKeysDeleted,
    authRateLimitKeysDeleted,
    inMemoryLockoutsCleared: true,
  };

  logger.info('Auth state reset completed', result);

  return result;
};
