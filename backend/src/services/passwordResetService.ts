import pool from '@config/database';
import { logger } from '@config/logger';
import { sendPasswordResetEmail } from './emailService';
import {
  createPasswordResetToken,
  performPasswordReset,
  type PasswordResetCoreConfig,
  validatePasswordResetToken,
} from './passwordResetCore';

const PASSWORD_RESET_CONFIG: PasswordResetCoreConfig = {
  tokenTable: 'password_reset_tokens',
  ownerColumn: 'user_id',
  userTable: 'users',
  logContextKey: 'userId',
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

  const resetToken = await createPasswordResetToken(user.id, PASSWORD_RESET_CONFIG, {
    insertFailure: 'Password reset token insert did not return token id',
  });
  if (!resetToken) {
    return;
  }

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
  return validatePasswordResetToken(token, PASSWORD_RESET_CONFIG);
}

/**
 * Reset a user's password using a valid token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  return performPasswordReset(token, newPassword, PASSWORD_RESET_CONFIG, {
    invalidToken: 'Password reset attempted with invalid or expired token',
    resetSucceeded: 'Password reset successfully',
    resetFailed: 'Password reset failed',
  });
}
