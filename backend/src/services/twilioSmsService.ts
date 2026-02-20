/**
 * Twilio SMS Service
 * Sends SMS reminders through Twilio using credentials from twilio_settings.
 */

import pool from '@config/database';
import { logger } from '@config/logger';
import { decrypt } from '@utils/encryption';

const TWILIO_API_TIMEOUT_MS = 15_000;

interface TwilioSettingsRow {
  account_sid: string | null;
  auth_token_encrypted: string | null;
  messaging_service_sid: string | null;
  from_phone_number: string | null;
  is_configured: boolean;
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string | null;
  fromPhoneNumber: string | null;
}

interface TwilioErrorPayload {
  message?: string;
}

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

const buildTwilioAuthHeader = (accountSid: string, authToken: string): string => {
  const token = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  return `Basic ${token}`;
};

const parseTwilioError = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json() as TwilioErrorPayload;
    if (payload.message) return payload.message;
  } catch {
    // fall through
  }
  return `Twilio request failed with status ${response.status}`;
};

const recordTwilioTestResult = async (success: boolean): Promise<void> => {
  await pool.query(
    `UPDATE twilio_settings
     SET last_tested_at = NOW(),
         last_test_success = $1,
         updated_at = NOW()
     WHERE id = (SELECT id FROM twilio_settings ORDER BY created_at LIMIT 1)`,
    [success]
  );
};

const getTwilioConfig = async (): Promise<TwilioConfig | null> => {
  const result = await pool.query<TwilioSettingsRow>(
    `SELECT account_sid, auth_token_encrypted, messaging_service_sid, from_phone_number, is_configured
     FROM twilio_settings
     WHERE is_configured = true
     ORDER BY created_at
     LIMIT 1`
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  if (!row.account_sid || !row.auth_token_encrypted) return null;

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

  const formBody = new URLSearchParams();
  formBody.set('To', normalizedTo);
  formBody.set('Body', options.body);

  if (config.messagingServiceSid) {
    formBody.set('MessagingServiceSid', config.messagingServiceSid);
  } else if (config.fromPhoneNumber) {
    const normalizedFrom = normalizePhoneForSms(config.fromPhoneNumber);
    if (!normalizedFrom) {
      return {
        success: false,
        to: options.to,
        normalizedTo,
        error: 'Configured Twilio sender phone number is invalid',
      };
    }
    formBody.set('From', normalizedFrom);
  } else {
    return {
      success: false,
      to: options.to,
      normalizedTo,
      error: 'Twilio sender configuration is missing',
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TWILIO_API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: buildTwilioAuthHeader(config.accountSid, config.authToken),
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formBody.toString(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const error = await parseTwilioError(response);
      logger.warn('Twilio SMS send failed', {
        status: response.status,
        to: normalizedTo,
        error,
      });
      return {
        success: false,
        to: options.to,
        normalizedTo,
        error,
      };
    }

    const payload = await response.json() as { sid?: string };
    return {
      success: true,
      to: options.to,
      normalizedTo,
      sid: payload.sid,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Twilio SMS send failed with exception', { to: normalizedTo, error: message });
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

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}.json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TWILIO_API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: buildTwilioAuthHeader(config.accountSid, config.authToken),
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const error = await parseTwilioError(response);
      await recordTwilioTestResult(false);
      return { success: false, error };
    }

    await recordTwilioTestResult(true);
    return { success: true };
  } catch (error) {
    await recordTwilioTestResult(false);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
