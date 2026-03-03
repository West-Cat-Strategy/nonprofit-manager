import type { Response } from 'express';
import pool from '@config/database';
import { requireUserSafe } from '@services/authGuardService';
import { unauthorized } from '@utils/responseHelpers';
import type { AuthRequest } from '@middleware/auth';

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SetupRequest extends RegisterRequest {
  organizationName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: Date;
  profile_picture?: string | null;
  preferences?: Record<string, unknown>;
  mfa_totp_enabled?: boolean;
  mfa_required_by_role?: boolean;
}

export interface AlternativeEmail {
  email: string;
  label: string;
  isVerified: boolean;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  donationAlerts: boolean;
  caseUpdates: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

export interface ProfileRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  display_name: string | null;
  alternative_name: string | null;
  pronouns: string | null;
  title: string | null;
  cell_phone: string | null;
  contact_number: string | null;
  profile_picture: string | null;
  email_shared_with_clients: boolean;
  email_shared_with_users: boolean;
  alternative_emails: AlternativeEmail[];
  notifications: NotificationSettings;
}

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  displayName?: string;
  alternativeName?: string;
  pronouns?: string;
  title?: string;
  cellPhone?: string;
  contactNumber?: string;
  profilePicture?: string;
  emailSharedWithClients?: boolean;
  emailSharedWithUsers?: boolean;
  alternativeEmails?: unknown[];
  notifications?: Record<string, unknown>;
}

export const requireAuthenticatedUser = (
  req: AuthRequest,
  res: Response
): { id: string; role: string } | null => {
  const guardResult = requireUserSafe(req);
  if (!guardResult.ok) {
    unauthorized(res, guardResult.error.message || 'Authentication required');
    return null;
  }

  return {
    id: guardResult.data.user.id,
    role: guardResult.data.user.role,
  };
};

export const getDefaultOrganizationId = async (): Promise<string | null> => {
  try {
    const result = await pool.query(
      `SELECT id
       FROM accounts
       WHERE account_type = 'organization'
         AND COALESCE(is_active, true) = true
       ORDER BY created_at ASC
       LIMIT 1`
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    const pgError = error as { code?: string };
    // Some tests run against partial schemas where accounts may not exist yet.
    if (pgError.code === '42P01') {
      return null;
    }
    throw error;
  }
};

export const findUserIdByEmail = async (email: string): Promise<string | null> => {
  const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  return result.rows[0]?.id || null;
};

export const createAuthUser = async (input: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
}): Promise<UserRow> => {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id, email, first_name, last_name, role, created_at`,
    [input.email, input.passwordHash, input.firstName, input.lastName, input.role]
  );

  return result.rows[0];
};

export const countAdminUsers = async (): Promise<number> => {
  const result = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
  return parseInt(result.rows[0].count, 10);
};

export const countAllUsers = async (): Promise<number> => {
  const result = await pool.query('SELECT COUNT(*) as count FROM users');
  return parseInt(result.rows[0].count, 10);
};

export const createInitialAdminUser = async (input: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}): Promise<Pick<UserRow, 'id' | 'email' | 'first_name' | 'last_name' | 'role' | 'created_at'>> => {
  const result = await pool.query<Pick<UserRow, 'id' | 'email' | 'first_name' | 'last_name' | 'role' | 'created_at'>>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, role, created_at`,
    [input.email, input.passwordHash, input.firstName, input.lastName, 'admin']
  );

  return result.rows[0];
};

export const createOrganizationAccount = async (
  accountName: string,
  userId: string
): Promise<string | null> => {
  const result = await pool.query(
    `INSERT INTO accounts (account_name, account_type, created_by, modified_by)
     VALUES ($1, 'organization', $2, $2)
     RETURNING id`,
    [accountName, userId]
  );
  return result.rows[0]?.id || null;
};

export const getUserPreferences = async (
  userId: string
): Promise<Record<string, unknown> | null> => {
  const result = await pool.query<{ preferences: Record<string, unknown> | null }>(
    'SELECT preferences FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].preferences || {};
};

export const mergeUserPreferences = async (
  userId: string,
  preferences: Record<string, unknown>
): Promise<Record<string, unknown> | null> => {
  const result = await pool.query<{ preferences: Record<string, unknown> }>(
    `UPDATE users
     SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING preferences`,
    [JSON.stringify(preferences), userId]
  );

  return result.rows[0]?.preferences || null;
};

export const updateUserPreference = async (
  userId: string,
  key: string,
  value: unknown
): Promise<Record<string, unknown> | null> => {
  const result = await pool.query<{ preferences: Record<string, unknown> }>(
    `UPDATE users
     SET preferences = COALESCE(preferences, '{}'::jsonb) || jsonb_build_object($1::text, $2::jsonb),
         updated_at = NOW()
     WHERE id = $3
     RETURNING preferences`,
    [key, JSON.stringify(value), userId]
  );

  return result.rows[0]?.preferences || null;
};

export const getProfileById = async (userId: string): Promise<ProfileRow | null> => {
  const result = await pool.query<ProfileRow>(
    `SELECT id, email, first_name, last_name, role,
            display_name, alternative_name, pronouns, title,
            cell_phone, contact_number, profile_picture,
            email_shared_with_clients, email_shared_with_users,
            alternative_emails, notifications
     FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
};

export const findExistingUserByEmailExcludingId = async (
  email: string,
  userId: string
): Promise<string | null> => {
  const result = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
  return result.rows[0]?.id || null;
};

export const updateProfileById = async (
  userId: string,
  input: ProfileUpdateInput
): Promise<ProfileRow | null> => {
  const result = await pool.query<ProfileRow>(
    `UPDATE users
     SET first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         email = COALESCE($3, email),
         display_name = $4,
         alternative_name = $5,
         pronouns = $6,
         title = $7,
         cell_phone = $8,
         contact_number = $9,
         profile_picture = $10,
         email_shared_with_clients = COALESCE($11, email_shared_with_clients),
         email_shared_with_users = COALESCE($12, email_shared_with_users),
         alternative_emails = COALESCE($13, alternative_emails),
         notifications = COALESCE($14, notifications),
         updated_at = NOW()
     WHERE id = $15
     RETURNING id, email, first_name, last_name, role,
               display_name, alternative_name, pronouns, title,
               cell_phone, contact_number, profile_picture,
               email_shared_with_clients, email_shared_with_users,
               alternative_emails, notifications`,
    [
      input.firstName,
      input.lastName,
      input.email,
      input.displayName || null,
      input.alternativeName || null,
      input.pronouns || null,
      input.title || null,
      input.cellPhone || null,
      input.contactNumber || null,
      input.profilePicture || null,
      input.emailSharedWithClients,
      input.emailSharedWithUsers,
      input.alternativeEmails ? JSON.stringify(input.alternativeEmails) : null,
      input.notifications ? JSON.stringify(input.notifications) : null,
      userId,
    ]
  );

  return result.rows[0] || null;
};

export const getPasswordHashByUserId = async (
  userId: string
): Promise<{ password_hash: string; email: string } | null> => {
  const result = await pool.query<{ password_hash: string; email: string }>(
    'SELECT password_hash, email FROM users WHERE id = $1',
    [userId]
  );

  return result.rows[0] || null;
};

export const updateUserPasswordHash = async (
  userId: string,
  passwordHash: string
): Promise<void> => {
  await pool.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
    passwordHash,
    userId,
  ]);
};
