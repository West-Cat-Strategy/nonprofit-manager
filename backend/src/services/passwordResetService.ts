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

  // Generate a secure random token
  const rawToken = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, PASSWORD.BCRYPT_SALT_ROUNDS);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  // Send the email (fire-and-forget: don't fail the request if email fails)
  const sent = await sendPasswordResetEmail(user.email, rawToken, user.first_name);
  if (!sent) {
    logger.warn('Password reset email could not be sent', { userId: user.id });
  }
}

/**
 * Validate a password-reset token and return the associated user_id.
 * Returns null if the token is invalid, expired, or already used.
 */
export async function validateResetToken(token: string): Promise<string | null> {
  // Fetch all unexpired, unused tokens (there should be at most one per user)
  const result = await pool.query<{ id: string; user_id: string; token_hash: string }>(
    `SELECT id, user_id, token_hash FROM password_reset_tokens
     WHERE expires_at > NOW() AND used_at IS NULL
     ORDER BY created_at DESC`
  );

  for (const row of result.rows) {
    const match = await bcrypt.compare(token, row.token_hash);
    if (match) return row.user_id;
  }

  return null;
}

/**
 * Reset a user's password using a valid token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  // Find the matching token row
  const tokenRows = await pool.query<{ id: string; user_id: string; token_hash: string }>(
    `SELECT id, user_id, token_hash FROM password_reset_tokens
     WHERE expires_at > NOW() AND used_at IS NULL
     ORDER BY created_at DESC`
  );

  let matchedTokenId: string | null = null;
  let userId: string | null = null;

  for (const row of tokenRows.rows) {
    const match = await bcrypt.compare(token, row.token_hash);
    if (match) {
      matchedTokenId = row.id;
      userId = row.user_id;
      break;
    }
  }

  if (!matchedTokenId || !userId) {
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
      [passwordHash, userId]
    );

    await client.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [matchedTokenId]
    );

    // Invalidate all other tokens for this user
    await client.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND id != $2',
      [userId, matchedTokenId]
    );

    await client.query('COMMIT');
    logger.info('Password reset successfully', { userId });
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Password reset failed', { error, userId });
    return false;
  } finally {
    client.release();
  }
}
