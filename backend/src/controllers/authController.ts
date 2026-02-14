import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@config/database';
import { logger } from '@config/logger';
import { getJwtSecret } from '@config/jwt';
import { AuthRequest } from '@middleware/auth';
import { trackLoginAttempt } from '@middleware/accountLockout';
import { JWT, PASSWORD } from '@config/constants';
import { syncUserRole } from '@services/domains/integration';
import { requireUserOrError } from '@services/authGuardService';
import { issueTotpMfaChallenge } from './mfaController';
import { badRequest, conflict, forbidden, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import { setAuthCookie, setRefreshCookie, clearAuthCookies } from '@utils/cookieHelper';
import { buildAuthTokenResponse } from '@utils/authResponse';
import { generateCsrfToken } from '@middleware/domains/security';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
interface SetupRequest extends RegisterRequest {
  organizationName?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface UserRow {
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

const getDefaultOrganizationId = async (): Promise<string | null> => {
  try {
    const result = await pool.query(
      `SELECT id
       FROM accounts
       WHERE account_type = 'organization'
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

export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { email, password, firstName, lastName }: RegisterRequest = req.body;
    const role = 'user';

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return conflict(res, 'User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    // Create user
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, hashedPassword, firstName, lastName, role]
    );

    const user = result.rows[0];

    await syncUserRole(user.id, user.role);

    // Generate JWT token for immediate login after registration
    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    logger.info(`User registered: ${user.email}`);

    // Set auth cookie
    setAuthCookie(res, token);

    const organizationId = await getDefaultOrganizationId();
    return res.status(201).json({
      ...buildAuthTokenResponse(token),
      organizationId,
      user: {
        id: user.id,
        user_id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        profilePicture: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { email, password }: LoginRequest = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    // Get user with role information
    const result = await pool.query<UserRow>(
      `SELECT 
        u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, 
        u.profile_picture, u.mfa_totp_enabled,
        COALESCE(bool_or(r.mfa_required), FALSE) as mfa_required_by_role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = $1
      GROUP BY u.id`,
      [email]
    );

    if (result.rows.length === 0) {
      // Track failed attempt for non-existent user
      await trackLoginAttempt(email, false, undefined, clientIp);
      return unauthorized(res, 'Invalid credentials');
    }

    const user = result.rows[0];

    await syncUserRole(user.id, user.role);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Track failed login attempt
      await trackLoginAttempt(email, false, user.id, clientIp);
      logger.warn(`Failed login attempt for user: ${email}`, { ip: clientIp });
      return unauthorized(res, 'Invalid credentials');
    }

    // Check if MFA is required by role or user preference
    const mfaRequired = user.mfa_totp_enabled || user.mfa_required_by_role;

    // If TOTP is required (by role or user), require second factor before issuing tokens
    if (mfaRequired) {
      if (user.mfa_required_by_role && !user.mfa_totp_enabled) {
        logger.warn(`MFA enforced by role for user: ${user.email} but not yet enrolled`, { ip: clientIp });
        return res.status(403).json({
          error: {
            message: 'Multi-factor authentication is required for your role. Please enroll in MFA to continue.',
            code: 'MFA_REQUIRED_NOT_ENROLLED',
          },
        });
      }

      logger.info(`MFA required for user: ${user.email}`, { ip: clientIp });
      const organizationId = await getDefaultOrganizationId();
      return res.json({
        ...issueTotpMfaChallenge(user),
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
    }

    // Track successful login (no MFA required)
    await trackLoginAttempt(email, true, user.id, clientIp);

    // Generate access token
    const jwtSecret = getJwtSecret();

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token (for future use)
    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh',
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info(`User logged in: ${user.email}`, { ip: clientIp });

    // Set auth cookies
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);

    // Regenerate CSRF token after successful login
    const csrfToken = generateCsrfToken(req, res);

    const organizationId = await getDefaultOrganizationId();
    return res.json({
      ...buildAuthTokenResponse(token, refreshToken),
      csrfToken, // Include new CSRF token in response

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

export const logout = async (
  _req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<Response> => {
  // Clear all auth cookies
  clearAuthCookies(res);
  return res.json({ message: 'Logged out successfully' });
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Require authenticated user
    const guardResult = requireUserOrError(req);
    if (!guardResult.success) {
      return unauthorized(res, guardResult.error || 'Authentication required');
    }

    const userId = guardResult.user!.id;

    const result = await pool.query<UserRow>(
      'SELECT id, email, first_name, last_name, role, profile_picture, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    const user = result.rows[0];

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      profilePicture: user.profile_picture || null,
      createdAt: user.created_at,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/setup-status
 * Check if initial setup is required (no users exist)
 */
export const checkSetupStatus = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Check if any admin users exist
    const adminResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const adminCount = parseInt(adminResult.rows[0].count);

    // Also get total user count for reference
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(totalResult.rows[0].count);

    return res.json({
      setupRequired: adminCount === 0,
      userCount: userCount,
    });
  } catch (error) {
    logger.error('Error checking setup status', error);
    next(error);
  }
};

/**
 * POST /api/auth/setup
 * Create the first admin user (only works if no users exist)
 */
export const setupFirstUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Check if any admin users exist
    const countResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const adminCount = parseInt(countResult.rows[0].count);

    if (adminCount > 0) {
      return forbidden(res, 'Setup has already been completed. An admin user already exists.');
    }

    const { email, password, firstName, lastName, organizationName }: SetupRequest = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create first user as admin
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, passwordHash, firstName, lastName, 'admin']
    );

    const user = result.rows[0];

    const trimmedOrgName = organizationName?.trim();
    const defaultOrgName = process.env.ORG_DEFAULT_NAME || 'Default Organization';
    const orgName = trimmedOrgName && trimmedOrgName.length > 0 ? trimmedOrgName : defaultOrgName;
    const orgResult = await pool.query(
      `INSERT INTO accounts (account_name, account_type, created_by, modified_by)
       VALUES ($1, 'organization', $2, $2)
       RETURNING id`,
      [orgName, user.id]
    );
    const organizationId = orgResult.rows[0]?.id || null;

    // Generate access token
    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    logger.info(`First admin user created: ${email}`);

    // Set auth cookie
    setAuthCookie(res, token);

    return res.status(201).json({
      message: 'Setup completed successfully',
      ...buildAuthTokenResponse(token),
      organizationId,
      user: {
        user_id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        profilePicture: null,
      },
    });
  } catch (error) {
    logger.error('Error during first-time setup', error);
    next(error);
  }
};

/**
 * GET /api/auth/preferences
 * Get user preferences
 */
export const getPreferences = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Require authenticated user
    const guardResult = requireUserOrError(req);
    if (!guardResult.success) {
      return unauthorized(res, guardResult.error || 'Authentication required');
    }

    const userId = guardResult.user!.id;

    const result = await pool.query(
      'SELECT preferences FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    return res.json({
      preferences: result.rows[0].preferences || {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/preferences
 * Update user preferences (merge with existing)
 */
export const updatePreferences = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Require authenticated user
    const guardResult = requireUserOrError(req);
    if (!guardResult.success) {
      return unauthorized(res, guardResult.error || 'Authentication required');
    }

    const userId = guardResult.user!.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return badRequest(res, 'Preferences must be an object');
    }

    // Use jsonb_set to merge preferences rather than replace
    const result = await pool.query(
      `UPDATE users
       SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING preferences`,
      [JSON.stringify(preferences), userId]
    );

    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    logger.info(`User preferences updated: ${userId}`);

    return res.json({
      preferences: result.rows[0].preferences,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/auth/preferences/:key
 * Update a specific preference key
 */
export const updatePreferenceKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Require authenticated user
    const guardResult = requireUserOrError(req);
    if (!guardResult.success) {
      return unauthorized(res, guardResult.error || 'Authentication required');
    }

    const userId = guardResult.user!.id;
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return badRequest(res, 'Value is required');
    }

    // Update specific key in preferences
    const result = await pool.query(
      `UPDATE users
       SET preferences = COALESCE(preferences, '{}'::jsonb) || jsonb_build_object($1::text, $2::jsonb),
           updated_at = NOW()
       WHERE id = $3
       RETURNING preferences`,
      [key, JSON.stringify(value), userId]
    );

    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    logger.info(`User preference '${key}' updated: ${userId}`);

    return res.json({
      preferences: result.rows[0].preferences,
    });
  } catch (error) {
    next(error);
  }
};

interface AlternativeEmail {
  email: string;
  label: string;
  isVerified: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  donationAlerts: boolean;
  caseUpdates: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

interface ProfileRow {
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

/**
 * GET /api/auth/profile
 * Get full user profile including extended fields
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Require authenticated user
    const guardResult = requireUserOrError(req);
    if (!guardResult.success) {
      return unauthorized(res, guardResult.error || 'Authentication required');
    }

    const userId = guardResult.user!.id;

    const result = await pool.query<ProfileRow>(
      `SELECT id, email, first_name, last_name, role,
              display_name, alternative_name, pronouns, title,
              cell_phone, contact_number, profile_picture,
              email_shared_with_clients, email_shared_with_users,
              alternative_emails, notifications
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    const user = result.rows[0];

    const defaultNotifications: NotificationSettings = {
      emailNotifications: true,
      taskReminders: true,
      eventReminders: true,
      donationAlerts: true,
      caseUpdates: true,
      weeklyDigest: false,
      marketingEmails: false,
    };

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      displayName: user.display_name || '',
      alternativeName: user.alternative_name || '',
      pronouns: user.pronouns || '',
      title: user.title || '',
      cellPhone: user.cell_phone || '',
      contactNumber: user.contact_number || '',
      profilePicture: user.profile_picture || null,
      emailSharedWithClients: user.email_shared_with_clients || false,
      emailSharedWithUsers: user.email_shared_with_users || false,
      alternativeEmails: user.alternative_emails || [],
      notifications: user.notifications || defaultNotifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/profile
 * Update user profile
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Require authenticated user
    const guardResult = requireUserOrError(req);
    if (!guardResult.success) {
      return unauthorized(res, guardResult.error || 'Authentication required');
    }

    const userId = guardResult.user!.id;

    const {
      firstName,
      lastName,
      email,
      displayName,
      alternativeName,
      pronouns,
      title,
      cellPhone,
      contactNumber,
      profilePicture,
      emailSharedWithClients,
      emailSharedWithUsers,
      alternativeEmails,
      notifications,
    } = req.body;

    // Check if email is being changed and if it's already taken
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (emailCheck.rows.length > 0) {
        return conflict(res, 'Email is already in use by another account');
      }
    }

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
        firstName,
        lastName,
        email,
        displayName || null,
        alternativeName || null,
        pronouns || null,
        title || null,
        cellPhone || null,
        contactNumber || null,
        profilePicture || null,
        emailSharedWithClients,
        emailSharedWithUsers,
        alternativeEmails ? JSON.stringify(alternativeEmails) : null,
        notifications ? JSON.stringify(notifications) : null,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    const user = result.rows[0];

    const defaultNotifications: NotificationSettings = {
      emailNotifications: true,
      taskReminders: true,
      eventReminders: true,
      donationAlerts: true,
      caseUpdates: true,
      weeklyDigest: false,
      marketingEmails: false,
    };

    logger.info(`User profile updated: ${user.email}`);

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      displayName: user.display_name || '',
      alternativeName: user.alternative_name || '',
      pronouns: user.pronouns || '',
      title: user.title || '',
      cellPhone: user.cell_phone || '',
      contactNumber: user.contact_number || '',
      profilePicture: user.profile_picture || null,
      emailSharedWithClients: user.email_shared_with_clients || false,
      emailSharedWithUsers: user.email_shared_with_users || false,
      alternativeEmails: user.alternative_emails || [],
      notifications: user.notifications || defaultNotifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/password
 * Change user password
 */
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Require authenticated user
    const guardResult = requireUserOrError(req);
    if (!guardResult.success) {
      return unauthorized(res, guardResult.error || 'Authentication required');
    }

    const userId = guardResult.user!.id;

    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const userResult = await pool.query<{ password_hash: string; email: string }>(
      'SELECT password_hash, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return unauthorized(res, 'Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, PASSWORD.BCRYPT_SALT_ROUNDS);

    // Update password
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hashedPassword, userId]
    );

    logger.info(`Password changed for user: ${user.email}`);

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
