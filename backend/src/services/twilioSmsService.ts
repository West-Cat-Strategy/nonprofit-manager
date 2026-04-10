/**
 * Twilio SMS Service
 * Sends SMS reminders through Twilio using credentials from twilio_settings.
 */

import twilio from 'twilio';
import pool from '@config/database';
import { logger } from '@config/logger';
import { decrypt } from '@utils/encryption';

const TWILIO_API_TIMEOUT_MS = 15_000;
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

interface TwilioSettingsRow {
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

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string | null;
  fromPhoneNumber: string | null;
}

type TwilioClient = ReturnType<typeof twilio>;

export interface SendSmsOptions {
  to: string;
  body: string;
}

export interface SmsSendResult {
  success: boolean;
  to: string;
  normalizedTo?: string;
  sid?: string;
  error?: string;
}

export interface SmsTestResult {
  success: boolean;
  error?: string;
}

const getTwilioSettingsRow = async (): Promise<TwilioSettingsRow | null> => {
  const result = await pool.query<TwilioSettingsRow>(
    `SELECT ${TWILIO_SETTINGS_COLUMNS} FROM twilio_settings ORDER BY created_at LIMIT 1`
  );

  return result.rows[0] ?? null;
};

const createTwilioClient = (config: TwilioConfig): TwilioClient =>
  twilio(config.accountSid, config.authToken, { timeout: TWILIO_API_TIMEOUT_MS });

const getTwilioConfig = async (): Promise<TwilioConfig | null> => {
  const row = await getTwilioSettingsRow();
  if (!row || !row.is_configured || !row.account_sid || !row.auth_token_encrypted) {
    return null;
  }

  let authToken: string;
  try {
    authToken = decrypt(row.auth_token_encrypted);
  } catch {
    logger.error('Failed to decrypt Twilio auth token');
    return null;
  }

  if (!row.messaging_service_sid && !row.from_phone_number) {
    return null;
  }

  return {
    accountSid: row.account_sid,
    authToken,
    messagingServiceSid: row.messaging_service_sid,
    fromPhoneNumber: row.from_phone_number,
  };
};

const recordTwilioTestResult = async (success: boolean): Promise<void> => {
  const row = await getTwilioSettingsRow();
  if (!row) {
    return;
  }

  await pool.query(
    `UPDATE twilio_settings
     SET last_tested_at = NOW(),
         last_test_success = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [success, row.id]
  );
};

/**
 * Convert local phone formats to E.164 for Twilio.
 * Assumes +1 for 10-digit North American numbers.
 */
export const normalizePhoneForSms = (rawPhone: string): string | null => {
  const trimmed = rawPhone.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      return `+${digits}`;
    }
    return null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return null;
};

/**
 * Send a single SMS through Twilio.
 */
export async function sendSms(options: SendSmsOptions): Promise<SmsSendResult> {
  const config = await getTwilioConfig();
  if (!config) {
    return {
      success: false,
      to: options.to,
      error: 'Twilio SMS is not configured',
    };
  }

  const normalizedTo = normalizePhoneForSms(options.to);
  if (!normalizedTo) {
    return {
      success: false,
      to: options.to,
      error: 'Invalid recipient phone number',
    };
  }

  const client = createTwilioClient(config);
  const normalizedFrom = config.fromPhoneNumber ? normalizePhoneForSms(config.fromPhoneNumber) : null;

  if (!config.messagingServiceSid && config.fromPhoneNumber && !normalizedFrom) {
    return {
      success: false,
      to: options.to,
      normalizedTo,
      error: 'Configured Twilio sender phone number is invalid',
    };
  }

  try {
    const message = await client.messages.create({
      to: normalizedTo,
      body: options.body,
      ...(config.messagingServiceSid ? { messagingServiceSid: config.messagingServiceSid } : {}),
      ...(!config.messagingServiceSid && normalizedFrom ? { from: normalizedFrom } : {}),
    });

    return {
      success: true,
      to: options.to,
      normalizedTo,
      sid: message.sid,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Twilio SMS send failed', {
      to: normalizedTo,
      error: message,
    });
    return {
      success: false,
      to: options.to,
      normalizedTo,
      error: message,
    };
  }
}

/**
 * Verify Twilio credentials by requesting the account resource.
 */
export async function testTwilioConnection(): Promise<SmsTestResult> {
  const config = await getTwilioConfig();
  if (!config) {
    return { success: false, error: 'Twilio SMS is not configured' };
  }

  const client = createTwilioClient(config);

  try {
    await client.api.v2010.accounts(config.accountSid).fetch();
    await recordTwilioTestResult(true);
    return { success: true };
  } catch (error) {
    await recordTwilioTestResult(false);
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Twilio connection test failed', {
      accountSid: config.accountSid,
      error: message,
    });
    return { success: false, error: message };
  }
}
