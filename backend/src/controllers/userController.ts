/**
 * User Management Controller
 * Handles CRUD operations for users (admin only)
 */

import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { PASSWORD } from '@config/constants';
import { syncUserRole } from '@services/domains/integration';
import * as userManagementService from '@services/userManagementService';
import { badRequest, conflict, forbidden, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

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

    const query = ((req as any).validatedQuery ?? req.query) as {
      search?: string;
      role?: string;
      is_active?: boolean | string;
    };
    const users = (await userManagementService.listUsers({
      search: typeof query.search === 'string' ? query.search : undefined,
      role: typeof query.role === 'string' ? query.role : undefined,
      isActive:
        typeof query.is_active === 'boolean'
          ? query.is_active
          : typeof query.is_active === 'string'
            ? query.is_active === 'true'
            : undefined,
    })).map((user) => ({
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

    return sendSuccess(res, { users, total: users.length });
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
    const user = await userManagementService.getUserById(id);
    if (!user) {
      return notFoundMessage(res, 'User not found');
    }

    return sendSuccess(res, {
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

    const { email, password, firstName, lastName, role = 'user' } = req.body;

    // Check if user already exists
    const existingUserId = await userManagementService.findUserByEmail(email);
    if (existingUserId) {
      return conflict(res, 'User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await userManagementService.createUser({
      email,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role,
      createdBy: req.user.id,
    });

    await syncUserRole(user.id, user.role);

    logger.info(`User created by admin: ${user.email}`, { adminId: req.user.id });

    return sendSuccess(
      res,
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        profilePicture: user.profile_picture || null,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      201
    );
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

    const { id } = req.params;
    const { email, firstName, lastName, role, isActive } = req.body;

    // Check if user exists
    const existingUser = await userManagementService.getUserRoleById(id);
    if (!existingUser) {
      return notFoundMessage(res, 'User not found');
    }

    // Prevent demoting the last admin
    if (existingUser.role === 'admin' && role !== 'admin') {
      const adminCount = await userManagementService.countActiveAdmins();
      if (adminCount <= 1) {
        return badRequest(res, 'Cannot demote the last admin user');
      }
    }

    // Prevent deactivating the last admin
    if (existingUser.role === 'admin' && isActive === false) {
      const adminCount = await userManagementService.countActiveAdmins();
      if (adminCount <= 1) {
        return badRequest(res, 'Cannot deactivate the last admin user');
      }
    }

    // Check for email conflict
    if (email) {
      const emailCheckId = await userManagementService.findUserByEmailExcludingId(email, id);
      if (emailCheckId) {
        return conflict(res, 'Another user with this email already exists');
      }
    }

    const user = await userManagementService.updateUser({
      id,
      email,
      firstName,
      lastName,
      role,
      isActive,
      modifiedBy: req.user.id,
    });
    if (!user) {
      return notFoundMessage(res, 'User not found');
    }

    if (existingUser.role !== user.role) {
      await syncUserRole(user.id, user.role);
    }

    logger.info(`User updated by admin: ${user.email}`, { adminId: req.user.id, userId: id });

    return sendSuccess(res, {
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

    const { id } = req.params;
    const { password } = req.body;

    // Check if user exists
    const existingUser = await userManagementService.getUserIdentityById(id);
    if (!existingUser) {
      return notFoundMessage(res, 'User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    await userManagementService.updateUserPassword(id, hashedPassword, req.user.id);

    logger.info(`Password reset by admin for user: ${existingUser.email}`, { adminId: req.user.id, userId: id });

    return sendSuccess(res, { message: 'Password reset successfully' });
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
    const existingUser = await userManagementService.getUserRoleIdentityById(id);
    if (!existingUser) {
      return notFoundMessage(res, 'User not found');
    }

    // Prevent deleting the last admin
    if (existingUser.role === 'admin') {
      const adminCount = await userManagementService.countActiveAdmins();
      if (adminCount <= 1) {
        return badRequest(res, 'Cannot delete the last admin user');
      }
    }

    // Soft delete - just deactivate the user
    await userManagementService.deactivateUser(id, req.user.id);

    logger.info(`User deactivated by admin: ${existingUser.email}`, { adminId: req.user.id, userId: id });

    return sendSuccess(res, { message: 'User deactivated successfully' });
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

  return sendSuccess(res, { roles });
};
