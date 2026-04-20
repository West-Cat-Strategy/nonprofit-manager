import dotenv from 'dotenv';
import type { PoolClient } from 'pg';
import pool from '../src/config/database';

const explicitEnv = { ...process.env };

dotenv.config({ path: '.env.test.local', quiet: true });
dotenv.config({ path: '.env.test', quiet: true });
dotenv.config({ path: '.env', quiet: true });

// Migration compatibility checks can exceed Jest's 5s default hook timeout on CI/local Docker.
jest.setTimeout(60000);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key';

// Some service tests use DATABASE_URL directly.
// Keep it aligned with src/config/database defaults so tests can run in local/dev docker.
process.env.DATABASE_URL = process.env.DATABASE_URL
  || `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'nonprofit_manager'}`;

const DB_COMPAT_SETUP_FLAG = '__NONPROFIT_MANAGER_DB_COMPAT_SETUP_DONE__';

type RequiredSchemaCheck = {
  table: string;
  columns?: string[];
  constraints?: string[];
};

const requiredSchemaChecks: RequiredSchemaCheck[] = [
  {
    table: 'events',
    columns: [
      'is_public',
      'is_recurring',
      'recurrence_pattern',
      'recurrence_interval',
      'recurrence_end_date',
      'registered_count',
      'attended_count',
    ],
  },
  {
    table: 'cases',
    columns: ['client_viewable'],
  },
  {
    table: 'case_notes',
    columns: ['visible_to_client', 'category', 'updated_at', 'updated_by'],
  },
  {
    table: 'case_outcomes',
    columns: ['outcome_definition_id', 'entry_source'],
  },
  {
    table: 'case_topic_definitions',
    columns: ['id', 'account_id', 'name', 'normalized_name', 'is_active'],
    constraints: ['uq_case_topic_definitions_account_normalized'],
  },
  {
    table: 'case_topic_events',
    columns: ['id', 'case_id', 'account_id', 'topic_definition_id'],
  },
  {
    table: 'case_documents',
    columns: [
      'account_id',
      'file_name',
      'original_filename',
      'visible_to_client',
      'is_active',
      'updated_at',
      'updated_by',
      'created_at',
    ],
  },
  {
    table: 'volunteers',
    columns: [
      'availability_status',
      'availability_notes',
      'background_check_expiry',
      'preferred_roles',
      'certifications',
      'max_hours_per_week',
      'emergency_contact_relationship',
      'volunteer_since',
      'total_hours_logged',
      'is_active',
    ],
    constraints: ['uq_volunteers_contact_id'],
  },
];

const formatErrorMessage = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

const isExplicitTrue = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim().toLowerCase() === 'true';

const assertTableExists = async (dbClient: PoolClient, table: string): Promise<void> => {
  const result = await dbClient.query<{ regclass: string | null }>(
    'SELECT to_regclass($1) AS regclass',
    [`public.${table}`]
  );

  if (!result.rows[0]?.regclass) {
    throw new Error(`Missing required test table public.${table}`);
  }
};

const assertColumnExists = async (
  dbClient: PoolClient,
  table: string,
  column: string
): Promise<void> => {
  const result = await dbClient.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [table, column]
  );

  if (result.rowCount === 0) {
    throw new Error(`Missing required test column public.${table}.${column}`);
  }
};

const assertConstraintExists = async (
  dbClient: PoolClient,
  table: string,
  constraint: string
): Promise<void> => {
  const result = await dbClient.query(
    `
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = $1
        AND c.conname = $2
      LIMIT 1
    `,
    [table, constraint]
  );

  if (result.rowCount === 0) {
    throw new Error(`Missing required test constraint public.${table}.${constraint}`);
  }
};

const assertTestSchemaReady = async (dbClient: PoolClient): Promise<void> => {
  const missing: string[] = [];

  for (const requirement of requiredSchemaChecks) {
    try {
      await assertTableExists(dbClient, requirement.table);

      for (const column of requirement.columns ?? []) {
        await assertColumnExists(dbClient, requirement.table, column);
      }

      for (const constraint of requirement.constraints ?? []) {
        await assertConstraintExists(dbClient, requirement.table, constraint);
      }
    } catch (error) {
      missing.push(formatErrorMessage(error));
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Test database schema is not ready. Missing or incompatible objects:\n- ${missing.join(
        '\n- '
      )}\nRun the pending migrations instead of relying on jest.setup to repair schema drift.`
    );
  }
};

beforeAll(async () => {
  const currentTestPath = expect.getState().testPath ?? '';
  const isIntegrationTestPath =
    currentTestPath.includes('/__tests__/integration/') ||
    currentTestPath.includes('\\__tests__\\integration\\');
  const shouldVerifyTestDb = isIntegrationTestPath || process.env.REQUIRE_TEST_DB === 'true';

  const shouldExposeAuthTokens =
    explicitEnv.EXPOSE_AUTH_TOKENS_IN_RESPONSE === 'false'
      ? false
      : isIntegrationTestPath || isExplicitTrue(explicitEnv.EXPOSE_AUTH_TOKENS_IN_RESPONSE);
  process.env.EXPOSE_AUTH_TOKENS_IN_RESPONSE = shouldExposeAuthTokens ? 'true' : 'false';

  const shouldBypassRegistrationPolicy =
    explicitEnv.BYPASS_REGISTRATION_POLICY_IN_TEST === 'false'
      ? false
      : isIntegrationTestPath || isExplicitTrue(explicitEnv.BYPASS_REGISTRATION_POLICY_IN_TEST);
  process.env.BYPASS_REGISTRATION_POLICY_IN_TEST = shouldBypassRegistrationPolicy ? 'true' : 'false';

  const shouldEnableRedis =
    isExplicitTrue(explicitEnv.REDIS_ENABLED) && typeof explicitEnv.REDIS_URL === 'string'
      ? explicitEnv.REDIS_URL.trim().length > 0
      : false;
  process.env.REDIS_ENABLED = shouldEnableRedis ? 'true' : 'false';
  if (shouldEnableRedis && typeof explicitEnv.REDIS_URL === 'string') {
    process.env.REDIS_URL = explicitEnv.REDIS_URL.trim();
  } else {
    delete process.env.REDIS_URL;
  }

  if (!shouldVerifyTestDb) {
    return;
  }

  // setupFilesAfterEnv runs for each test file, so use process-level state.
  if (process.env[DB_COMPAT_SETUP_FLAG] === 'true') {
    return;
  }

  // Avoid concurrent DDL across parallel Jest workers; one pass is sufficient.
  if (process.env.JEST_WORKER_ID && process.env.JEST_WORKER_ID !== '1') {
    return;
  }

  let dbClient: PoolClient | undefined;
  try {
    dbClient = await pool.connect();
    await dbClient.query("SET lock_timeout TO '2000ms'");
    await dbClient.query("SET statement_timeout TO '30000ms'");
    await assertTestSchemaReady(dbClient);
    process.env[DB_COMPAT_SETUP_FLAG] = 'true';
  } catch (error) {
    throw new Error(
      `Unable to prepare the test database for Jest: ${formatErrorMessage(error)}`
    );
  } finally {
    dbClient?.release();
  }
});

afterAll(async () => {
  // In --runInBand mode, the pool is a singleton across test files.
  // Ending it here would break subsequent test files in the same process.
  // Jest will close the process and the pool when finished.
  /*
  try {
    await pool.end();
  } catch {
    // Allow unit suites without an active DB connection to complete cleanly.
  }
  */
});
