import { Pool, PoolConfig, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { logger } from './logger';
import { DATABASE } from './constants';
import { getRequestContext } from './requestContext';

if (process.env.JEST_WORKER_ID && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

if (process.env.NODE_ENV === 'test') {
  // Keep explicit runtime env (for Playwright/Docker/webServer flows), and only
  // fall back to test DB settings when the process did not already provide them.
  const testLocalEnv = dotenv.config({ path: '.env.test.local', quiet: true }).parsed ?? {};
  const testEnv = dotenv.config({ path: '.env.test', quiet: true }).parsed ?? {};
  const mergedTestEnv = {
    ...testEnv,
    ...testLocalEnv,
  };
  const dbOverrideKeys = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
  dbOverrideKeys.forEach((key) => {
    if (process.env[key]) {
      return;
    }
    const value = mergedTestEnv[key];
    if (value) {
      process.env[key] = value;
    }
  });
  dotenv.config({ path: '.env', quiet: true });
} else {
  dotenv.config({ path: '.env', quiet: true });
}

export function resolveDatabaseSslConfig(
  env: NodeJS.ProcessEnv = process.env
): PoolConfig['ssl'] {
  if (env.NODE_ENV !== 'production') {
    return false;
  }

  const dbAtRestMode = (env.DB_AT_REST_ENCRYPTION_MODE || '').trim().toLowerCase();

  // Local-Postgres deployments talk to the compose-network container directly, so
  // node-postgres SSL must stay off even while the app is in production mode.
  if (dbAtRestMode === 'luks' || dbAtRestMode === 'self_hosted') {
    return false;
  }

  if (env.DB_SSL_ENABLED === 'false') {
    return false;
  }

  return {
    rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED !== 'false', // Default: true (strict)
  };
}

const config: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nonprofit_manager',
  user:
    process.env.DB_USER ||
    (process.env.NODE_ENV === 'production' ? 'nonprofit_app_user_prod' : 'nonprofit_app_user'),
  password:
    process.env.DB_PASSWORD ??
    (process.env.NODE_ENV === 'production' ? undefined : 'nonprofit_app_password'),
  max: DATABASE.POOL_MAX_CONNECTIONS,
  idleTimeoutMillis: DATABASE.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DATABASE.CONNECTION_TIMEOUT_MS,
  // Avoid Jest hanging on open TCP handles while still allowing real connections during tests.
  // https://node-postgres.com/api/pool
  allowExitOnIdle: process.env.NODE_ENV === 'test',
  // SSL/TLS Configuration for Database Connection
  // Managed/external production databases keep SSL on; local Postgres does not.
  ssl: resolveDatabaseSslConfig(),
};

const rawPool = new Pool(config);

const originalQuery = rawPool.query.bind(rawPool);
type DatabaseQuery = typeof rawPool.query;

/**
 * Executes a query directly against the pool without RLS transaction overhead.
 * Use for public data, health checks, or when RLS is not required.
 */
export const fastQuery: DatabaseQuery = originalQuery;

export const setCurrentUserId = async (
  client: Pick<PoolClient, 'query'>,
  userId: string,
  options: { local?: boolean } = {}
): Promise<void> => {
  await client.query(
    options.local
      ? `SELECT set_config('app.current_user_id', $1, true)`
      : `SELECT set_config('app.current_user_id', $1, false)`,
    [userId]
  );
};

export const resetCurrentUserId = async (client: Pick<PoolClient, 'query'>): Promise<void> => {
  await client.query('RESET app.current_user_id');
};

/**
 * Execute multiple queries within a single transaction and optionally bind
 * the authenticated user once for every statement in that transaction.
 */
export async function withDatabaseTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  options: { userId?: string | null } = {}
): Promise<T> {
  const client = await rawPool.connect();
  try {
    await client.query('BEGIN');
    if (options.userId) {
      await setCurrentUserId(client, options.userId, { local: true });
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function withUserContextTransaction<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withDatabaseTransaction(fn, { userId });
}

export async function withRequestContextTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const context = getRequestContext();
  return withDatabaseTransaction(fn, { userId: context?.userId ?? null });
}

export const requestContextQuery: DatabaseQuery = (async (...args: any[]) => {
  const context = getRequestContext();
  if (!context?.userId) {
    return (originalQuery as any)(...args);
  }

  const client = await rawPool.connect();
  try {
    await setCurrentUserId(client, context.userId);
    return await (client.query as any)(...args);
  } finally {
    try {
      await resetCurrentUserId(client);
    } catch (error) {
      logger.warn('Failed to reset app.current_user_id after request-scoped query', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    client.release();
  }
}) as DatabaseQuery;

// Backward-compatible alias while callers migrate to the more explicit helper name.
export const withRLSContext = withUserContextTransaction;

// Handle pool errors gracefully without crashing the application
rawPool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle database client', {
    error: err.message,
    stack: err.stack,
    name: err.name,
  });
});

const pool = new Proxy(rawPool, {
  get(target, prop, receiver) {
    if (prop === 'query') {
      return requestContextQuery;
    }

    const value = Reflect.get(target, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(target);
    }

    return value;
  },
}) as Pool;

export type { PoolClient };
export { rawPool };
export default pool;
