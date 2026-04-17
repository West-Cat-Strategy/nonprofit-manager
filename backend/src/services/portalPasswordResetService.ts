import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '@config/database';
import { logger } from '@config/logger';
import { PASSWORD } from '@config/constants';
import { sendPortalPasswordResetEmail } from './emailService';

const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_HOURS = 1;
const COMPOSITE_TOKEN_DELIMITER = '.';
const UUID_LIKE_REGEX = /^[0-9a-fA-F-]{36}$/;
const TOKEN_SECRET_REGEX = /^[0-9a-fA-F]{64}$/;

interface ActiveTokenRow {
  id: string;
  portal_user_id: string;
  token_hash: string;
}

const parseCompositeToken = (token: string): { tokenId: string; secret: string } | null => {
  if (!token.includes(COMPOSITE_TOKEN_DELIMITER)) {
    return null;
  }

  const parts = token.split(COMPOSITE_TOKEN_DELIMITER);
  if (parts.length !== 2) {
    return null;
  }

  const [tokenId, secret] = parts;
  if (!tokenId || !secret) {
    return null;
  }

  if (!UUID_LIKE_REGEX.test(tokenId) || !TOKEN_SECRET_REGEX.test(secret)) {
    return null;
  }

  return { tokenId, secret };
};

const findMatchingLegacyToken = async (token: string): Promise<ActiveTokenRow | null> => {
  const result = await pool.query<ActiveTokenRow>(
    `SELECT id, portal_user_id, token_hash FROM portal_password_reset_tokens
     WHERE expires_at > NOW() AND used_at IS NULL
     ORDER BY created_at DESC`
  );

  for (const row of result.rows) {
    const match = await bcrypt.compare(token, row.token_hash);
    if (match) {
      return row;
    }
  }

  return null;
};

const resolveTokenMatch = async (token: string): Promise<ActiveTokenRow | null> => {
  if (token.includes(COMPOSITE_TOKEN_DELIMITER)) {
    const parsed = parseCompositeToken(token);
    if (!parsed) {
      return null;
    }

    const result = await pool.query<ActiveTokenRow>(
      `SELECT id, portal_user_id, token_hash
       FROM portal_password_reset_tokens
       WHERE id = $1
         AND expires_at > NOW()
         AND used_at IS NULL
       LIMIT 1`,
      [parsed.tokenId]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const match = await bcrypt.compare(parsed.secret, row.token_hash);
    return match ? row : null;
  }

  return findMatchingLegacyToken(token);
};

export async function requestPortalPasswordReset(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();

  const userResult = await pool.query<{
    id: string;
    email: string;
    first_name: string | null;
  }>(
    `SELECT pu.id, pu.email, c.first_name
     FROM portal_users pu
     LEFT JOIN contacts c ON c.id = pu.contact_id
     WHERE pu.email = $1
       AND pu.status = 'active'
       AND pu.is_verified = true`,
    [normalized]
  );

  if (userResult.rows.length === 0) {
    logger.info('Portal password reset requested for unknown or inactive email', {
      email: normalized,
    });
    return;
  }

  const user = userResult.rows[0];

  await pool.query('DELETE FROM portal_password_reset_tokens WHERE portal_user_id = $1', [user.id]);

  const tokenSecret = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  const tokenHash = await bcrypt.hash(tokenSecret, PASSWORD.BCRYPT_SALT_ROUNDS);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  const insertResult = await pool.query<{ id: string }>(
    `INSERT INTO portal_password_reset_tokens (portal_user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [user.id, tokenHash, expiresAt]
  );
  const tokenId = insertResult.rows[0]?.id;
  if (!tokenId) {
    logger.error('Portal password reset token insert did not return token id', {
      portalUserId: user.id,
    });
    return;
  }

  const resetToken = `${tokenId}.${tokenSecret}`;
  const sent = await sendPortalPasswordResetEmail(
    user.email,
    resetToken,
    user.first_name ?? 'there'
  );
  if (!sent) {
    logger.warn('Portal password reset email could not be sent', { portalUserId: user.id });
  }
}

export async function validatePortalResetToken(token: string): Promise<string | null> {
  const match = await resolveTokenMatch(token);
  return match?.portal_user_id ?? null;
}

export async function resetPortalPassword(token: string, newPassword: string): Promise<boolean> {
  const matchedToken = await resolveTokenMatch(token);
  if (!matchedToken) {
    logger.warn('Portal password reset attempted with invalid or expired token');
    return false;
  }

  const passwordHash = await bcrypt.hash(newPassword, PASSWORD.BCRYPT_SALT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE portal_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, matchedToken.portal_user_id]
    );

    await client.query(
      'UPDATE portal_password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [matchedToken.id]
    );

    await client.query(
      'DELETE FROM portal_password_reset_tokens WHERE portal_user_id = $1 AND id != $2',
      [matchedToken.portal_user_id, matchedToken.id]
    );

    await client.query('COMMIT');
    logger.info('Portal password reset successfully', {
      portalUserId: matchedToken.portal_user_id,
    });
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Portal password reset failed', {
      error,
      portalUserId: matchedToken.portal_user_id,
    });
    return false;
  } finally {
    client.release();
  }
}
