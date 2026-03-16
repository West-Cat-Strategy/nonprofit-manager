import pool from '@config/database';
import type {
  OrganizationSettings,
  OrganizationSettingsConfig,
} from '@app-types/organizationSettings';
import {
  createDefaultOrganizationAddress,
  createDefaultOrganizationSettingsConfig,
} from '@app-types/organizationSettings';
import {
  normalizeWorkspaceModulesConfig,
  type WorkspaceModuleKey,
} from '@app-types/workspaceModules';

type SettingsRow = {
  organization_id: string;
  config: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim();
};

const mergeAddress = (
  base: ReturnType<typeof createDefaultOrganizationAddress>,
  input: unknown
) => {
  if (!isPlainObject(input)) {
    return { ...base };
  }

  return {
    line1: readString(input.line1) ?? base.line1,
    line2: readString(input.line2) ?? base.line2,
    city: readString(input.city) ?? base.city,
    province: readString(input.province) ?? base.province,
    postalCode: readString(input.postalCode) ?? base.postalCode,
    country: readString(input.country) ?? base.country,
  };
};

const normalizeOrganizationSettingsConfig = (
  input: Partial<OrganizationSettingsConfig> | Record<string, unknown> | null | undefined
): OrganizationSettingsConfig => {
  const defaults = createDefaultOrganizationSettingsConfig();
  if (!input || !isPlainObject(input)) {
    return defaults;
  }

  const taxReceiptInput = isPlainObject(input.taxReceipt) ? input.taxReceipt : {};

  return {
    name: readString(input.name) ?? defaults.name,
    email: readString(input.email) ?? defaults.email,
    phone: readString(input.phone) ?? defaults.phone,
    website: readString(input.website) ?? defaults.website,
    address: mergeAddress(defaults.address, input.address),
    timezone: readString(input.timezone) ?? defaults.timezone,
    dateFormat: readString(input.dateFormat) ?? defaults.dateFormat,
    currency: readString(input.currency) ?? defaults.currency,
    fiscalYearStart: readString(input.fiscalYearStart) ?? defaults.fiscalYearStart,
    measurementSystem:
      input.measurementSystem === 'imperial' ? 'imperial' : defaults.measurementSystem,
    phoneFormat:
      input.phoneFormat === 'canadian' ||
      input.phoneFormat === 'us' ||
      input.phoneFormat === 'international'
        ? input.phoneFormat
        : defaults.phoneFormat,
    taxReceipt: {
      legalName: readString(taxReceiptInput.legalName) ?? defaults.taxReceipt.legalName,
      charitableRegistrationNumber:
        readString(taxReceiptInput.charitableRegistrationNumber) ??
        defaults.taxReceipt.charitableRegistrationNumber,
      receiptingAddress: mergeAddress(
        defaults.taxReceipt.receiptingAddress,
        taxReceiptInput.receiptingAddress
      ),
      receiptIssueLocation:
        readString(taxReceiptInput.receiptIssueLocation) ??
        defaults.taxReceipt.receiptIssueLocation,
      authorizedSignerName:
        readString(taxReceiptInput.authorizedSignerName) ??
        defaults.taxReceipt.authorizedSignerName,
      authorizedSignerTitle:
        readString(taxReceiptInput.authorizedSignerTitle) ??
        defaults.taxReceipt.authorizedSignerTitle,
      contactEmail:
        readString(taxReceiptInput.contactEmail) ?? defaults.taxReceipt.contactEmail,
      contactPhone:
        readString(taxReceiptInput.contactPhone) ?? defaults.taxReceipt.contactPhone,
      advantageAmount:
        typeof taxReceiptInput.advantageAmount === 'number'
          ? taxReceiptInput.advantageAmount
          : defaults.taxReceipt.advantageAmount,
    },
    workspaceModules: normalizeWorkspaceModulesConfig(
      input.workspaceModules as Partial<OrganizationSettingsConfig['workspaceModules']>
    ),
  };
};

