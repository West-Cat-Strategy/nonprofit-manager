import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@config/database';
import { getJwtSecret } from '@config/jwt';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { trackLoginAttempt } from '@middleware/accountLockout';
import { JWT, TIME } from '@config/constants';
import { decrypt, encrypt } from '@utils/encryption';
import { badRequest, conflict, notFoundMessage, unauthorized, validationErrorResponse } from '@utils/responseHelpers';
import { authenticator } from '@otplib/preset-default';

const TOTP_PERIOD_SECONDS = 30;
const TOTP_WINDOW = 1;
const MFA_TOKEN_EXPIRY = Math.floor(TIME.FIVE_MINUTES / 1000);
const TOTP_ISSUER = process.env.TOTP_ISSUER || 'Nonprofit Manager';

const getDefaultOrganizationId = async (): Promise<string | null> => {
  const result = await pool.query(
    `SELECT id
     FROM accounts
     WHERE account_type = 'organization'
     ORDER BY created_at ASC
     LIMIT 1`
  );
  return result.rows[0]?.id || null;
};

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
}

const normalizeTotpCode = (code: string) => code.replace(/\s+/g, '');
const loadOtplib = async () => {
  authenticator.options = {
    step: TOTP_PERIOD_SECONDS,
    window: TOTP_WINDOW,
  };
  return authenticator;
};

const issueAuthTokens = (user: { id: string; email: string; role: string }) => {
  const jwtSecret = getJwtSecret();
  return {
    token: jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    ),
    refreshToken: jwt.sign(
      { id: user.id, type: 'refresh' },
      jwtSecret,
      { expiresIn: JWT.REFRESH_TOKEN_EXPIRY }
    ),
  };
};

const issueMfaToken = (user: { id: string; email: string; role: string }) => {
  const jwtSecret = getJwtSecret();
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, type: 'mfa', method: 'totp' },
    jwtSecret,
    { expiresIn: MFA_TOKEN_EXPIRY }
  );
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

    return res.json({
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

    const authenticator = await loadOtplib();
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(result.rows[0].email, TOTP_ISSUER, secret);

    await pool.query(
      `UPDATE users
       SET mfa_totp_pending_secret_enc = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [encrypt(secret), req.user!.id]
    );

    return res.json({
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

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
    const authenticator = await loadOtplib();
    const isValid = authenticator.check(normalizeTotpCode(code), secret);
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
    return res.json({ totpEnabled: true });
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

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
    const authenticator = await loadOtplib();
    const isValid = authenticator.check(normalizeTotpCode(code), secret);
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
    return res.json({ totpEnabled: false });
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { email, mfaToken, code }: { email: string; mfaToken: string; code: string } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    let decoded: { id: string; email: string; role: string; type?: string; method?: string };
    try {
      decoded = jwt.verify(mfaToken, getJwtSecret()) as typeof decoded;
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
      `SELECT id, email, role, first_name, last_name, profile_picture, mfa_totp_enabled, mfa_totp_secret_enc
       FROM users WHERE id = $1`,
      [decoded.id]
    );
    if (userResult.rows.length === 0) {
      await trackLoginAttempt(email, false, undefined, clientIp);
      return unauthorized(res, 'Invalid credentials');
    }

    const user = userResult.rows[0];
    if (!user.mfa_totp_enabled || !user.mfa_totp_secret_enc) {
      await trackLoginAttempt(email, false, user.id, clientIp);
      return badRequest(res, '2FA is not enabled for this user');
    }

    const secret = decrypt(user.mfa_totp_secret_enc);
    const authenticator = await loadOtplib();
    const isValid = authenticator.check(normalizeTotpCode(code), secret);
    if (!isValid) {
      await trackLoginAttempt(email, false, user.id, clientIp);
      return unauthorized(res, 'Invalid authentication code');
    }

    await trackLoginAttempt(email, true, user.id, clientIp);

    const { token, refreshToken } = issueAuthTokens(user);
    const organizationId = await getDefaultOrganizationId();
    return res.json({
      token,
      refreshToken,
      organizationId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        profilePicture: user.profile_picture || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const issueTotpMfaChallenge = (user: { id: string; email: string; role: string }) => {
  const mfaToken = issueMfaToken(user);
  return {
    mfaRequired: true as const,
    method: 'totp' as const,
    mfaToken,
  };
};
