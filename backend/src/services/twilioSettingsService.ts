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

const TWILIO_SETTINGS_COLUMNS = [
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

const getTwilioSettingsRow = async (): Promise<SettingsRow | null> => {
  const result = await pool.query<SettingsRow>(
    `SELECT ${TWILIO_SETTINGS_COLUMNS} FROM twilio_settings ORDER BY created_at LIMIT 1`
  );

  return result.rows[0] ?? null;
};

const computeIsConfigured = (params: {
  accountSid: string | null | undefined;
  authTokenPresent: boolean;
  messagingServiceSid: string | null | undefined;
  fromPhoneNumber: string | null | undefined;
}): boolean =>
  Boolean(
    params.accountSid &&
      params.authTokenPresent &&
      (params.messagingServiceSid || params.fromPhoneNumber)
  );

/**
 * Retrieve current Twilio settings.
 */
export async function getTwilioSettings(): Promise<TwilioSettings | null> {
  const row = await getTwilioSettingsRow();
  return row ? mapRow(row) : null;
}

/**
 * Check whether an auth token is currently stored (without revealing it).
 */
export async function hasStoredCredentials(): Promise<{ authToken: boolean }> {
  const row = await getTwilioSettingsRow();
  return {
    authToken: Boolean(row?.auth_token_encrypted),
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

  if (
    data.accountSid !== undefined ||
    data.authToken !== undefined ||
    data.messagingServiceSid !== undefined ||
    data.fromPhoneNumber !== undefined
  ) {
    const current = await getTwilioSettingsRow();
    const configured = computeIsConfigured({
      accountSid: data.accountSid !== undefined ? data.accountSid : current?.account_sid,
      authTokenPresent:
        data.authToken !== undefined ? data.authToken.trim().length > 0 : Boolean(current?.auth_token_encrypted),
      messagingServiceSid:
        data.messagingServiceSid !== undefined ? data.messagingServiceSid : current?.messaging_service_sid,
      fromPhoneNumber:
        data.fromPhoneNumber !== undefined ? data.fromPhoneNumber : current?.from_phone_number,
    });
    addParam('is_configured', configured);
  }

  addParam('modified_by', userId);
  addParam('updated_at', new Date());

  if (setClauses.length === 0) {
    const existing = await getTwilioSettingsRow();
    if (!existing) {
      throw new Error('Twilio settings not found');
    }
    return mapRow(existing);
  }

  const result = await pool.query<SettingsRow>(
    `UPDATE twilio_settings
     SET ${setClauses.join(', ')}
     WHERE id = (SELECT id FROM twilio_settings ORDER BY created_at LIMIT 1)
     RETURNING ${TWILIO_SETTINGS_COLUMNS}`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Twilio settings not found');
  }

  logger.info('Twilio settings updated', { userId });
  return mapRow(result.rows[0]);
}
