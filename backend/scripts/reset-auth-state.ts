import dotenv from 'dotenv';
import { initializeRedis, closeRedis } from '../src/config/redis';
import { logger } from '../src/config/logger';
import { resetAuthState } from '../src/services/authStateResetService';

dotenv.config({ path: '.env', quiet: true });

async function main(): Promise<void> {
  await initializeRedis();

  try {
    const result = await resetAuthState();
    logger.info('Auth reset script finished', {
      ...result,
      reminder: 'restart backend processes to clear in-memory rate limiter state',
    });
  } finally {
    await closeRedis();
  }
}

main().catch((error) => {
  logger.error('Auth reset script failed', { error });
  process.exitCode = 1;
});
