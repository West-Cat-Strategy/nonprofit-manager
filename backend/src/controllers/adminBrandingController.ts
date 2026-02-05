import type { Response } from 'express';
import pool from '../config/database';
import { logger } from '../config/logger';
import type { AuthRequest } from '../middleware/auth';
import { badRequest, serverError } from '../utils/responseHelpers';

type BrandingConfig = {
  appName: string;
  appIcon: string | null;
  primaryColour: string;
  secondaryColour: string;
  favicon: string | null;
};

const ensureBrandingTable = async () => {
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

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
};

const parseBrandingConfig = (input: unknown): BrandingConfig | null => {
  if (!isPlainObject(input)) return null;

  const appName = input.appName;
  const appIcon = input.appIcon;
  const primaryColour = input.primaryColour;
  const secondaryColour = input.secondaryColour;
  const favicon = input.favicon;

  if (typeof appName !== 'string' || appName.trim().length === 0) return null;
  if (appIcon !== null && typeof appIcon !== 'string') return null;
  if (!isValidHexColor(primaryColour)) return null;
  if (!isValidHexColor(secondaryColour)) return null;
  if (favicon !== null && typeof favicon !== 'string') return null;

  return {
    appName: appName.trim(),
    appIcon,
    primaryColour,
    secondaryColour,
    favicon,
  };
};

export const getBranding = async (_req: AuthRequest, res: Response) => {
  try {
    // Read-only access: any authenticated user can read branding.
    const result = await pool.query('SELECT config FROM organization_branding WHERE id = 1');
    const config = (result.rows[0]?.config ?? {}) as BrandingConfig | Record<string, unknown>;
    return res.json(config);
  } catch (error) {
    const err = error as { code?: string } | undefined;
    if (err?.code === '42P01') {
      // Migration not applied yet; create the table so clients can use defaults.
      await ensureBrandingTable();
      const result = await pool.query('SELECT config FROM organization_branding WHERE id = 1');
      return res.json((result.rows[0]?.config ?? {}) as BrandingConfig | Record<string, unknown>);
    }
    logger.error('Failed to fetch organization branding', { error });
    return serverError(res, 'Failed to fetch branding');
  }
};

export const putBranding = async (req: AuthRequest, res: Response) => {
  const brandingConfig = parseBrandingConfig(req.body);
  if (!brandingConfig) {
    return badRequest(
      res,
      'Invalid branding payload. Expected { appName, appIcon, primaryColour, secondaryColour, favicon }'
    );
  }

  try {
    const result = await pool.query(
      `INSERT INTO organization_branding (id, config, created_at, updated_at)
       VALUES (1, $1::jsonb, NOW(), NOW())
       ON CONFLICT (id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
       RETURNING config`,
      [JSON.stringify(brandingConfig)]
    );

    logger.info('Organization branding updated', { userId: req.user?.id });
    return res.json(result.rows[0].config);
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
      return res.json(result.rows[0].config);
    }
    logger.error('Failed to update organization branding', { error, userId: req.user?.id });
    return serverError(res, 'Failed to update branding');
  }
};
