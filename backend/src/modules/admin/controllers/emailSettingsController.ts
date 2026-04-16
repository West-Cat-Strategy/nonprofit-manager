/**
 * Email Settings Controller
 * Admin-only endpoints for viewing/updating SMTP & IMAP configuration
 * and testing the outbound connection.
 */

import type { Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import * as emailSettingsUseCase from '../usecases/emailSettingsUseCase';
import { testSmtpConnection } from '@services/emailService';
import { guardWithPermission } from '@services/authGuardService';
import { sendSuccess } from '@modules/shared/http/envelope';
import type { UpdateEmailSettingsInput } from '@validations/admin';
import { Permission } from '@utils/permissions';

const normalizeOptionalSecret = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim().length === 0 ? undefined : value;
};

/**
 * GET /api/admin/email-settings
 * Return the current email settings (passwords excluded).
 */
export const getEmailSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!guardWithPermission(req, res, Permission.ADMIN_SETTINGS)) return;

    const [settings, credentials] = await Promise.all([
      emailSettingsUseCase.getEmailSettings(),
      emailSettingsUseCase.hasStoredCredentials(),
    ]);

    return sendSuccess(res, { settings, credentials });
  } catch (error) {
    logger.error('Error fetching email settings', { error });
    next(error);
  }
};

/**
 * PUT /api/admin/email-settings
 * Update email settings. Password fields are encrypted at rest.
 */
export const updateEmailSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!guardWithPermission(req, res, Permission.ADMIN_SETTINGS)) return;
    const userId = req.user?.id;
    if (!userId) return;

    const body = req.body as UpdateEmailSettingsInput;
    const updated = await emailSettingsUseCase.updateEmailSettings(
      {
        smtpHost: body.smtpHost,
        smtpPort: body.smtpPort,
        smtpSecure: body.smtpSecure,
        smtpUser: body.smtpUser,
        smtpPass: normalizeOptionalSecret(body.smtpPass),
        smtpFromAddress: body.smtpFromAddress,
        smtpFromName: body.smtpFromName,
        imapHost: body.imapHost,
        imapPort: body.imapPort,
        imapSecure: body.imapSecure,
        imapUser: body.imapUser,
        imapPass: normalizeOptionalSecret(body.imapPass),
      },
      userId
    );

    return sendSuccess(res, { settings: updated, message: 'Email settings updated' });
  } catch (error) {
    logger.error('Error updating email settings', { error });
    next(error);
  }
};

/**
 * POST /api/admin/email-settings/test
 * Verify SMTP connectivity with the current saved settings.
 */
export const testEmailSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!guardWithPermission(req, res, Permission.ADMIN_SETTINGS)) return;

    const result = await testSmtpConnection();

    return sendSuccess(res, {
      result,
      message: result.success ? 'SMTP connection successful' : 'SMTP connection failed',
    });
  } catch (error) {
    logger.error('Error testing email settings', { error });
    next(error);
  }
};
