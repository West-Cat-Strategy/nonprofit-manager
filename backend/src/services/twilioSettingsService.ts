/**
 * Twilio Settings Service
 * CRUD operations for organization-level Twilio SMS configuration.
 * Auth token is encrypted before storage.
 */

import pool from '@config/database';
import { logger } from '@config/logger';
import { encrypt } from '@utils/encryption';

export interface TwilioSettings {
  id: string;
  accountSid: string | null;
  messagingServiceSid: string | null;
  fromPhoneNumber: string | null;
  isConfigured: boolean;
  lastTestedAt: Date | null;
  lastTestSuccess: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateTwilioSettingsDTO {
  accountSid?: string | null;
  authToken?: string;
  messagingServiceSid?: string | null;
  fromPhoneNumber?: string | null;
}

interface SettingsRow {
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

const mapRow = (row: SettingsRow): TwilioSettings => ({
  id: row.id,
  accountSid: row.account_sid,
  messagingServiceSid: row.messaging_service_sid,
  fromPhoneNumber: row.from_phone_number,
  isConfigured: row.is_configured,
  lastTestedAt: row.last_tested_at,
  lastTestSuccess: row.last_test_success,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Retrieve current Twilio settings.
 */
export async function getTwilioSettings(): Promise<TwilioSettings | null> {
  const result = await pool.query<SettingsRow>(
    'SELECT * FROM twilio_settings ORDER BY created_at LIMIT 1'
  );

  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

/**
 * Check whether an auth token is currently stored (without revealing it).
 */
export async function hasStoredCredentials(): Promise<{ authToken: boolean }> {
  const result = await pool.query<{ auth_token_encrypted: string | null }>(
    'SELECT auth_token_encrypted FROM twilio_settings ORDER BY created_at LIMIT 1'
  );

  if (result.rows.length === 0) return { authToken: false };
  return {
    authToken: !!result.rows[0].auth_token_encrypted,
  };
}

/**
 * Update Twilio settings.
 */
export async function updateTwilioSettings(
  data: UpdateTwilioSettingsDTO,
  userId: string
): Promise<TwilioSettings> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const addParam = (column: string, value: unknown): void => {
    setClauses.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  };

  if (data.accountSid !== undefined) addParam('account_sid', data.accountSid);
  if (data.messagingServiceSid !== undefined) addParam('messaging_service_sid', data.messagingServiceSid);
  if (data.fromPhoneNumber !== undefined) addParam('from_phone_number', data.fromPhoneNumber);
  if (data.authToken !== undefined) {
    addParam('auth_token_encrypted', data.authToken.trim() ? encrypt(data.authToken) : null);
  }

  // Recompute is_configured when config inputs were touched.
  if (
    data.accountSid !== undefined ||
    data.authToken !== undefined ||
    data.messagingServiceSid !== undefined ||
    data.fromPhoneNumber !== undefined
  ) {
    const current = await pool.query<{
      account_sid: string | null;
      auth_token_encrypted: string | null;
      messaging_service_sid: string | null;
      from_phone_number: string | null;
    }>(
      `SELECT account_sid, auth_token_encrypted, messaging_service_sid, from_phone_number
       FROM twilio_settings
       ORDER BY created_at
       LIMIT 1`
    );
    const cur = current.rows[0] || {};

    const effectiveAccountSid = data.accountSid !== undefined ? data.accountSid : cur.account_sid;
    const hasEffectiveToken =
      data.authToken !== undefined ? Boolean(data.authToken.trim()) : Boolean(cur.auth_token_encrypted);
    const effectiveMessagingServiceSid =
      data.messagingServiceSid !== undefined ? data.messagingServiceSid : cur.messaging_service_sid;
    const effectiveFromNumber =
      data.fromPhoneNumber !== undefined ? data.fromPhoneNumber : cur.from_phone_number;

    const configured = Boolean(
      effectiveAccountSid &&
      hasEffectiveToken &&
      (effectiveMessagingServiceSid || effectiveFromNumber)
    );
    addParam('is_configured', configured);
  }

  addParam('modified_by', userId);
  addParam('updated_at', new Date());

  if (setClauses.length === 0) {
    const existing = await getTwilioSettings();
    if (!existing) throw new Error('Twilio settings not found');
    return existing;
  }

  const result = await pool.query<SettingsRow>(
    `UPDATE twilio_settings
     SET ${setClauses.join(', ')}
     WHERE id = (SELECT id FROM twilio_settings ORDER BY created_at LIMIT 1)
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Twilio settings not found');
  }

  logger.info('Twilio settings updated', { userId });
  return mapRow(result.rows[0]);
}
