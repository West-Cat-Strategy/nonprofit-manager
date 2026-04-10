/**
 * Email Settings Controller
 * Admin-only endpoints for viewing/updating SMTP & IMAP configuration
 * and testing the outbound connection.
 */

import type { Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import * as emailSettingsService from '@services/emailSettingsService';
import { testSmtpConnection } from '@services/emailService';
import { forbidden } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import type { UpdateEmailSettingsInput } from '@validations/admin';

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
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const [settings, credentials] = await Promise.all([
      emailSettingsService.getEmailSettings(),
      emailSettingsService.hasStoredCredentials(),
    ]);

    return sendSuccess(res, {
      data: settings,
      credentials, // { smtp: true/false, imap: true/false }
    });
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
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const body = req.body as UpdateEmailSettingsInput;
    const updated = await emailSettingsService.updateEmailSettings(
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
      req.user.id
    );

    return sendSuccess(res, { data: updated, message: 'Email settings updated' });
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
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const result = await testSmtpConnection();

    return sendSuccess(res, {
      data: result,
      message: result.success ? 'SMTP connection successful' : 'SMTP connection failed',
    });
  } catch (error) {
    logger.error('Error testing email settings', { error });
    next(error);
  }
};
