/**
 * Twilio Settings Controller
 * Admin-only endpoints for viewing/updating Twilio configuration
 * and testing the Twilio API connection.
 */

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { logger } from '@config/logger';
import { guardWithPermission } from '@services/authGuardService';
import * as twilioSettingsUseCase from '../usecases/twilioSettingsUseCase';
import { testTwilioConnection } from '@services/twilioSmsService';
import { sendSuccess } from '@modules/shared/http/envelope';
import type { UpdateTwilioSettingsInput } from '@validations/admin';
import { Permission } from '@utils/permissions';

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
    if (!guardWithPermission(req, res, Permission.ADMIN_SETTINGS)) return;

    const [settings, credentials] = await Promise.all([
      twilioSettingsUseCase.getTwilioSettings(),
      twilioSettingsUseCase.hasStoredCredentials(),
    ]);

    return sendSuccess(res, { settings, credentials });
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
    if (!guardWithPermission(req, res, Permission.ADMIN_SETTINGS)) return;
    const userId = req.user?.id;
    if (!userId) return;

    const body = req.body as UpdateTwilioSettingsInput;
    const updated = await twilioSettingsUseCase.updateTwilioSettings(
      {
        accountSid: body.accountSid,
        authToken: typeof body.authToken === 'string' ? body.authToken : undefined,
        messagingServiceSid: body.messagingServiceSid,
        fromPhoneNumber: body.fromPhoneNumber,
      },
      userId
    );

    return sendSuccess(res, { settings: updated, message: 'Twilio settings updated' });
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
    if (!guardWithPermission(req, res, Permission.ADMIN_SETTINGS)) return;

    const result = await testTwilioConnection();

    return sendSuccess(res, {
      result,
      message: result.success ? 'Twilio connection successful' : 'Twilio connection failed',
    });
  } catch (error) {
    logger.error('Error testing Twilio settings', { error });
    next(error);
  }
};
