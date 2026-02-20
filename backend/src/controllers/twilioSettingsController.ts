/**
 * Twilio Settings Controller
 * Admin-only endpoints for viewing/updating Twilio configuration
 * and testing the Twilio API connection.
 */

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { logger } from '@config/logger';
import { forbidden } from '@utils/responseHelpers';
import * as twilioSettingsService from '@services/twilioSettingsService';
import { testTwilioConnection } from '@services/twilioSmsService';

const normalizeOptionalString = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/**
 * GET /api/admin/twilio-settings
 * Return current Twilio settings (auth token excluded).
 */
export const getTwilioSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const [settings, credentials] = await Promise.all([
      twilioSettingsService.getTwilioSettings(),
      twilioSettingsService.hasStoredCredentials(),
    ]);

    return res.json({
      data: settings,
      credentials, // { authToken: true/false }
    });
  } catch (error) {
    logger.error('Error fetching Twilio settings', { error });
    next(error);
  }
};

/**
 * PUT /api/admin/twilio-settings
 * Update Twilio settings. Auth token is encrypted at rest.
 */
export const updateTwilioSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const updated = await twilioSettingsService.updateTwilioSettings(
      {
        accountSid: normalizeOptionalString(req.body.accountSid),
        authToken: typeof req.body.authToken === 'string' ? req.body.authToken : undefined,
        messagingServiceSid: normalizeOptionalString(req.body.messagingServiceSid),
        fromPhoneNumber: normalizeOptionalString(req.body.fromPhoneNumber),
      },
      req.user.id
    );

    return res.json({ data: updated, message: 'Twilio settings updated' });
  } catch (error) {
    logger.error('Error updating Twilio settings', { error });
    next(error);
  }
};

/**
 * POST /api/admin/twilio-settings/test
 * Verify Twilio API connectivity with current saved settings.
 */
export const testTwilioSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const result = await testTwilioConnection();

    return res.json({
      data: result,
      message: result.success ? 'Twilio connection successful' : 'Twilio connection failed',
    });
  } catch (error) {
    logger.error('Error testing Twilio settings', { error });
    next(error);
  }
};
