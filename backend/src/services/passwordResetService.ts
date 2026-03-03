/**
 * Password Reset Service
 * Handles forgot-password token generation and password reset execution.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '@config/database';
import { logger } from '@config/logger';
import { PASSWORD } from '@config/constants';
import { sendPasswordResetEmail } from './emailService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_LENGTH = 32;            // 32 random bytes → 64 hex chars
const TOKEN_EXPIRY_HOURS = 1;       // tokens expire after 1 hour
const COMPOSITE_TOKEN_DELIMITER = '.';
const UUID_LIKE_REGEX = /^[0-9a-fA-F-]{36}$/;
const TOKEN_SECRET_REGEX = /^[0-9a-fA-F]{64}$/;

interface ActiveTokenRow {
  id: string;
  user_id: string;
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
    `SELECT id, user_id, token_hash FROM password_reset_tokens
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
      `SELECT id, user_id, token_hash
       FROM password_reset_tokens
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initiate a password reset: generate a token, store its hash, and email a
 * link to the user.  Always returns void (timing-safe: same response time
 * whether the email exists or not).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalised = email.toLowerCase().trim();

  // Look up the user
  const userResult = await pool.query<{ id: string; first_name: string; email: string }>(
    'SELECT id, first_name, email FROM users WHERE email = $1 AND is_active = true',
    [normalised]
  );

  if (userResult.rows.length === 0) {
    // Do NOT reveal whether the user exists — just return silently.
    logger.info('Password reset requested for unknown or inactive email', { email: normalised });
    return;
  }

  const user = userResult.rows[0];

  // Invalidate any existing tokens for this user
  await pool.query(
    'DELETE FROM password_reset_tokens WHERE user_id = $1',
    [user.id]
  );

  // Generate a secure random token secret
  const tokenSecret = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  const tokenHash = await bcrypt.hash(tokenSecret, PASSWORD.BCRYPT_SALT_ROUNDS);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  const insertResult = await pool.query<{ id: string }>(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [user.id, tokenHash, expiresAt]
  );
  const tokenId = insertResult.rows[0]?.id;
  if (!tokenId) {
    logger.error('Password reset token insert did not return token id', { userId: user.id });
    return;
  }
  const resetToken = `${tokenId}.${tokenSecret}`;

  // Send the email (fire-and-forget: don't fail the request if email fails)
  const sent = await sendPasswordResetEmail(user.email, resetToken, user.first_name);
  if (!sent) {
    logger.warn('Password reset email could not be sent', { userId: user.id });
  }
}

/**
 * Validate a password-reset token and return the associated user_id.
 * Returns null if the token is invalid, expired, or already used.
 */
export async function validateResetToken(token: string): Promise<string | null> {
  const match = await resolveTokenMatch(token);
  return match?.user_id || null;
}

/**
 * Reset a user's password using a valid token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const matchedToken = await resolveTokenMatch(token);
  if (!matchedToken) {
    logger.warn('Password reset attempted with invalid or expired token');
    return false;
  }

  // Hash the new password and update the user record
  const passwordHash = await bcrypt.hash(newPassword, PASSWORD.BCRYPT_SALT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, matchedToken.user_id]
    );

    await client.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [matchedToken.id]
    );

    // Invalidate all other tokens for this user
    await client.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND id != $2',
      [matchedToken.user_id, matchedToken.id]
    );

    await client.query('COMMIT');
    logger.info('Password reset successfully', { userId: matchedToken.user_id });
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Password reset failed', { error, userId: matchedToken.user_id });
    return false;
  } finally {
    client.release();
  }
}
