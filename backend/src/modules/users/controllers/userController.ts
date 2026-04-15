/**
 * User Management Controller
 * Handles CRUD operations for users.
 */

import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { PASSWORD } from '@config/constants';
import { getAccountLockoutStatus, setAccountLockState } from '@middleware/accountLockout';
import { syncUserRole } from '@services/domains/integration';
import {
  getUserAccessOverview,
  getUsersAccessOverview,
  seedDefaultOrganizationAccess,
} from '@services/accountAccessService';
import { getRoleSelectorItems } from '@modules/admin/usecases/roleCatalogUseCase';
import * as userManagementService from '@services/userManagementService';
import type { UserRecord } from '@services/userManagementService';
import { badRequest, conflict, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

const serializeManagedUser = (
  user: UserRecord,
  accessOverview: Awaited<ReturnType<typeof getUserAccessOverview>>,
  securityState?: Awaited<ReturnType<typeof getAccountLockoutStatus>>
) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  role: user.role,
  profilePicture: user.profile_picture || null,
  isActive: user.is_active,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
  lastLoginAt: null,
  lastPasswordChange: null,
  failedLoginAttempts: securityState?.failedLoginAttempts ?? 0,
  isLocked: securityState?.isLocked ?? false,
  groups: accessOverview.groups,
  organizationAccess: accessOverview.organizationAccess,
  mfaTotpEnabled: accessOverview.mfaTotpEnabled,
  passkeyCount: accessOverview.passkeyCount,
});

export const listUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const query = (req.validatedQuery ?? req.query) as {
      search?: string;
      role?: string;
      is_active?: boolean | string;
      limit?: number | string;
    };
    const limit =
      typeof query.limit === 'number'
        ? query.limit
        : typeof query.limit === 'string'
          ? Number.parseInt(query.limit, 10) || undefined
          : undefined;

    const users = await userManagementService.listUsers({
      search: typeof query.search === 'string' ? query.search : undefined,
      role: typeof query.role === 'string' ? query.role : undefined,
      isActive:
        typeof query.is_active === 'boolean'
          ? query.is_active
          : typeof query.is_active === 'string'
            ? query.is_active === 'true'
            : undefined,
    });
    const limitedUsers = typeof limit === 'number' ? users.slice(0, limit) : users;
    const accessOverviewByUserId = await getUsersAccessOverview(
      limitedUsers.map((user) => user.id)
    );

    return sendSuccess(res, {
      users: limitedUsers.map((user) =>
        serializeManagedUser(
          user,
          accessOverviewByUserId[user.id] ?? {
            groups: [],
            organizationAccess: [],
            mfaTotpEnabled: false,
            passkeyCount: 0,
          }
        )
      ),
      total: users.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const user = await userManagementService.getUserById(id);
    if (!user) {
      return notFoundMessage(res, 'User not found');
    }

    const [accessOverview, securityState] = await Promise.all([
      getUserAccessOverview(user.id),
      getAccountLockoutStatus(user.email),
    ]);

    return sendSuccess(res, serializeManagedUser(user, accessOverview, securityState));
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { email, password, firstName, lastName, role = 'staff' } = req.body;

    const existingUserId = await userManagementService.findUserByEmail(email);
    if (existingUserId) {
      return conflict(res, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);
    const user = await userManagementService.createUser({
      email,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role,
      createdBy: req.user!.id,
    });

    await syncUserRole(user.id, user.role);
    await seedDefaultOrganizationAccess({
      userId: user.id,
      role: user.role,
      grantedBy: req.user!.id,
    });

    const accessOverview = await getUserAccessOverview(user.id);

    logger.info(`User created by admin: ${user.email}`, { adminId: req.user!.id });

    return sendSuccess(res, serializeManagedUser(user, accessOverview), 201);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, isActive, isLocked } = req.body as {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      isActive?: boolean;
      isLocked?: boolean;
    };

    const existingUser = await userManagementService.getUserRoleIdentityById(id);
    if (!existingUser) {
      return notFoundMessage(res, 'User not found');
    }

    if (existingUser.role === 'admin' && role && role !== 'admin') {
      const adminCount = await userManagementService.countActiveAdmins();
      if (adminCount <= 1) {
        return badRequest(res, 'Cannot demote the last admin user');
      }
    }

    if (existingUser.role === 'admin' && isActive === false) {
      const adminCount = await userManagementService.countActiveAdmins();
      if (adminCount <= 1) {
        return badRequest(res, 'Cannot deactivate the last admin user');
      }
    }

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
      modifiedBy: req.user!.id,
    });
    if (!user) {
      return notFoundMessage(res, 'User not found');
    }

    if (existingUser.role !== user.role) {
      await syncUserRole(user.id, user.role);
    }

    if (typeof isLocked === 'boolean') {
      if (email && email !== existingUser.email) {
        await setAccountLockState(existingUser.email, false, user.id);
      }
      const lockIdentifier = email ?? existingUser.email;
      await setAccountLockState(lockIdentifier, isLocked, user.id);
    }

    const [accessOverview, securityState] = await Promise.all([
      getUserAccessOverview(user.id),
      getAccountLockoutStatus(email ?? user.email),
    ]);

    logger.info(`User updated by admin: ${user.email}`, {
      adminId: req.user!.id,
      userId: id,
    });

    return sendSuccess(res, serializeManagedUser(user, accessOverview, securityState));
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const existingUser = await userManagementService.getUserIdentityById(id);
    if (!existingUser) {
      return notFoundMessage(res, 'User not found');
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);
    await userManagementService.updateUserPassword(id, hashedPassword, req.user!.id);

    logger.info(`Password reset by admin for user: ${existingUser.email}`, {
      adminId: req.user!.id,
      userId: id,
    });

    return sendSuccess(res, { message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return badRequest(res, 'Cannot delete your own account');
    }

    const existingUser = await userManagementService.getUserRoleIdentityById(id);
    if (!existingUser) {
      return notFoundMessage(res, 'User not found');
    }

    if (existingUser.role === 'admin') {
      const adminCount = await userManagementService.countActiveAdmins();
      if (adminCount <= 1) {
        return badRequest(res, 'Cannot delete the last admin user');
      }
    }

    await userManagementService.deactivateUser(id, req.user!.id);

    logger.info(`User deactivated by admin: ${existingUser.email}`, {
      adminId: req.user!.id,
      userId: id,
    });

    return sendSuccess(res, { message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getRoles = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const roles = await getRoleSelectorItems();
    return sendSuccess(res, { roles });
  } catch (error) {
    next(error);
  }
};
