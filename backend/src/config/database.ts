import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { logger } from './logger';
import { DATABASE } from './constants';

if (process.env.JEST_WORKER_ID && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
  dotenv.config({ path: '.env' });
} else {
  dotenv.config({ path: '.env' });
}

const config: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nonprofit_manager',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: DATABASE.POOL_MAX_CONNECTIONS,
  idleTimeoutMillis: DATABASE.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DATABASE.CONNECTION_TIMEOUT_MS,
  // Avoid Jest hanging on open TCP handles while still allowing real connections during tests.
  // https://node-postgres.com/api/pool
  allowExitOnIdle: process.env.NODE_ENV === 'test',
};

const pool = new Pool(config);

// Handle pool errors gracefully without crashing the application
// The application can implement health checks and alerts based on these errors
pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle database client', {
    error: err.message,
    stack: err.stack,
    name: err.name,
  });
  // Don't crash the application - let health checks and monitoring handle it
  // Health check endpoint will detect database connectivity issues
});

export default pool;
