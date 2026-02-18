/**
 * Invitation Controller
 * Handles user invitation endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@config/database';
import { logger } from '@config/logger';
import { getJwtSecret } from '@config/jwt';
import { AuthRequest } from '@middleware/auth';
import { PASSWORD, JWT } from '@config/constants';
import { invitationService, syncUserRole } from '@services/domains/integration';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendInvitationEmail } from '@services/emailService';
import { badRequest, conflict, errorPayload, forbidden, notFoundMessage, validationErrorResponse } from '@utils/responseHelpers';

/**
 * POST /api/invitations
 * Create a new invitation (admin only)
 */
export const createInvitation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { email, role, message, expiresInDays, sendEmail = false } = req.body as {
      email: string;
      role: string;
      message?: string;
      expiresInDays?: number;
      sendEmail?: boolean;
    };

    const invitation = await invitationService.createInvitation(
      { email, role, message, expiresInDays },
      req.user.id
    );

    // Generate the invitation URL (frontend will need to handle this route)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;

    const emailDelivery: {
      requested: boolean;
      sent: boolean;
      reason?: string;
    } = {
      requested: Boolean(sendEmail),
      sent: false,
    };

    if (sendEmail) {
      const emailSettings = await getEmailSettings();
      if (!emailSettings?.isConfigured) {
        emailDelivery.reason = 'Email is not configured. Configure SMTP in Admin > Email settings.';
      } else {
        const inviterRow = await pool.query<{ first_name: string; last_name: string }>(
          'SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]
        );
        const inviterName = inviterRow.rows[0]
          ? `${inviterRow.rows[0].first_name} ${inviterRow.rows[0].last_name}`.trim()
          : 'An administrator';
        const sent = await sendInvitationEmail(
          invitation.email,
          invitation.token,
          inviterName,
          invitation.role,
          invitation.message
        );
        emailDelivery.sent = sent;
        if (!sent) {
          emailDelivery.reason = 'Email delivery failed. Share the invitation link manually.';
        }
      }
    }

    return res.status(201).json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        message: invitation.message,
        createdAt: invitation.createdAt,
      },
      inviteUrl,
      emailDelivery,
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return conflict(res, error.message);
    }
    next(error);
  }
};

/**
 * GET /api/invitations
 * List all invitations (admin only)
 */
export const getInvitations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const includeExpired = req.query.includeExpired === 'true';
    const includeAccepted = req.query.includeAccepted === 'true';
    const includeRevoked = req.query.includeRevoked === 'true';

    const invitations = await invitationService.getInvitations({
      includeExpired,
      includeAccepted,
      includeRevoked,
    });

    return res.json({ invitations });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/invitations/:id
 * Get invitation by ID (admin only)
 */
export const getInvitationById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const { id } = req.params;
    const invitation = await invitationService.getInvitationById(id);

    if (!invitation) {
      return notFoundMessage(res, 'Invitation not found');
    }

    return res.json({ invitation });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/invitations/validate/:token
 * Validate invitation token (public - for acceptance flow)
 */
export const validateInvitation = async (
  req: Request<{ token: string }>,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { token } = req.params;
    const result = await invitationService.validateInvitation(token);

    if (!result.valid) {
      const message = result.error || 'Invalid invitation';
      return res.status(400).json({
        valid: false,
        ...errorPayload(res, message, undefined, 'validation_error'),
      });
    }

    // Return limited invitation info for the acceptance form
    return res.json({
      valid: true,
      invitation: {
        email: result.invitation!.email,
        role: result.invitation!.role,
        message: result.invitation!.message,
        invitedBy: result.invitation!.createdByName,
        expiresAt: result.invitation!.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invitations/accept/:token
 * Accept invitation and create user account (public)
 */
export const acceptInvitation = async (
  req: Request<{ token: string }>,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { token } = req.params;
    const { firstName, lastName, password } = req.body;

    // Validate the invitation
    const validation = await invitationService.validateInvitation(token);
    if (!validation.valid || !validation.invitation) {
      return badRequest(res, validation.error || 'Invalid invitation');
    }

    const invitation = validation.invitation;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    // Create the user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at, created_by)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), $6)
       RETURNING id, email, first_name, last_name, role, is_active, created_at`,
      [invitation.email, hashedPassword, firstName, lastName, invitation.role, invitation.createdBy]
    );

    const newUser = userResult.rows[0];

    await syncUserRole(newUser.id, newUser.role);

    // Mark invitation as accepted
    await invitationService.markInvitationAccepted(invitation.id, newUser.id);

    // Generate JWT token for automatic login
    const jwtToken = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      getJwtSecret(),
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    logger.info(`User created via invitation: ${newUser.email}`, {
      userId: newUser.id,
      invitationId: invitation.id,
    });

    return res.status(201).json({
      message: 'Account created successfully',
      token: jwtToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        profilePicture: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/invitations/:id
 * Revoke an invitation (admin only)
 */
export const revokeInvitation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const { id } = req.params;
    const invitation = await invitationService.revokeInvitation(id, req.user.id);

    if (!invitation) {
      return notFoundMessage(res, 'Invitation not found or already revoked/accepted');
    }

    return res.json({ message: 'Invitation revoked successfully', invitation });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invitations/:id/resend
 * Resend an invitation with new token (admin only)
 */
export const resendInvitation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const { id } = req.params;
    const invitation = await invitationService.resendInvitation(id, req.user.id);

    if (!invitation) {
      return notFoundMessage(res, 'Invitation not found or already revoked/accepted');
    }

    // Generate the new invitation URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;

    // Resend invitation email
    const inviterRow2 = await pool.query<{ first_name: string; last_name: string }>(
      'SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]
    );
    const inviterName2 = inviterRow2.rows[0]
      ? `${inviterRow2.rows[0].first_name} ${inviterRow2.rows[0].last_name}`.trim()
      : 'An administrator';
    await sendInvitationEmail(
      invitation.email,
      invitation.token,
      inviterName2,
      invitation.role
    );

    return res.json({
      message: 'Invitation resent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      inviteUrl,
    });
  } catch (error) {
    next(error);
  }
};