const toOrganizationSettings = (row: SettingsRow): OrganizationSettings => ({
  organizationId: row.organization_id,
  config: normalizeOrganizationSettingsConfig(row.config),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const ensureOrganizationSettingsTable = async (): Promise<void> => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS organization_settings (
      organization_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await pool.query(
    `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_settings_updated_at'
      ) THEN
        CREATE TRIGGER update_organization_settings_updated_at
          BEFORE UPDATE ON organization_settings
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$;`
  );
};

const buildLegacyOrganizationSeed = async (
  userId: string
): Promise<OrganizationSettingsConfig> => {
  const defaults = createDefaultOrganizationSettingsConfig();
  const result = await pool.query<{ preferences: Record<string, unknown> | null }>(
    'SELECT preferences FROM users WHERE id = $1',
    [userId]
  );

  const preferences = result.rows[0]?.preferences;
  const legacyOrganization = isPlainObject(preferences?.organization)
    ? preferences.organization
    : null;

  const config = normalizeOrganizationSettingsConfig(legacyOrganization);

  const issueLocation = [config.address.city, config.address.province]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ');

  return {
    ...defaults,
    ...config,
    address: {
      ...defaults.address,
      ...config.address,
    },
    taxReceipt: {
      ...defaults.taxReceipt,
      legalName: config.name || defaults.taxReceipt.legalName,
      receiptingAddress: {
        ...config.address,
      },
      receiptIssueLocation: issueLocation || defaults.taxReceipt.receiptIssueLocation,
      contactEmail: config.email || defaults.taxReceipt.contactEmail,
      contactPhone: config.phone || defaults.taxReceipt.contactPhone,
      authorizedSignerName: defaults.taxReceipt.authorizedSignerName,
      authorizedSignerTitle: defaults.taxReceipt.authorizedSignerTitle,
      charitableRegistrationNumber: defaults.taxReceipt.charitableRegistrationNumber,
      advantageAmount: defaults.taxReceipt.advantageAmount,
    },
  };
};

const getRow = async (organizationId: string): Promise<SettingsRow | null> => {
  const result = await pool.query<SettingsRow>(
    `SELECT organization_id, config, created_at, updated_at
     FROM organization_settings
     WHERE organization_id = $1`,
    [organizationId]
  );

  return result.rows[0] ?? null;
};

export const findOrganizationSettings = async (
  organizationId: string
): Promise<OrganizationSettings | null> => {
  try {
    const row = await getRow(organizationId);
    return row ? toOrganizationSettings(row) : null;
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '42P01') {
      return null;
    }
    throw error;
  }
};

export const getOrganizationWorkspaceModuleEnabled = async (
  organizationId: string,
  moduleKey: WorkspaceModuleKey
): Promise<boolean> => {
  const settings = await findOrganizationSettings(organizationId);
  return settings?.config.workspaceModules[moduleKey] ?? true;
};

export const getOrganizationSettings = async (
  organizationId: string,
  userIdForSeed?: string
): Promise<OrganizationSettings> => {
  try {
    const existing = await getRow(organizationId);
    if (existing) {
      return toOrganizationSettings(existing);
    }
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code !== '42P01') {
      throw error;
    }
    await ensureOrganizationSettingsTable();
  }

  const seededConfig = userIdForSeed
    ? await buildLegacyOrganizationSeed(userIdForSeed)
    : createDefaultOrganizationSettingsConfig();

  return upsertOrganizationSettings(organizationId, seededConfig, userIdForSeed ?? null);
};

export const upsertOrganizationSettings = async (
  organizationId: string,
  config: OrganizationSettingsConfig,
  userId: string | null
): Promise<OrganizationSettings> => {
  try {
    const normalizedConfig = normalizeOrganizationSettingsConfig(config);
    const result = await pool.query<SettingsRow>(
      `INSERT INTO organization_settings (
         organization_id,
         config,
         created_by,
         modified_by,
         created_at,
         updated_at
       )
       VALUES ($1, $2::jsonb, $3, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (organization_id)
       DO UPDATE SET
         config = EXCLUDED.config,
         modified_by = EXCLUDED.modified_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING organization_id, config, created_at, updated_at`,
      [organizationId, JSON.stringify(normalizedConfig), userId]
    );

    return toOrganizationSettings(result.rows[0]);
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '42P01') {
      await ensureOrganizationSettingsTable();
      return upsertOrganizationSettings(organizationId, config, userId);
    }
    throw error;
  }
};
