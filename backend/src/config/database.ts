import { Pool, PoolConfig } from 'pg';
import { logger } from './logger';

const config: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nonprofit_manager',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
