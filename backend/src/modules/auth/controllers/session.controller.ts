import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import pool from '@config/database';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { setAccountLockState, trackLoginAttempt } from '@middleware/accountLockout';
import * as pendingRegistrationRepository from '@modules/admin/repositories/pendingRegistrationRepository';
import { syncUserRole } from '@services/domains/integration';
import {
  buildAuthorizationSnapshot,
  createRequestAuthorizationContext,
} from '@services/authorization';
import { issueTotpMfaChallenge } from './mfaController';
import { forbidden, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import { setAuthCookie, clearAuthCookies } from '@utils/cookieHelper';
import { buildAuthTokenResponse, generateAuthSessionCsrfToken } from '@utils/authResponse';
import { sendSuccess } from '@modules/shared/http/envelope';
import { normalizeRoleSlug } from '@utils/roleSlug';
import { issueAppSessionToken } from '@utils/sessionTokens';
import {
  getAuthenticatedOrganizationId,
  LoginRequest,
  UserRow,
  requireAuthenticatedUser,
} from '../lib/authQueries';
import { mapAuthUser } from '../lib/authResponseMappers';
import { resolveAuthenticatedOrganizationId } from '../lib/resolveOrganizationContext';

const PENDING_APPROVAL_MESSAGE =
  'Your account is pending approval. Please contact your workplace administrator to approve your account.';

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { email, password }: LoginRequest = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const correlationId = (req as AuthRequest & { correlationId?: string }).correlationId;

    const result = await pool.query<UserRow>(
      `SELECT 
        u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, 
        u.profile_picture, COALESCE(u.is_active, true) AS is_active,
        COALESCE(u.auth_revision, 0) AS auth_revision,
        u.mfa_totp_enabled,
        COALESCE(bool_or(r.mfa_required), FALSE) as mfa_required_by_role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
      GROUP BY u.id`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      const pendingRegistration = await pendingRegistrationRepository.getPendingRegistrationByEmail(
        normalizedEmail,
        true
      );

      if (!pendingRegistration) {
        await trackLoginAttempt(normalizedEmail, false, undefined, clientIp);
        logger.warn('Login failed: user not found', {
          email: normalizedEmail,
          ip: clientIp,
          correlationId,
        });
        return unauthorized(res, 'Invalid credentials');
      }

      const isValidPendingPassword = await bcrypt.compare(
        password,
        pendingRegistration.password_hash
      );
      if (!isValidPendingPassword) {
        await trackLoginAttempt(normalizedEmail, false, undefined, clientIp);
        logger.warn('Login failed: pending registration password mismatch', {
          email: normalizedEmail,
          ip: clientIp,
          correlationId,
        });
        return unauthorized(res, 'Invalid credentials');
      }

      await setAccountLockState(normalizedEmail, false);
      logger.info('Login blocked: account pending approval', {
        email: normalizedEmail,
        ip: clientIp,
        correlationId,
        pendingRegistrationId: pendingRegistration.id,
      });
      return forbidden(res, PENDING_APPROVAL_MESSAGE);
    }

    const user = result.rows[0];
    const normalizedRole = normalizeRoleSlug(user.role) ?? user.role;

    if (user.is_active === false) {
      await trackLoginAttempt(normalizedEmail, false, user.id, clientIp);
      logger.warn('Login failed: user inactive', {
        email: normalizedEmail,
        userId: user.id,
        ip: clientIp,
        correlationId,
      });
      return unauthorized(res, 'Invalid credentials');
    }

    await syncUserRole(user.id, normalizedRole);

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      await trackLoginAttempt(normalizedEmail, false, user.id, clientIp);
      logger.warn(`Failed login attempt for user: ${normalizedEmail}`, {
        ip: clientIp,
        correlationId,
      });
      return unauthorized(res, 'Invalid credentials');
    }

    const mfaRequired = (user.mfa_totp_enabled || user.mfa_required_by_role) && process.env.BYPASS_MFA_FOR_TESTS !== 'true';
    if (mfaRequired) {
      if (user.mfa_required_by_role && !user.mfa_totp_enabled) {
        logger.warn(`MFA enforced by role for user: ${user.email} but not yet enrolled`, {
          ip: clientIp,
          correlationId,
        });
        return forbidden(
          res,
          'Multi-factor authentication is required for your role. Please enroll in MFA to continue.'
        );
      }

      logger.info(`MFA required for user: ${user.email}`, { ip: clientIp, correlationId });
      const organizationId = await getAuthenticatedOrganizationId(user.id);
      return sendSuccess(res, {
        ...issueTotpMfaChallenge({
          id: user.id,
          email: user.email,
          role: normalizedRole,
          authRevision: user.auth_revision ?? 0,
        }),
        organizationId,
        user: mapAuthUser(user),
      });
    }

    await trackLoginAttempt(normalizedEmail, true, user.id, clientIp);

    const organizationId = await getAuthenticatedOrganizationId(user.id);
    const token = issueAppSessionToken({
      id: user.id,
      email: user.email,
      role: normalizedRole,
      organizationId,
      authRevision: user.auth_revision ?? 0,
    });

    logger.info(`User logged in: ${user.email}`, { ip: clientIp, correlationId });

    setAuthCookie(res, token);
    const csrfToken = generateAuthSessionCsrfToken(req, res, token);

    return sendSuccess(res, {
      ...buildAuthTokenResponse(token),
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
    const organizationId = await resolveAuthenticatedOrganizationId(req, res);
    if (organizationId === undefined) {
      return;
    }

    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: normalizeRoleSlug(user.role) ?? user.role,
      profilePicture: user.profile_picture || null,
      organizationId: organizationId ?? null,
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
    const primaryRole = normalizeRoleSlug(authUser.role) ?? authUser.role;
    const organizationId = await resolveAuthenticatedOrganizationId(req, res);
    if (organizationId === undefined) {
      return;
    }

    const snapshot = await buildAuthorizationSnapshot({
      userId,
      primaryRole,
      organizationId: organizationId ?? undefined,
    });

    req.authorizationContext = createRequestAuthorizationContext(
      userId,
      primaryRole,
      organizationId ?? undefined,
      snapshot.user.roles
    );

    return sendSuccess(res, snapshot);
  } catch (error) {
    next(error);
  }
};
