/**
 * Password Reset Controller
 * Public endpoints for forgot-password and reset-password flows.
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import * as passwordResetService from '@services/passwordResetService';
import { badRequest } from '@utils/responseHelpers';

/**
 * POST /api/auth/forgot-password
 * Initiates a password reset (sends an email if the user exists).
 * Always returns 200 to prevent user enumeration.
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { email } = req.body;
    if (!email) {
      return badRequest(res, 'Email is required');
    }

    await passwordResetService.requestPasswordReset(email);

    // Always return success to prevent user enumeration
    return res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error('Error in forgot-password', { error });
    next(error);
  }
};

/**
 * GET /api/auth/reset-password/:token
 * Validate a password-reset token (used by frontend before showing form).
 */
export const validateResetToken = async (
  req: Request<{ token: string }>,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { token } = req.params;
    if (!token) {
      return badRequest(res, 'Token is required');
    }

    const userId = await passwordResetService.validateResetToken(token);

    return res.json({
      valid: !!userId,
    });
  } catch (error) {
    logger.error('Error validating reset token', { error });
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset a user's password using a valid token.
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { token, password, password_confirm } = req.body;

    if (!token || !password) {
      return badRequest(res, 'Token and new password are required');
    }

    if (password !== password_confirm) {
      return badRequest(res, 'Passwords do not match');
    }

    if (password.length < 8) {
      return badRequest(res, 'Password must be at least 8 characters');
    }

    const success = await passwordResetService.resetPassword(token, password);

    if (!success) {
      return res.status(400).json({
        error: {
          message: 'Invalid or expired reset token. Please request a new password reset.',
          code: 'INVALID_TOKEN',
        },
      });
    }

    return res.json({
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    logger.error('Error resetting password', { error });
    next(error);
  }
};
