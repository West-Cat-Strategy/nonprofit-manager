/**
 * Email Settings Service
 * CRUD operations for organisation-level SMTP/IMAP configuration.
 * Passwords are encrypted before storage and decrypted on read.
 */

import pool from '@config/database';
import { logger } from '@config/logger';
import { encrypt } from '@utils/encryption';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailSettings {
  id: string;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFromAddress: string | null;
  smtpFromName: string | null;
  imapHost: string | null;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string | null;
  isConfigured: boolean;
  lastTestedAt: Date | null;
  lastTestSuccess: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateEmailSettingsDTO {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string; // plain-text, will be encrypted before storage
  smtpFromAddress?: string;
  smtpFromName?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapUser?: string;
  imapPass?: string; // plain-text, will be encrypted before storage
}

interface SettingsRow {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRow(row: SettingsRow): EmailSettings {
  return {
    id: row.id,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpSecure: row.smtp_secure,
    smtpUser: row.smtp_user,
    smtpFromAddress: row.smtp_from_address,
    smtpFromName: row.smtp_from_name,
    imapHost: row.imap_host,
    imapPort: row.imap_port,
    imapSecure: row.imap_secure,
    imapUser: row.imap_user,
    isConfigured: row.is_configured,
    lastTestedAt: row.last_tested_at,
    lastTestSuccess: row.last_test_success,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve the current email settings.
 * Passwords are never returned to the caller.
 */
export async function getEmailSettings(): Promise<EmailSettings | null> {
  const result = await pool.query<SettingsRow>(
    'SELECT * FROM email_settings ORDER BY created_at LIMIT 1'
  );

  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

/**
 * Check whether passwords are currently stored (without revealing them).
 */
export async function hasStoredCredentials(): Promise<{ smtp: boolean; imap: boolean }> {
  const result = await pool.query<{ smtp_pass_encrypted: string | null; imap_pass_encrypted: string | null }>(
    'SELECT smtp_pass_encrypted, imap_pass_encrypted FROM email_settings ORDER BY created_at LIMIT 1'
  );

  if (result.rows.length === 0) return { smtp: false, imap: false };
  return {
    smtp: !!result.rows[0].smtp_pass_encrypted,
    imap: !!result.rows[0].imap_pass_encrypted,
  };
}

/**
 * Update email settings. Password fields are encrypted if provided.
 * Omitting a password field keeps the existing value.
 */
export async function updateEmailSettings(
  data: UpdateEmailSettingsDTO,
  userId: string
): Promise<EmailSettings> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const addParam = (column: string, value: unknown): void => {
    setClauses.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  };

  if (data.smtpHost !== undefined) addParam('smtp_host', data.smtpHost);
  if (data.smtpPort !== undefined) addParam('smtp_port', data.smtpPort);
  if (data.smtpSecure !== undefined) addParam('smtp_secure', data.smtpSecure);
  if (data.smtpUser !== undefined) addParam('smtp_user', data.smtpUser);
  if (data.smtpPass !== undefined) addParam('smtp_pass_encrypted', encrypt(data.smtpPass));
  if (data.smtpFromAddress !== undefined) addParam('smtp_from_address', data.smtpFromAddress);
  if (data.smtpFromName !== undefined) addParam('smtp_from_name', data.smtpFromName);
  if (data.imapHost !== undefined) addParam('imap_host', data.imapHost);
  if (data.imapPort !== undefined) addParam('imap_port', data.imapPort);
  if (data.imapSecure !== undefined) addParam('imap_secure', data.imapSecure);
  if (data.imapUser !== undefined) addParam('imap_user', data.imapUser);
  if (data.imapPass !== undefined) addParam('imap_pass_encrypted', encrypt(data.imapPass));

  // Determine is_configured based on minimum required SMTP fields
  const smtpHost = data.smtpHost;
  const smtpUser = data.smtpUser;
  const smtpFrom = data.smtpFromAddress;
  const smtpPass = data.smtpPass;

  // We can only accurately set is_configured if we have ALL required fields.
  // If any were omitted, fetch current values.
  if (smtpHost !== undefined || smtpUser !== undefined || smtpFrom !== undefined || smtpPass !== undefined) {
    const current = await pool.query<SettingsRow>(
      'SELECT smtp_host, smtp_user, smtp_from_address, smtp_pass_encrypted FROM email_settings ORDER BY created_at LIMIT 1'
    );
    const cur = current.rows[0] || {};
    const effectiveHost = smtpHost ?? cur.smtp_host;
    const effectiveUser = smtpUser ?? cur.smtp_user;
    const effectiveFrom = smtpFrom ?? cur.smtp_from_address;
    const effectivePass = smtpPass !== undefined ? true : !!cur.smtp_pass_encrypted;

    const configured = !!(effectiveHost && effectiveUser && effectiveFrom && effectivePass);
    addParam('is_configured', configured);
  }

  addParam('modified_by', userId);
  addParam('updated_at', new Date());

  if (setClauses.length === 0) {
    const existing = await getEmailSettings();
    if (!existing) throw new Error('Email settings not found');
    return existing;
  }

  const result = await pool.query<SettingsRow>(
    `UPDATE email_settings SET ${setClauses.join(', ')}
     WHERE id = (SELECT id FROM email_settings ORDER BY created_at LIMIT 1)
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Email settings not found');
  }

  logger.info('Email settings updated', { userId });
  return mapRow(result.rows[0]);
}
