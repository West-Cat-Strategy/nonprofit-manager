import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import pool from '@config/database';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { trackLoginAttempt } from '@middleware/accountLockout';
import { decrypt, encrypt } from '@utils/encryption';
import { badRequest, conflict, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import { setAuthCookie } from '@utils/cookieHelper';
import { buildAuthTokenResponse, generateAuthSessionCsrfToken } from '@utils/authResponse';
import { sendSuccess } from '@modules/shared/http/envelope';
import { normalizeRoleSlug } from '@utils/roleSlug';
import {
  MFA_TOKEN_ISSUER,
  issueAppSessionToken,
  issueTotpMfaToken,
  verifyTokenWithOptionalIssuer,
} from '@utils/sessionTokens';
import { getAuthenticatedOrganizationId } from '../lib/authQueries';
import { enrollTotpSecret, verifyTotpCode } from '../lib/totp';

const TOTP_ISSUER = process.env.TOTP_ISSUER || 'Nonprofit Manager';

interface TotpUserRow {
  id: string;
  email: string;
  role: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
  mfa_totp_enabled?: boolean;
  mfa_totp_secret_enc?: string | null;
  mfa_totp_pending_secret_enc?: string | null;
  is_active?: boolean;
  auth_revision?: number;
}

const issueAuthTokens = (
  user: { id: string; email: string; role: string; auth_revision?: number },
  organizationId?: string | null
) => {
  const normalizedRole = normalizeRoleSlug(user.role) ?? user.role;
  return issueAppSessionToken({
    id: user.id,
    email: user.email,
    role: normalizedRole,
    organizationId,
    authRevision: user.auth_revision ?? 0,
  });
};

export const getSecurityOverview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const totpResult = await pool.query<{ mfa_totp_enabled: boolean }>(
      'SELECT mfa_totp_enabled FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (totpResult.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    const passkeyResult = await pool.query<{ id: string; name: string | null; created_at: Date; last_used_at: Date | null }>(
      `SELECT id, name, created_at, last_used_at
       FROM user_webauthn_credentials
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.id]
    );

    return sendSuccess(res, {
      totpEnabled: !!totpResult.rows[0].mfa_totp_enabled,
      passkeys: passkeyResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const enrollTotp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const result = await pool.query<{ email: string; mfa_totp_enabled: boolean }>(
      'SELECT email, mfa_totp_enabled FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }
    if (result.rows[0].mfa_totp_enabled) {
      return conflict(res, '2FA is already enabled');
    }

    const { secret, otpauthUrl } = enrollTotpSecret(result.rows[0].email, TOTP_ISSUER);

    await pool.query(
      `UPDATE users
       SET mfa_totp_pending_secret_enc = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [encrypt(secret), req.user!.id]
    );

    return sendSuccess(res, {
      issuer: TOTP_ISSUER,
      otpauthUrl,
      secret,
    });
  } catch (error) {
    next(error);
  }
};

export const enableTotp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { code }: { code: string } = req.body;

    const result = await pool.query<{ mfa_totp_enabled: boolean; mfa_totp_pending_secret_enc: string | null }>(
      'SELECT mfa_totp_enabled, mfa_totp_pending_secret_enc FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }
    if (result.rows[0].mfa_totp_enabled) {
      return conflict(res, '2FA is already enabled');
    }
    if (!result.rows[0].mfa_totp_pending_secret_enc) {
      return badRequest(res, 'No pending 2FA enrollment. Start setup first.');
    }

    const secret = decrypt(result.rows[0].mfa_totp_pending_secret_enc);
    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      return unauthorized(res, 'Invalid authentication code');
    }

    await pool.query(
      `UPDATE users
       SET mfa_totp_enabled = TRUE,
           mfa_totp_secret_enc = mfa_totp_pending_secret_enc,
           mfa_totp_pending_secret_enc = NULL,
           mfa_totp_enabled_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [req.user!.id]
    );

    logger.info('TOTP 2FA enabled', { userId: req.user!.id });
    return sendSuccess(res, { totpEnabled: true });
  } catch (error) {
    next(error);
  }
};

export const disableTotp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { password, code }: { password: string; code: string } = req.body;

    const result = await pool.query<TotpUserRow>(
      `SELECT id, email, role, password_hash, first_name, last_name,
              mfa_totp_enabled, mfa_totp_secret_enc
       FROM users WHERE id = $1`,
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    const user = result.rows[0];
    if (!user.mfa_totp_enabled || !user.mfa_totp_secret_enc) {
      return conflict(res, '2FA is not enabled');
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return unauthorized(res, 'Invalid credentials');
    }

    const secret = decrypt(user.mfa_totp_secret_enc);
    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      return unauthorized(res, 'Invalid authentication code');
    }

    await pool.query(
      `UPDATE users
       SET mfa_totp_enabled = FALSE,
           mfa_totp_secret_enc = NULL,
           mfa_totp_pending_secret_enc = NULL,
           mfa_totp_enabled_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [req.user!.id]
    );

    logger.info('TOTP 2FA disabled', { userId: req.user!.id });
    return sendSuccess(res, { totpEnabled: false });
  } catch (error) {
    next(error);
  }
};

