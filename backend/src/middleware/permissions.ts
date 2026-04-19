/**
 * Permission Middleware
 * Express middleware for enforcing permissions on routes
 */

import { Response, NextFunction } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { type Permission } from '@utils/permissions';
import {
  guardWithAnyPermission,
  guardWithPermission,
  guardWithRole,
} from '@services/authGuardService';

/**
 * Require a specific permission
 * Usage: router.post('/create', requirePermission(Permission.VOLUNTEER_CREATE), handler)
 */
export function requirePermission(permission: Permission | string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!guardWithPermission(req, res, permission)) {
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
    if (!guardWithAnyPermission(req, res, ...permissions)) {
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
    if (!guardWithRole(req, res, ...roles)) {
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
