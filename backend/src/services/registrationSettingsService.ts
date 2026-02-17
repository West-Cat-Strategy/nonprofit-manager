/**
 * Registration Settings Service
 * CRUD operations for the system-wide registration_settings singleton.
 */

import pool from '@config/database';
import { logger } from '@config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RegistrationMode = 'disabled' | 'approval_required';

export interface RegistrationSettings {
  id: string;
  registrationMode: RegistrationMode;
  defaultRole: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateRegistrationSettingsDTO {
  registrationMode?: RegistrationMode;
  defaultRole?: string;
}

interface SettingsRow {
  id: string;
  registration_mode: RegistrationMode;
  default_role: string;
  created_at: Date;
  updated_at: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toModel(row: SettingsRow): RegistrationSettings {
  return {
    id: row.id,
    registrationMode: row.registration_mode,
    defaultRole: row.default_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the current registration settings (creates a default row if none exists).
 */
export async function getRegistrationSettings(): Promise<RegistrationSettings> {
  const result = await pool.query<SettingsRow>(
    'SELECT * FROM registration_settings ORDER BY created_at LIMIT 1'
  );

  if (result.rows.length > 0) {
    return toModel(result.rows[0]);
  }

  // Ensure singleton row exists
  const insert = await pool.query<SettingsRow>(
    `INSERT INTO registration_settings (registration_mode) VALUES ('disabled')
     RETURNING *`
  );
  return toModel(insert.rows[0]);
}

/**
 * Update registration settings.
 */
export async function updateRegistrationSettings(
  dto: UpdateRegistrationSettingsDTO,
  modifiedBy?: string
): Promise<RegistrationSettings> {
  const current = await getRegistrationSettings();

  const mode = dto.registrationMode ?? current.registrationMode;
  const role = dto.defaultRole ?? current.defaultRole;

  const result = await pool.query<SettingsRow>(
    `UPDATE registration_settings
     SET registration_mode = $1,
         default_role = $2,
         modified_by = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [mode, role, modifiedBy ?? null, current.id]
  );

  logger.info(`Registration settings updated: mode=${mode}, defaultRole=${role}`);
  return toModel(result.rows[0]);
}

/**
 * Quick helper used by the register endpoint and the public status endpoint.
 * Returns just the mode string for fast checks.
 */
export async function getRegistrationMode(): Promise<RegistrationMode> {
  const settings = await getRegistrationSettings();
  return settings.registrationMode;
}
