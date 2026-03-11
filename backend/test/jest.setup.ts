import dotenv from 'dotenv';
import pool from '../src/config/database';

dotenv.config({ path: '.env.test.local', quiet: true });
dotenv.config({ path: '.env.test', quiet: true });
dotenv.config({ path: '.env', quiet: true });

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

const DB_COMPAT_SETUP_FLAG = '__NONPROFIT_MANAGER_DB_COMPAT_SETUP_DONE__';

beforeAll(async () => {
  // setupFilesAfterEnv runs for each test file, so use process-level state.
  if (process.env[DB_COMPAT_SETUP_FLAG] === 'true') {
    return;
  }

  // Avoid concurrent DDL across parallel Jest workers; one pass is sufficient.
  if (process.env.JEST_WORKER_ID && process.env.JEST_WORKER_ID !== '1') {
    return;
  }

  process.env[DB_COMPAT_SETUP_FLAG] = 'true';
  let dbClient;
  try {
    dbClient = await pool.connect();
  } catch {
    // Keep pure unit suites runnable when local DB creds/ports are unavailable.
    return;
  }

  try {
    // Never wait indefinitely on table locks in test setup.
    await dbClient.query("SET lock_timeout TO '2000ms'");
    await dbClient.query("SET statement_timeout TO '30000ms'");

    // Keep integration tests resilient when local test DB lags behind recent migrations.
    await dbClient.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20),
      ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER,
      ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS registered_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS attended_count INTEGER NOT NULL DEFAULT 0
    `);

    await dbClient.query(`
      ALTER TABLE cases
      ADD COLUMN IF NOT EXISTS client_viewable BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await dbClient.query(`
      ALTER TABLE case_notes
      ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id)
    `);

    await dbClient.query(`
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

    await dbClient.query(`
      ALTER TABLE case_outcomes
      ADD COLUMN IF NOT EXISTS outcome_definition_id UUID,
      ADD COLUMN IF NOT EXISTS entry_source VARCHAR(32) NOT NULL DEFAULT 'manual'
    `);

    await dbClient.query(`
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

    await dbClient.query(`
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

    await dbClient.query(`
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

    await dbClient.query(`
      ALTER TABLE case_documents
      ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id)
    `);

    await dbClient.query(`
      ALTER TABLE case_documents
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);

    await dbClient.query(`
      ALTER TABLE volunteers
      ADD COLUMN IF NOT EXISTS availability_status VARCHAR(32) NOT NULL DEFAULT 'available',
      ADD COLUMN IF NOT EXISTS availability_notes TEXT,
      ADD COLUMN IF NOT EXISTS background_check_expiry DATE,
      ADD COLUMN IF NOT EXISTS preferred_roles TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      ADD COLUMN IF NOT EXISTS certifications TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
      ADD COLUMN IF NOT EXISTS max_hours_per_week INTEGER,
      ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(120),
      ADD COLUMN IF NOT EXISTS volunteer_since DATE,
      ADD COLUMN IF NOT EXISTS total_hours_logged NUMERIC(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
    `);

    await dbClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_volunteers_contact_id'
        ) THEN
          ALTER TABLE volunteers
          ADD CONSTRAINT uq_volunteers_contact_id UNIQUE (contact_id);
        END IF;
      END $$;
    `);
  } catch {
    // Allow pure unit tests to run without a live DB.
  } finally {
    dbClient.release();
  }
});

afterAll(async () => {
  try {
    await pool.end();
  } catch {
    // Allow unit suites without an active DB connection to complete cleanly.
  }
});
