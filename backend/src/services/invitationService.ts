/**
 * Invitation Service
 * Handles user invitation management
 */

import crypto from 'crypto';
import pool from '../config/database';
import { logger } from '../config/logger';

export interface UserInvitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedBy: string | null;
  isRevoked: boolean;
  revokedAt: Date | null;
  revokedBy: string | null;
  message: string | null;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
}

export interface CreateInvitationDTO {
  email: string;
  role: string;
  message?: string;
  expiresInDays?: number;
}

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: Date;
  accepted_at: Date | null;
  accepted_by: string | null;
  is_revoked: boolean;
  revoked_at: Date | null;
  revoked_by: string | null;
  message: string | null;
  created_at: Date;
  created_by: string;
  created_by_name?: string;
}

/**
 * Generate a secure random token for invitation URL
 */
const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Map database row to invitation object
 */
const mapRowToInvitation = (row: InvitationRow): UserInvitation => ({
  id: row.id,
  email: row.email,
  role: row.role,
  token: row.token,
  expiresAt: row.expires_at,
  acceptedAt: row.accepted_at,
  acceptedBy: row.accepted_by,
  isRevoked: row.is_revoked,
  revokedAt: row.revoked_at,
  revokedBy: row.revoked_by,
  message: row.message,
  createdAt: row.created_at,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
});

/**
 * Create a new user invitation
 */
export const createInvitation = async (
  data: CreateInvitationDTO,
  createdBy: string
): Promise<UserInvitation> => {
  const token = generateToken();
  const expiresInDays = data.expiresInDays || 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Check if email already has a user account
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [data.email.toLowerCase()]
  );
  if (existingUser.rows.length > 0) {
    throw new Error('A user with this email already exists');
  }

  // Check if there's already a pending invitation for this email
  const existingInvitation = await pool.query(
    `SELECT id FROM user_invitations
     WHERE email = $1 AND is_revoked = false AND accepted_at IS NULL AND expires_at > NOW()`,
    [data.email.toLowerCase()]
  );
  if (existingInvitation.rows.length > 0) {
    throw new Error('A pending invitation already exists for this email');
  }

  const result = await pool.query<InvitationRow>(
    `INSERT INTO user_invitations (email, role, token, expires_at, message, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.email.toLowerCase(), data.role, token, expiresAt, data.message || null, createdBy]
  );

  logger.info(`User invitation created for ${data.email}`, { createdBy, role: data.role });

  return mapRowToInvitation(result.rows[0]);
};

/**
 * Get all invitations (for admin listing)
 */
export const getInvitations = async (options: {
  includeExpired?: boolean;
  includeAccepted?: boolean;
  includeRevoked?: boolean;
}): Promise<UserInvitation[]> => {
  const conditions: string[] = [];

  if (!options.includeExpired) {
    conditions.push('(expires_at > NOW() OR accepted_at IS NOT NULL)');
  }
  if (!options.includeAccepted) {
    conditions.push('accepted_at IS NULL');
  }
  if (!options.includeRevoked) {
    conditions.push('is_revoked = false');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query<InvitationRow>(
    `SELECT i.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM user_invitations i
     LEFT JOIN users u ON i.created_by = u.id
     ${whereClause}
     ORDER BY i.created_at DESC`
  );

  return result.rows.map(mapRowToInvitation);
};

/**
 * Get invitation by ID
 */
export const getInvitationById = async (id: string): Promise<UserInvitation | null> => {
  const result = await pool.query<InvitationRow>(
    `SELECT i.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM user_invitations i
     LEFT JOIN users u ON i.created_by = u.id
     WHERE i.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToInvitation(result.rows[0]);
};

/**
 * Get invitation by token (for acceptance flow)
 */
export const getInvitationByToken = async (token: string): Promise<UserInvitation | null> => {
  const result = await pool.query<InvitationRow>(
    `SELECT i.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM user_invitations i
     LEFT JOIN users u ON i.created_by = u.id
     WHERE i.token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToInvitation(result.rows[0]);
};

/**
 * Validate if an invitation can be accepted
 */
export const validateInvitation = async (token: string): Promise<{
  valid: boolean;
  invitation: UserInvitation | null;
  error?: string;
}> => {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return { valid: false, invitation: null, error: 'Invitation not found' };
  }

  if (invitation.isRevoked) {
    return { valid: false, invitation, error: 'This invitation has been revoked' };
  }

  if (invitation.acceptedAt) {
    return { valid: false, invitation, error: 'This invitation has already been used' };
  }

  if (new Date() > invitation.expiresAt) {
    return { valid: false, invitation, error: 'This invitation has expired' };
  }

  // Check if email already has a user account (someone may have created one since invitation)
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [invitation.email]
  );
  if (existingUser.rows.length > 0) {
    return { valid: false, invitation, error: 'A user with this email already exists' };
  }

  return { valid: true, invitation };
};

/**
 * Mark invitation as accepted
 */
export const markInvitationAccepted = async (
  invitationId: string,
  userId: string
): Promise<void> => {
  await pool.query(
    `UPDATE user_invitations
     SET accepted_at = NOW(), accepted_by = $1
     WHERE id = $2`,
    [userId, invitationId]
  );

  logger.info(`Invitation ${invitationId} accepted`, { userId });
};

/**
 * Revoke an invitation
 */
export const revokeInvitation = async (
  invitationId: string,
  revokedBy: string
): Promise<UserInvitation | null> => {
  const result = await pool.query<InvitationRow>(
    `UPDATE user_invitations
     SET is_revoked = true, revoked_at = NOW(), revoked_by = $1
     WHERE id = $2 AND is_revoked = false AND accepted_at IS NULL
     RETURNING *`,
    [revokedBy, invitationId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  logger.info(`Invitation ${invitationId} revoked`, { revokedBy });

  return mapRowToInvitation(result.rows[0]);
};

/**
 * Resend an invitation (generates new token and expiry)
 */
export const resendInvitation = async (
  invitationId: string,
  updatedBy: string
): Promise<UserInvitation | null> => {
  const newToken = generateToken();
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 7);

  const result = await pool.query<InvitationRow>(
    `UPDATE user_invitations
     SET token = $1, expires_at = $2
     WHERE id = $3 AND is_revoked = false AND accepted_at IS NULL
     RETURNING *`,
    [newToken, newExpiry, invitationId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  logger.info(`Invitation ${invitationId} resent with new token`, { updatedBy });

  return mapRowToInvitation(result.rows[0]);
};
