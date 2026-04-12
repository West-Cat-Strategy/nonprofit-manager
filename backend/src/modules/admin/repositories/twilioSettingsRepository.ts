import pool from '@config/database';

export interface SettingsRow {
  id: string;
  account_sid: string | null;
  auth_token_encrypted: string | null;
  messaging_service_sid: string | null;
  from_phone_number: string | null;
  is_configured: boolean;
  last_tested_at: Date | null;
  last_test_success: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export const TWILIO_SETTINGS_COLUMNS = [
  'id',
  'account_sid',
  'auth_token_encrypted',
  'messaging_service_sid',
  'from_phone_number',
  'is_configured',
  'last_tested_at',
  'last_test_success',
  'created_at',
  'updated_at',
].join(', ');

export const getTwilioSettingsRow = async (): Promise<SettingsRow | null> => {
  const result = await pool.query<SettingsRow>(
    `SELECT ${TWILIO_SETTINGS_COLUMNS} FROM twilio_settings ORDER BY created_at LIMIT 1`
  );
  return result.rows[0] ?? null;
};

export const updateTwilioSettingsRow = async (
  setClauses: string[],
  values: unknown[]
): Promise<SettingsRow | null> => {
  const result = await pool.query<SettingsRow>(
    `UPDATE twilio_settings
     SET ${setClauses.join(', ')}
     WHERE id = (SELECT id FROM twilio_settings ORDER BY created_at LIMIT 1)
     RETURNING ${TWILIO_SETTINGS_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
};
