/**
 * Permission Middleware
 * Express middleware for enforcing permissions on routes
 */

import { Response, NextFunction } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { forbidden } from '@utils/responseHelpers';
import { hasPermission, type Permission } from '@utils/permissions';

/**
 * Require a specific permission
 * Usage: router.post('/create', requirePermission(Permission.VOLUNTEER_CREATE), handler)
 */
export function requirePermission(permission: Permission | string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      forbidden(res, 'Unauthorized: No user');
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      forbidden(res, `Permission denied: requires '${permission}'`);
      return;
    }

    next();
  };
}

/**
 * Require any of multiple permissions
 * Usage: router.get('/view', requireAnyPermission(Permission.VOLUNTEER_VIEW, Permission.ADMIN_USERS), handler)
 */
export function requireAnyPermission(...permissions: (Permission | string)[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      forbidden(res, 'Unauthorized: No user');
      return;
    }

    const hasAny = permissions.some((perm) => hasPermission(req.user!.role, perm));

    if (!hasAny) {
      forbidden(res, 'Permission denied: none of the required permissions granted');
      return;
    }

    next();
  };
}

/**
 * Require specific role(s)
 * Usage: router.post('/admin', requireRole('admin', 'manager'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      forbidden(res, 'Unauthorized: No user');
      return;
    }

    if (!roles.includes(req.user.role)) {
      forbidden(res, `Permission denied: requires role [${roles.join(', ')}]`);
      return;
    }

    next();
  };
}

/**
 * Require admin role
 * Usage: router.delete('/admin', requireAdmin, handler)
 */
export const requireAdmin = requireRole('admin');

/**
 * Require manager or above
 * Usage: router.post('/create', requireManager, handler)
 */
export const requireManager = requireRole('admin', 'manager');
