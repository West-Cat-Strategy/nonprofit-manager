/**
 * Invitation Controller
 * Handles user invitation endpoints
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import pool from '@config/database';
import { setCurrentUserId, withDatabaseTransaction } from '@config/database';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { PASSWORD } from '@config/constants';
import { seedDefaultOrganizationAccess } from '@services/accountAccessService';
import { invitationService, syncUserRole } from '../services/invitationService';
import { getEmailSettings, sendInvitationEmail } from '../services/invitationEmailService';
import { badRequest, conflict, notFoundMessage } from '@utils/responseHelpers';
import { setAuthCookie } from '@utils/cookieHelper';
import { buildAuthTokenResponse, generateAuthSessionCsrfToken } from '@utils/authResponse';
import { issueAppSessionToken } from '@utils/sessionTokens';
import { sendSuccess } from '@modules/shared/http/envelope';
import { mapAuthUser } from '@modules/auth/lib/authResponseMappers';

type InvitationEmailDelivery = {
  requested: boolean;
  sent: boolean;
  reason?: string;
};

const getInviterName = async (userId: string): Promise<string> => {
  const inviterRow = await pool.query<{ first_name: string; last_name: string }>(
    'SELECT first_name, last_name FROM users WHERE id = $1',
    [userId]
  );

  return inviterRow.rows[0]
    ? `${inviterRow.rows[0].first_name} ${inviterRow.rows[0].last_name}`.trim()
    : 'An administrator';
};

const deliverInvitationEmail = async (
  invitation: {
    email: string;
    token: string;
    role: string;
    message?: string | null;
  },
  inviterId: string,
  requested: boolean
): Promise<InvitationEmailDelivery> => {
  const emailDelivery: InvitationEmailDelivery = {
    requested,
    sent: false,
  };

  if (!requested) {
    return emailDelivery;
  }

  const emailSettings = await getEmailSettings();
  if (!emailSettings?.isConfigured) {
    emailDelivery.reason = 'Email is not configured. Configure SMTP in Admin > Email settings.';
    return emailDelivery;
  }

  const sent = await sendInvitationEmail(
    invitation.email,
    invitation.token,
    await getInviterName(inviterId),
    invitation.role,
    invitation.message
  );
  emailDelivery.sent = sent;
  if (!sent) {
    emailDelivery.reason = 'Email delivery failed. Share the invitation link manually.';
  }

  return emailDelivery;
};

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
    const {
      email,
      role,
      message,
      expiresInDays,
      sendEmail = false,
    } = req.body as {
      email: string;
      role: string;
      message?: string;
      expiresInDays?: number;
      sendEmail?: boolean;
    };

    const invitation = await invitationService.createInvitation(
      { email, role, message, expiresInDays },
      req.user!.id
    );

    // Generate the invitation URL (frontend will need to handle this route)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;

    const emailDelivery = await deliverInvitationEmail(
      invitation,
      req.user!.id,
      Boolean(sendEmail)
    );

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
    const query = (req.validatedQuery ?? req.query) as {
      includeExpired?: boolean | string;
      includeAccepted?: boolean | string;
      includeRevoked?: boolean | string;
    };
    const includeExpired =
      typeof query.includeExpired === 'boolean'
        ? query.includeExpired
        : query.includeExpired === 'true';
    const includeAccepted =
      typeof query.includeAccepted === 'boolean'
        ? query.includeAccepted
        : query.includeAccepted === 'true';
    const includeRevoked =
      typeof query.includeRevoked === 'boolean'
        ? query.includeRevoked
        : query.includeRevoked === 'true';

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
      return badRequest(res, message, { valid: false });
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
    const { token } = req.params;
    const { firstName, lastName, password } = req.body;

    const initialValidation = await invitationService.validateInvitation(token);
    if (!initialValidation.valid || !initialValidation.invitation) {
      return badRequest(res, initialValidation.error || 'Invalid invitation');
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    const outcome = await withDatabaseTransaction(async (client) => {
      const validation = await invitationService.validateInvitationForAcceptance(token, client, {
        lock: true,
      });
      if (!validation.valid || !validation.invitation) {
        return {
          valid: false as const,
          error: validation.error || 'Invalid invitation',
        };
      }

      const invitation = validation.invitation;
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at, created_by)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), $6)
         RETURNING id, email, first_name, last_name, role, profile_picture, is_active, created_at, COALESCE(auth_revision, 0) AS auth_revision`,
        [
          invitation.email,
          hashedPassword,
          firstName,
          lastName,
          invitation.role,
          invitation.createdBy,
        ]
      );

      const newUser = userResult.rows[0];

      await setCurrentUserId(client, newUser.id, { local: true });
      await syncUserRole(newUser.id, newUser.role, client);
      const organizationId = await seedDefaultOrganizationAccess(
        {
          userId: newUser.id,
          role: newUser.role,
          grantedBy: invitation.createdBy,
        },
        client
      );

      const acceptedInvitation = await invitationService.markInvitationAccepted(
        invitation.id,
        newUser.id,
        client
      );
      if (!acceptedInvitation) {
        return {
          valid: false as const,
          error: 'This invitation has already been used',
        };
      }

      return {
        valid: true as const,
        invitation,
        organizationId,
        user: newUser,
      };
    });

    if (!outcome.valid) {
      return badRequest(res, outcome.error);
    }

    const { invitation, organizationId, user: newUser } = outcome;
    const sessionToken = issueAppSessionToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      organizationId,
      authRevision: newUser.auth_revision ?? 0,
    });

    logger.info(`User created via invitation: ${newUser.email}`, {
      userId: newUser.id,
      invitationId: invitation.id,
    });

    setAuthCookie(res, sessionToken);
    const csrfToken = generateAuthSessionCsrfToken(req as AuthRequest, res, sessionToken);

    return sendSuccess(
      res,
      {
        message: 'Account created successfully',
        ...buildAuthTokenResponse(sessionToken),
        csrfToken,
        organizationId,
        user: mapAuthUser(newUser),
      },
      201
    );
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
    const { id } = req.params;
    const invitation = await invitationService.revokeInvitation(id, req.user!.id);

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
    const { id } = req.params;
    const invitation = await invitationService.resendInvitation(id, req.user!.id);

    if (!invitation) {
      return notFoundMessage(res, 'Invitation not found or already revoked/accepted');
    }

    // Generate the new invitation URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;

    const emailDelivery = await deliverInvitationEmail(invitation, req.user!.id, true);

    return res.json({
      message: emailDelivery.sent
        ? 'Invitation email resent successfully'
        : 'Invitation link regenerated',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      inviteUrl,
      emailDelivery,
    });
  } catch (error) {
    next(error);
  }
};
