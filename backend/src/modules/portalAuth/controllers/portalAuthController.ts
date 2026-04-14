import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { PASSWORD } from '@config/constants';
import { trackLoginAttempt } from '@middleware/accountLockout';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { logPortalActivity } from '@services/domains/integration';
import * as portalAuthService from '@services/portalAuthService';
import { badRequest, conflict, forbidden, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import { clearPortalAuthCookie, setPortalAuthCookie } from '@utils/cookieHelper';
import { shouldExposeAuthTokensInResponse } from '@utils/authResponse';
import { sendSuccess } from '@modules/shared/http/envelope';
import { issuePortalSessionToken } from '@utils/sessionTokens';

interface PortalSignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface PortalLoginRequest {
  email: string;
  password: string;
}

const mapPortalSessionUser = (user: {
  id: string;
  email: string;
  contact_id?: string | null;
  contactId?: string | null;
}) => ({
  id: user.id,
  email: user.email,
  contactId: user.contact_id ?? user.contactId ?? null,
});

const buildPortalToken = (payload: { id: string; email: string; contactId: string | null }) => {
  return issuePortalSessionToken(payload);
};

export const portalSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const payload: PortalSignupRequest = req.body;
    const email = payload.email.toLowerCase();

    const existingPortalUserId = await portalAuthService.findPortalUserIdByEmail(email);
    if (existingPortalUserId) {
      return conflict(res, 'Portal account already exists');
    }

    const existingPendingSignupRequestId =
      await portalAuthService.findPendingSignupRequestIdByEmail(email);
    if (existingPendingSignupRequestId) {
      return conflict(res, 'Signup request already pending approval');
    }

    const contactId = await portalAuthService.getOrCreateContactForSignup({
      email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
    });
    const hashedPassword = await bcrypt.hash(payload.password, PASSWORD.BCRYPT_SALT_ROUNDS);

    const requestId = await portalAuthService.createPortalSignupRequest({
      contactId,
      email,
      passwordHash: hashedPassword,
    });

    return sendSuccess(
      res,
      {
        status: 'pending',
        requestId,
        message: 'Signup request submitted. A staff member must approve your access.',
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

export const portalLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { email, password }: PortalLoginRequest = req.body;
    const normalizedEmail = email.toLowerCase();
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const user = await portalAuthService.getPortalLoginUserByEmail(normalizedEmail);
    if (!user) {
      await trackLoginAttempt(normalizedEmail, false, undefined, clientIp);
      return unauthorized(res, 'Invalid credentials');
    }

    if (user.status !== 'active') {
      return forbidden(res, 'Account is suspended');
    }

    if (!user.is_verified) {
      return forbidden(res, 'Account pending verification');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      await trackLoginAttempt(normalizedEmail, false, undefined, clientIp);
      return unauthorized(res, 'Invalid credentials');
    }

    await portalAuthService.updatePortalUserLastLogin(user.id);
    await trackLoginAttempt(normalizedEmail, true, undefined, clientIp);
    await logPortalActivity({
      portalUserId: user.id,
      action: 'login.success',
      details: 'Portal user logged in',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    const token = buildPortalToken({ id: user.id, email: user.email, contactId: user.contact_id });

    // Set HTTP-only cookie instead of returning token in JSON
    setPortalAuthCookie(res, token);

    return sendSuccess(res, {
      user: mapPortalSessionUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const getPortalBootstrap = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const portalUser = req.portalUser!;
    const profile = await portalAuthService.getPortalUserProfileById(portalUser.id);
    if (!profile) {
      return notFoundMessage(res, 'Portal user not found');
    }

    return sendSuccess(res, {
      user: mapPortalSessionUser(profile),
    });
  } catch (error) {
    next(error);
  }
};

export const getPortalMe = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const portalUser = req.portalUser!;
    const profile = await portalAuthService.getPortalUserProfileById(portalUser.id);
    if (!profile) {
      return notFoundMessage(res, 'Portal user not found');
    }

    return sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
};

export const portalLogout = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<Response | void> => {
  clearPortalAuthCookie(res);
  return sendSuccess(res, { message: 'Portal logout successful' });
};

export const validatePortalInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { token } = req.params;
    const invitationToken = Array.isArray(token) ? token[0] : token;
    const invitation = await portalAuthService.getPortalInvitationByToken(invitationToken);
    if (!invitation) {
      return notFoundMessage(res, 'Invitation not found');
    }

    if (invitation.accepted_at) {
      return badRequest(res, 'Invitation already accepted');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return badRequest(res, 'Invitation expired');
    }

    return sendSuccess(res, {
      valid: true,
      invitation: {
        email: invitation.email,
        contactId: invitation.contact_id,
        expiresAt: invitation.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const acceptPortalInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { token } = req.params;
    const invitationToken = Array.isArray(token) ? token[0] : token;
    const { firstName, lastName, password } = req.body as {
      firstName: string;
      lastName: string;
      password: string;
    };

    const invitation = await portalAuthService.getPortalInvitationByToken(invitationToken);
    if (!invitation) {
      return notFoundMessage(res, 'Invitation not found');
    }

    if (invitation.accepted_at) {
      return badRequest(res, 'Invitation already accepted');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return badRequest(res, 'Invitation expired');
    }

    const normalizedEmail = invitation.email.toLowerCase();
    const existingUserId = await portalAuthService.findPortalUserIdByEmail(normalizedEmail);
    if (existingUserId) {
      return conflict(res, 'Portal account already exists');
    }

    let contactId = invitation.contact_id as string | null;
    if (!contactId) {
      contactId = await portalAuthService.createContactForInvitation({
        firstName,
        lastName,
        email: normalizedEmail,
      });
    }
    if (!contactId) {
      return badRequest(res, 'Unable to resolve contact for invitation');
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    const portalUser = await portalAuthService.createPortalUserFromInvitation({
      contactId,
      email: normalizedEmail,
      passwordHash: hashedPassword,
      verifiedBy: invitation.created_by,
    });

    await portalAuthService.markPortalInvitationAccepted(invitation.id);
    const tokenValue = buildPortalToken({
      id: portalUser.id,
      email: portalUser.email,
      contactId: portalUser.contact_id,
    });

    // Prefer secure cookie-based session. Keep optional token in body only when explicitly enabled.
    setPortalAuthCookie(res, tokenValue);

    return sendSuccess(
      res,
      {
        ...(shouldExposeAuthTokensInResponse() ? { token: tokenValue } : {}),
        user: mapPortalSessionUser(portalUser),
      },
      201
    );
  } catch (error) {
    next(error);
  }
};
