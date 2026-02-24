import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import pool from '@config/database';
import { getJwtSecret } from '@config/jwt';
import { PASSWORD, JWT } from '@config/constants';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { logPortalActivity } from '@services/domains/integration';
import { badRequest, conflict, forbidden, notFoundMessage, unauthorized, validationErrorResponse } from '@utils/responseHelpers';
import { clearPortalAuthCookie, setPortalAuthCookie } from '@utils/cookieHelper';
import { shouldExposeAuthTokensInResponse } from '@utils/authResponse';

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

const buildPortalToken = (payload: { id: string; email: string; contactId: string | null }) => {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      contactId: payload.contactId,
      type: 'portal' as const,
    },
    getJwtSecret(),
    { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
  );
};

const getOrCreateContactForSignup = async (data: PortalSignupRequest): Promise<string> => {
  const email = data.email.toLowerCase();
  const existing = await pool.query('SELECT id FROM contacts WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await pool.query(
    `INSERT INTO contacts (
      first_name, last_name, email, phone, created_by, modified_by
    ) VALUES ($1, $2, $3, $4, $5, $5)
    RETURNING id`,
    [data.firstName, data.lastName, email, data.phone || null, null]
  );
  return result.rows[0].id;
};

export const portalSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const payload: PortalSignupRequest = req.body;
    const email = payload.email.toLowerCase();

    const existingUser = await pool.query('SELECT id FROM portal_users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return conflict(res, 'Portal account already exists');
    }

    const existingRequest = await pool.query(
      'SELECT id FROM portal_signup_requests WHERE email = $1 AND status = $2',
      [email, 'pending']
    );
    if (existingRequest.rows.length > 0) {
      return conflict(res, 'Signup request already pending approval');
    }

    const contactId = await getOrCreateContactForSignup(payload);
    const hashedPassword = await bcrypt.hash(payload.password, PASSWORD.BCRYPT_SALT_ROUNDS);

    const requestResult = await pool.query(
      `INSERT INTO portal_signup_requests (contact_id, email, password_hash, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [contactId, email, hashedPassword, 'pending']
    );

    return res.status(201).json({
      status: 'pending',
      requestId: requestResult.rows[0].id,
      message: 'Signup request submitted. A staff member must approve your access.',
    });
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { email, password }: PortalLoginRequest = req.body;
    const result = await pool.query(
      `SELECT id, email, password_hash, contact_id, status, is_verified
       FROM portal_users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return unauthorized(res, 'Invalid credentials');
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return forbidden(res, 'Account is suspended');
    }

    if (!user.is_verified) {
      return forbidden(res, 'Account pending verification');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return unauthorized(res, 'Invalid credentials');
    }

    await pool.query('UPDATE portal_users SET last_login_at = NOW() WHERE id = $1', [user.id]);
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

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        contactId: user.contact_id,
      },
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
    const result = await pool.query(
      `SELECT
        pu.id,
        pu.email,
        pu.contact_id,
        pu.status,
        pu.is_verified,
        pu.created_at,
        pu.last_login_at,
        c.first_name,
        c.last_name,
        c.phone,
        c.mobile_phone
       FROM portal_users pu
       LEFT JOIN contacts c ON c.id = pu.contact_id
       WHERE pu.id = $1`,
      [portalUser.id]
    );

    if (result.rows.length === 0) {
      return notFoundMessage(res, 'Portal user not found');
    }

    return res.json(result.rows[0]);
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
  return res.json({ message: 'Portal logout successful' });
};

export const validatePortalInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT id, email, contact_id, expires_at, accepted_at
       FROM portal_invitations
       WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return notFoundMessage(res, 'Invitation not found');
    }

    const invitation = result.rows[0];

    if (invitation.accepted_at) {
      return badRequest(res, 'Invitation already accepted');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return badRequest(res, 'Invitation expired');
    }

    return res.json({
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { token } = req.params;
    const { firstName, lastName, password } = req.body as {
      firstName: string;
      lastName: string;
      password: string;
    };

    const inviteResult = await pool.query(
      `SELECT id, email, contact_id, created_by, expires_at, accepted_at
       FROM portal_invitations
       WHERE token = $1`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return notFoundMessage(res, 'Invitation not found');
    }

    const invitation = inviteResult.rows[0];

    if (invitation.accepted_at) {
      return badRequest(res, 'Invitation already accepted');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return badRequest(res, 'Invitation expired');
    }

    const existingUser = await pool.query('SELECT id FROM portal_users WHERE email = $1', [
      invitation.email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return conflict(res, 'Portal account already exists');
    }

    let contactId = invitation.contact_id as string | null;
    if (!contactId) {
      const contactResult = await pool.query(
        `INSERT INTO contacts (
          first_name, last_name, email, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $4)
        RETURNING id`,
        [firstName, lastName, invitation.email.toLowerCase(), null]
      );
      contactId = contactResult.rows[0].id;
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    const portalUserResult = await pool.query(
      `INSERT INTO portal_users (
        contact_id, email, password_hash, status, is_verified, verified_at, verified_by
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING id, email, contact_id`,
      [contactId, invitation.email.toLowerCase(), hashedPassword, 'active', true, invitation.created_by]
    );

    await pool.query('UPDATE portal_invitations SET accepted_at = NOW() WHERE id = $1', [
      invitation.id,
    ]);

    const portalUser = portalUserResult.rows[0];
    const tokenValue = buildPortalToken({
      id: portalUser.id,
      email: portalUser.email,
      contactId: portalUser.contact_id,
    });

    // Prefer secure cookie-based session. Keep optional token in body only when explicitly enabled.
    setPortalAuthCookie(res, tokenValue);

    return res.status(201).json({
      ...(shouldExposeAuthTokensInResponse() ? { token: tokenValue } : {}),
      user: {
        id: portalUser.id,
        email: portalUser.email,
        contactId: portalUser.contact_id,
      },
    });
  } catch (error) {
    next(error);
  }
};
