import dotenv from 'dotenv';
import pool from '../src/config/database';

dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env' });

// Migration compatibility checks can exceed Jest's 5s default hook timeout on CI/local Docker.
jest.setTimeout(60000);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.REDIS_ENABLED = 'false'; // Disable Redis in tests
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key';

// Some service tests use DATABASE_URL directly.
// Keep it aligned with src/config/database defaults so tests can run in local/dev docker.
process.env.DATABASE_URL = process.env.DATABASE_URL
  || `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'nonprofit_manager'}`;

beforeAll(async () => {
  const setupFlag = '__NONPROFIT_MANAGER_DB_COMPAT_SETUP_DONE__';
  const globalWithSetupFlag = globalThis as Record<string, unknown>;

  if (globalWithSetupFlag[setupFlag] === true) {
    return;
  }

  // Avoid concurrent DDL across parallel Jest workers; one pass is sufficient.
  if (process.env.JEST_WORKER_ID && process.env.JEST_WORKER_ID !== '1') {
    return;
  }

  globalWithSetupFlag[setupFlag] = true;

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

    await pool.query(`
      ALTER TABLE cases
      ADD COLUMN IF NOT EXISTS client_viewable BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await pool.query(`
      ALTER TABLE case_notes
      ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS case_outcomes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        outcome_type VARCHAR(100),
        outcome_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS case_topic_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        normalized_name VARCHAR(120) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_case_topic_definitions_account_normalized'
        ) THEN
          ALTER TABLE case_topic_definitions
          ADD CONSTRAINT uq_case_topic_definitions_account_normalized
          UNIQUE (account_id, normalized_name);
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS case_topic_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        topic_definition_id UUID NOT NULL REFERENCES case_topic_definitions(id) ON DELETE RESTRICT,
        discussed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await pool.query(`
      ALTER TABLE case_documents
      ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id)
    `);

    await pool.query(`
      ALTER TABLE case_documents
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
  } catch {
    // Allow pure unit tests to run without a live DB.
  }
});
