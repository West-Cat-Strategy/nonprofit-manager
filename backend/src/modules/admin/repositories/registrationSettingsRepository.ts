import pool from '@config/database';

export type RegistrationMode = 'disabled' | 'approval_required';

export interface SettingsRow {
  id: string;
  registration_mode: RegistrationMode;
  default_role: string;
  created_at: Date;
  updated_at: Date;
}

export const SETTINGS_COLUMNS = [
  'id',
  'registration_mode',
  'default_role',
  'created_at',
  'updated_at',
].join(', ');

export const getRegistrationSettingsRow = async (): Promise<SettingsRow | null> => {
  const result = await pool.query<SettingsRow>(
    `SELECT ${SETTINGS_COLUMNS}
     FROM registration_settings
     ORDER BY created_at
     LIMIT 1`
  );
  return result.rows[0] ?? null;
};

export const insertDefaultRegistrationSettingsRow = async (): Promise<SettingsRow> => {
  const insert = await pool.query<SettingsRow>(
    `INSERT INTO registration_settings (registration_mode) VALUES ('disabled')
     RETURNING ${SETTINGS_COLUMNS}`
  );
  return insert.rows[0];
};

export const updateRegistrationSettingsRow = async (
  mode: RegistrationMode,
  role: string,
  modifiedBy: string | null,
  id: string
): Promise<SettingsRow> => {
  const result = await pool.query<SettingsRow>(
    `UPDATE registration_settings
     SET registration_mode = $1,
         default_role = $2,
         modified_by = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING ${SETTINGS_COLUMNS}`,
    [mode, role, modifiedBy, id]
  );
  return result.rows[0];
};
