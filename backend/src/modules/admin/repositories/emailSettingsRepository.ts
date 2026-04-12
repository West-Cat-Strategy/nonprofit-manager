import pool from '@config/database';

export interface SettingsRow {
  id: string;
  smtp_host: string | null;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string | null;
  smtp_pass_encrypted: string | null;
  smtp_from_address: string | null;
  smtp_from_name: string | null;
  imap_host: string | null;
  imap_port: number;
  imap_secure: boolean;
  imap_user: string | null;
  imap_pass_encrypted: string | null;
  is_configured: boolean;
  last_tested_at: Date | null;
  last_test_success: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export const EMAIL_SETTINGS_COLUMNS = [
  'id',
  'smtp_host',
  'smtp_port',
  'smtp_secure',
  'smtp_user',
  'smtp_pass_encrypted',
  'smtp_from_address',
  'smtp_from_name',
  'imap_host',
  'imap_port',
  'imap_secure',
  'imap_user',
  'imap_pass_encrypted',
  'is_configured',
  'last_tested_at',
  'last_test_success',
  'created_at',
  'updated_at',
].join(', ');

export const getEmailSettingsRow = async (): Promise<SettingsRow | null> => {
  const result = await pool.query<SettingsRow>(
    `SELECT ${EMAIL_SETTINGS_COLUMNS} FROM email_settings ORDER BY created_at LIMIT 1`
  );
  return result.rows[0] ?? null;
};

export const getEncryptedCredentialsRow = async (): Promise<{
  smtp_pass_encrypted: string | null;
  imap_pass_encrypted: string | null;
} | null> => {
  const result = await pool.query<{
    smtp_pass_encrypted: string | null;
    imap_pass_encrypted: string | null;
  }>(
    'SELECT smtp_pass_encrypted, imap_pass_encrypted FROM email_settings ORDER BY created_at LIMIT 1'
  );
  return result.rows[0] ?? null;
};

export const updateEmailSettingsRow = async (
  setClauses: string[],
  values: unknown[]
): Promise<SettingsRow | null> => {
  const result = await pool.query<SettingsRow>(
    `UPDATE email_settings SET ${setClauses.join(', ')}
     WHERE id = (SELECT id FROM email_settings ORDER BY created_at LIMIT 1)
     RETURNING ${EMAIL_SETTINGS_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
};
