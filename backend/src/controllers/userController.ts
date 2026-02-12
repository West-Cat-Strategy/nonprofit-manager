/**
 * User Management Controller
 * Handles CRUD operations for users (admin only)
 */

import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import pool from '@config/database';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { PASSWORD } from '@config/constants';
import { syncUserRole } from '@services';
import { badRequest, conflict, forbidden, notFoundMessage, validationErrorResponse } from '@utils/responseHelpers';

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * GET /api/users
 * List all users (admin only)
 */
export const listUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const { search, role, is_active } = req.query;
    const conditions: string[] = [];
    const params: (string | boolean)[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        CONCAT(first_name, ' ', last_name) ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      conditions.push(`role = $${paramIndex}`);
      params.push(role as string);
      paramIndex++;
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(is_active === 'true');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<UserRow>(
      `SELECT id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    const users = result.rows.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      profilePicture: user.profile_picture || null,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    return res.json({ users, total: users.length });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Get a single user by ID (admin only)
 */
export const getUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const { id } = req.params;

    const result = await pool.query<UserRow>(
      `SELECT id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
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
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users
 * Create a new user (admin only)
 */
export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { email, password, firstName, lastName, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return conflict(res, 'User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    // Create user
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at, created_by)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), $6)
       RETURNING id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at`,
      [email, hashedPassword, firstName, lastName, role, req.user.id]
    );

    const user = result.rows[0];

    await syncUserRole(user.id, user.role);

    logger.info(`User created by admin: ${user.email}`, { adminId: req.user.id });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      profilePicture: user.profile_picture || null,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { id } = req.params;
    const { email, firstName, lastName, role, isActive } = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    // Prevent demoting the last admin
    if (existingUser.rows[0].role === 'admin' && role !== 'admin') {
      const adminCount = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return badRequest(res, 'Cannot demote the last admin user');
      }
    }

    // Prevent deactivating the last admin
    if (existingUser.rows[0].role === 'admin' && isActive === false) {
      const adminCount = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return badRequest(res, 'Cannot deactivate the last admin user');
      }
    }

    // Check for email conflict
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return conflict(res, 'Another user with this email already exists');
      }
    }

    const result = await pool.query<UserRow>(
      `UPDATE users
       SET email = COALESCE($1, email),
           first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           role = COALESCE($4, role),
           is_active = COALESCE($5, is_active),
           updated_at = NOW(),
           modified_by = $6
       WHERE id = $7
       RETURNING id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at`,
      [email, firstName, lastName, role, isActive, req.user.id, id]
    );

    const user = result.rows[0];

    if (existingUser.rows[0].role !== user.role) {
      await syncUserRole(user.id, user.role);
    }

    logger.info(`User updated by admin: ${user.email}`, { adminId: req.user.id, userId: id });

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      profilePicture: user.profile_picture || null,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/password
 * Reset a user's password (admin only)
 */
export const resetUserPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { id } = req.params;
    const { password } = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    await pool.query(
      `UPDATE users
       SET password_hash = $1, updated_at = NOW(), modified_by = $2
       WHERE id = $3`,
      [hashedPassword, req.user.id, id]
    );

    logger.info(`Password reset by admin for user: ${existingUser.rows[0].email}`, { adminId: req.user.id, userId: id });

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Delete a user (admin only) - soft delete by deactivating
 */
export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'admin') {
      return forbidden(res, 'Admin access required');
    }

    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return badRequest(res, 'Cannot delete your own account');
    }

    // Check if user exists and their role
    const existingUser = await pool.query('SELECT id, role, email FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }

    // Prevent deleting the last admin
    if (existingUser.rows[0].role === 'admin') {
      const adminCount = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return badRequest(res, 'Cannot delete the last admin user');
      }
    }

    // Soft delete - just deactivate the user
    await pool.query(
      `UPDATE users
       SET is_active = false, updated_at = NOW(), modified_by = $1
       WHERE id = $2`,
      [req.user.id, id]
    );

    logger.info(`User deactivated by admin: ${existingUser.rows[0].email}`, { adminId: req.user.id, userId: id });

    return res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/roles
 * Get available user roles
 */
export const getRoles = async (
  req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<Response | void> => {
  if (req.user?.role !== 'admin') {
    return forbidden(res, 'Admin access required');
  }

  const roles = [
    { value: 'admin', label: 'Administrator', description: 'Full access to all features and settings' },
    { value: 'manager', label: 'Manager', description: 'Can manage records but not system settings' },
    { value: 'user', label: 'User', description: 'Standard access to view and edit records' },
    { value: 'readonly', label: 'Read Only', description: 'Can only view records, no editing' },
  ];

  return res.json({ roles });
};
