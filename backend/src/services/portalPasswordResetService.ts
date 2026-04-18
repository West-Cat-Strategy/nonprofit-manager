import pool from '@config/database';
import { logger } from '@config/logger';
import { sendPortalPasswordResetEmail } from './emailService';
import {
  createPasswordResetToken,
  performPasswordReset,
  type PasswordResetCoreConfig,
  validatePasswordResetToken,
} from './passwordResetCore';

const PORTAL_PASSWORD_RESET_CONFIG: PasswordResetCoreConfig = {
  tokenTable: 'portal_password_reset_tokens',
  ownerColumn: 'portal_user_id',
  userTable: 'portal_users',
  logContextKey: 'portalUserId',
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

  const resetToken = await createPasswordResetToken(user.id, PORTAL_PASSWORD_RESET_CONFIG, {
    insertFailure: 'Portal password reset token insert did not return token id',
  });
  if (!resetToken) {
    return;
  }

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
  return validatePasswordResetToken(token, PORTAL_PASSWORD_RESET_CONFIG);
}

export async function resetPortalPassword(token: string, newPassword: string): Promise<boolean> {
  return performPasswordReset(token, newPassword, PORTAL_PASSWORD_RESET_CONFIG, {
    invalidToken: 'Portal password reset attempted with invalid or expired token',
    resetSucceeded: 'Portal password reset successfully',
    resetFailed: 'Portal password reset failed',
  });
}
