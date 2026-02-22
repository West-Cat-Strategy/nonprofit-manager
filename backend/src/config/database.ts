import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { logger } from './logger';
import { DATABASE } from './constants';

if (process.env.JEST_WORKER_ID && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

if (process.env.NODE_ENV === 'test') {
  // Keep runtime env (e.g., PORT for Playwright webServer), but force DB settings from test env.
  const testEnv = dotenv.config({ path: '.env.test' });
  const dbOverrideKeys = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
  if (testEnv.parsed) {
    dbOverrideKeys.forEach((key) => {
      const value = testEnv.parsed?.[key];
      if (value) {
        process.env[key] = value;
      }
    });
  }
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
  // HTTPS://node-postgres.com/api/pool
  allowExitOnIdle: process.env.NODE_ENV === 'test',
  // SSL/TLS Configuration for Database Connection
  // In production, enforce SSL for secure database communication
  ssl:
    process.env.NODE_ENV === 'production' && process.env.DB_SSL_ENABLED !== 'false'
      ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false', // Default: true (strict)
        // Optional: ca certificate path for self-signed certs
        // ca: process.env.DB_SSL_CA_PATH ? fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8') : undefined,
      }
      : false,
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
