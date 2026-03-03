import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@config/database';
import { logger } from '@config/logger';
import { getJwtSecret } from '@config/jwt';
import { AuthRequest } from '@middleware/auth';
import { trackLoginAttempt } from '@middleware/accountLockout';
import { JWT } from '@config/constants';
import { syncUserRole } from '@services/domains/integration';
import {
  buildAuthorizationSnapshot,
  createRequestAuthorizationContext,
} from '@services/authorization';
import { issueTotpMfaChallenge } from './mfaController';
import { forbidden, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import { setAuthCookie, setRefreshCookie, clearAuthCookies } from '@utils/cookieHelper';
import { buildAuthTokenResponse } from '@utils/authResponse';
import { generateCsrfToken } from '@middleware/domains/security';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  getDefaultOrganizationId,
  LoginRequest,
  UserRow,
  requireAuthenticatedUser,
} from '../lib/authQueries';
import { mapAuthUser } from '../lib/authResponseMappers';

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { email, password }: LoginRequest = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    const result = await pool.query<UserRow>(
      `SELECT 
        u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, 
        u.profile_picture, u.mfa_totp_enabled,
        COALESCE(bool_or(r.mfa_required), FALSE) as mfa_required_by_role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
      GROUP BY u.id`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      await trackLoginAttempt(normalizedEmail, false, undefined, clientIp);
      return unauthorized(res, 'Invalid credentials');
    }

    const user = result.rows[0];
    await syncUserRole(user.id, user.role);

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      await trackLoginAttempt(normalizedEmail, false, user.id, clientIp);
      logger.warn(`Failed login attempt for user: ${normalizedEmail}`, { ip: clientIp });
      return unauthorized(res, 'Invalid credentials');
    }

    const mfaRequired = user.mfa_totp_enabled || user.mfa_required_by_role;
    if (mfaRequired) {
      if (user.mfa_required_by_role && !user.mfa_totp_enabled) {
        logger.warn(`MFA enforced by role for user: ${user.email} but not yet enrolled`, { ip: clientIp });
        return forbidden(
          res,
          'Multi-factor authentication is required for your role. Please enroll in MFA to continue.'
        );
      }

      logger.info(`MFA required for user: ${user.email}`, { ip: clientIp });
      const organizationId = await getDefaultOrganizationId();
      return sendSuccess(res, {
        ...issueTotpMfaChallenge(user),
        organizationId,
        user: mapAuthUser(user),
      });
    }

    await trackLoginAttempt(normalizedEmail, true, user.id, clientIp);

    const organizationId = await getDefaultOrganizationId();
    const jwtSecret = getJwtSecret();

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        ...(organizationId ? { organizationId } : {}),
      },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh',
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info(`User logged in: ${user.email}`, { ip: clientIp });

    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);

    const csrfToken = generateCsrfToken(req, res);

    return sendSuccess(res, {
      ...buildAuthTokenResponse(token, refreshToken),
      csrfToken,
      organizationId,
      user: mapAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  _req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<Response> => {
  clearAuthCookies(res);
  return sendSuccess(res, { message: 'Logged out successfully' });
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authUser = requireAuthenticatedUser(req, res);
    if (!authUser) return;
    const userId = authUser.id;

    const result = await pool.query<UserRow>(
      'SELECT id, email, first_name, last_name, role, profile_picture, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    const user = result.rows[0];

    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      profilePicture: user.profile_picture || null,
      createdAt: user.created_at,
    });
  } catch (error) {
    next(error);
  }
};

export const checkAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authUser = requireAuthenticatedUser(req, res);
    if (!authUser) return;
    const userId = authUser.id;
    const primaryRole = authUser.role;
    const organizationId = req.organizationId || req.accountId || req.tenantId;

    const snapshot = await buildAuthorizationSnapshot({
      userId,
      primaryRole,
      organizationId,
    });

    req.authorizationContext = createRequestAuthorizationContext(
      userId,
      primaryRole,
      organizationId,
      snapshot.user.roles
    );

    return sendSuccess(res, snapshot);
  } catch (error) {
    next(error);
  }
};
