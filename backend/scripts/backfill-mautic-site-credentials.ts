import dotenv from 'dotenv';
import pool from '../src/config/database';
import { logger } from '../src/config/logger';
import { encrypt } from '../src/utils/encryption';

dotenv.config({ path: '.env', quiet: true });

interface LegacyMauticCredentialRow {
  site_id: string;
  mautic_config: Record<string, unknown> | null;
}

interface QueryablePool {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

const readLegacyPassword = (config: Record<string, unknown> | null): string | null => {
  const password = config?.password;
  if (typeof password !== 'string') {
    return null;
  }

  const trimmed = password.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function backfillMauticSiteCredentials(
  db: QueryablePool = pool,
  options: { dryRun?: boolean } = {}
): Promise<{ migrated: number; dryRun: boolean }> {
  const dryRun = Boolean(options.dryRun);
  const result = await db.query<LegacyMauticCredentialRow>(
    `SELECT site_id, mautic_config
     FROM website_site_settings
     WHERE mautic_password_encrypted IS NULL
       AND NULLIF(mautic_config->>'password', '') IS NOT NULL
     ORDER BY site_id ASC`
  );

  let migrated = 0;
  for (const row of result.rows) {
    const password = readLegacyPassword(row.mautic_config);
    if (!password) {
      continue;
    }

    migrated += 1;
    if (dryRun) {
      continue;
    }

    await db.query(
      `UPDATE website_site_settings
       SET mautic_password_encrypted = $1,
           mautic_config = COALESCE(mautic_config, '{}'::jsonb) - 'password',
           updated_at = CURRENT_TIMESTAMP
       WHERE site_id = $2`,
      [encrypt(password), row.site_id]
    );
  }

  return { migrated, dryRun };
}

async function main(): Promise<void> {
  const result = await backfillMauticSiteCredentials(pool, {
    dryRun: process.argv.includes('--dry-run'),
  });

  logger.info('Mautic site credential backfill finished', {
    ...result,
  });
}

if (require.main === module) {
  main()
    .catch((error) => {
      logger.error('Mautic site credential backfill failed', { error });
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end().catch(() => undefined);
    });
}
