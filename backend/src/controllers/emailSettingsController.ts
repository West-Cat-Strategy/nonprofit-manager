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

    const settings = await emailSettingsService.getEmailSettings();
    const credentials = await emailSettingsService.hasStoredCredentials();

    return res.json({
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

    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      smtpFromAddress,
      smtpFromName,
      imapHost,
      imapPort,
      imapSecure,
      imapUser,
      imapPass,
    } = req.body;

    const updated = await emailSettingsService.updateEmailSettings(
      {
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpPass,
        smtpFromAddress,
        smtpFromName,
        imapHost,
        imapPort,
        imapSecure,
        imapUser,
        imapPass,
      },
      req.user.id
    );

    return res.json({ data: updated, message: 'Email settings updated' });
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

    return res.json({
      data: result,
      message: result.success ? 'SMTP connection successful' : 'SMTP connection failed',
    });
  } catch (error) {
    logger.error('Error testing email settings', { error });
    next(error);
  }
};
