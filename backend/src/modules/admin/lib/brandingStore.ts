import pool from '@config/database';

export type BrandingConfig = {
  appName: string;
  appIcon: string | null;
  primaryColour: string;
  secondaryColour: string;
  favicon: string | null;
};

export const ensureBrandingTable = async (): Promise<void> => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS organization_branding (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`
  );
  await pool.query(
    `INSERT INTO organization_branding (id, config)
     VALUES (1, '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`
  );
};

export const getOrganizationBrandingConfig = async (): Promise<BrandingConfig | Record<string, unknown>> => {
  try {
    const result = await pool.query('SELECT config FROM organization_branding WHERE id = 1');
    return (result.rows[0]?.config ?? {}) as BrandingConfig | Record<string, unknown>;
  } catch (error) {
    const err = error as { code?: string } | undefined;
    if (err?.code === '42P01') {
      await ensureBrandingTable();
      const result = await pool.query('SELECT config FROM organization_branding WHERE id = 1');
      return (result.rows[0]?.config ?? {}) as BrandingConfig | Record<string, unknown>;
    }
    throw error;
  }
};

export const upsertOrganizationBrandingConfig = async (
  brandingConfig: BrandingConfig
): Promise<BrandingConfig | Record<string, unknown>> => {
  try {
    const result = await pool.query(
      `INSERT INTO organization_branding (id, config, created_at, updated_at)
       VALUES (1, $1::jsonb, NOW(), NOW())
       ON CONFLICT (id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
       RETURNING config`,
      [JSON.stringify(brandingConfig)]
    );
    return result.rows[0].config as BrandingConfig | Record<string, unknown>;
  } catch (error) {
    const err = error as { code?: string } | undefined;
    if (err?.code === '42P01') {
      await ensureBrandingTable();
      const result = await pool.query(
        `INSERT INTO organization_branding (id, config, created_at, updated_at)
         VALUES (1, $1::jsonb, NOW(), NOW())
         ON CONFLICT (id)
         DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
         RETURNING config`,
        [JSON.stringify(brandingConfig)]
      );
      return result.rows[0].config as BrandingConfig | Record<string, unknown>;
    }
    throw error;
  }
};
