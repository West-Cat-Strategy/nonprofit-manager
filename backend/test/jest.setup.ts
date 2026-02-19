import dotenv from 'dotenv';
import pool from '../src/config/database';

dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env' });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.REDIS_ENABLED = 'false'; // Disable Redis in tests
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key';

// Some service tests use DATABASE_URL directly.
// Keep it aligned with src/config/database defaults so tests can run in local/dev docker.
process.env.DATABASE_URL = process.env.DATABASE_URL
  || `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'nonprofit_manager'}`;

beforeAll(async () => {
  try {
    // Keep integration tests resilient when local test DB lags behind recent migrations.
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20),
      ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER,
      ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS registered_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS attended_count INTEGER NOT NULL DEFAULT 0
    `);
  } catch {
    // Allow pure unit tests to run without a live DB.
  }
});