export const completeTotpLogin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const {
      email,
      mfaToken,
      code: rawCode,
      token: legacyToken,
    }: { email: string; mfaToken: string; code?: string; token?: string } = req.body;
    const code = rawCode ?? legacyToken ?? '';
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    let decoded: {
      id: string;
      email: string;
      role: string;
      type?: string;
      method?: string;
      authRevision?: number;
    };
    try {
      decoded = verifyTokenWithOptionalIssuer<typeof decoded>(mfaToken, MFA_TOKEN_ISSUER);
    } catch {
      return unauthorized(res, 'Invalid or expired MFA token');
    }

    if (decoded.type !== 'mfa' || decoded.method !== 'totp') {
      return unauthorized(res, 'Invalid MFA token');
    }

    if (decoded.email.toLowerCase() !== email.toLowerCase()) {
      return unauthorized(res, 'Invalid MFA token');
    }

    const userResult = await pool.query<TotpUserRow>(
      `SELECT id, email, role, first_name, last_name, profile_picture,
              COALESCE(is_active, true) AS is_active,
              COALESCE(auth_revision, 0) AS auth_revision,
              mfa_totp_enabled, mfa_totp_secret_enc
       FROM users WHERE id = $1`,
      [decoded.id]
    );
    if (userResult.rows.length === 0) {
      await trackLoginAttempt(email, false, undefined, clientIp);
      return unauthorized(res, 'Invalid credentials');
    }

    const user = userResult.rows[0];
    if (user.is_active === false) {
      await trackLoginAttempt(email, false, user.id, clientIp);
      return unauthorized(res, 'Invalid credentials');
    }

    if ((decoded.authRevision ?? 0) !== (user.auth_revision ?? 0)) {
      await trackLoginAttempt(email, false, user.id, clientIp);
      return unauthorized(res, 'Invalid or expired MFA token');
    }

    if (!user.mfa_totp_enabled || !user.mfa_totp_secret_enc) {
      await trackLoginAttempt(email, false, user.id, clientIp);
      return badRequest(res, '2FA is not enabled for this user');
    }

    const secret = decrypt(user.mfa_totp_secret_enc);
    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      await trackLoginAttempt(email, false, user.id, clientIp);
      return unauthorized(res, 'Invalid authentication code');
    }

    await trackLoginAttempt(email, true, user.id, clientIp);

    const organizationId = await getAuthenticatedOrganizationId(user.id);
    const token = issueAuthTokens(user, organizationId);
    setAuthCookie(res, token);
    const csrfToken = generateAuthSessionCsrfToken(req, res, token);
    return sendSuccess(res, {
      ...buildAuthTokenResponse(token),
      csrfToken,
      organizationId: organizationId ?? null,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: normalizeRoleSlug(user.role) ?? user.role,
        profilePicture: user.profile_picture || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const issueTotpMfaChallenge = (user: {
  id: string;
  email: string;
  role: string;
  authRevision?: number;
}) => {
  const normalizedRole = normalizeRoleSlug(user.role) ?? user.role;
  const mfaToken = issueTotpMfaToken({
    id: user.id,
    email: user.email,
    role: normalizedRole,
    authRevision: user.authRevision ?? 0,
  });
  return {
    mfaRequired: true as const,
    method: 'totp' as const,
    mfaToken,
  };
};
