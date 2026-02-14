/**
 * Auth Guards Service
 * Server-side helpers for authorization checks
 * Inspired by wc-manage guards pattern
 */

import type { AuthRequest } from '@middleware/auth';
import type { Response } from 'express';
import { unauthorized, forbidden } from '@utils/responseHelpers';
import { hasPermission, type Permission } from '@utils/permissions';

interface GuardResult<T = unknown> {
  success: boolean;
  user?: any;
  workspaceId?: string;
  organizationId?: string;
  error?: string;
  data?: T;
}

/**
 * Require authenticated user or return error
 * Used in controllers/services to get current user safely
 */
export function requireUserOrError(req: AuthRequest): GuardResult {
  if (!req.user) {
    return {
      success: false,
      error: 'Unauthorized: No authenticated user',
    };
  }

  return {
    success: true,
    user: req.user,
  };
}

/**
 * Require user with specific role
 */
export function requireRoleOrError(
  req: AuthRequest,
  ...allowedRoles: string[]
): GuardResult {
  const userGuard = requireUserOrError(req);
  if (!userGuard.success) {
    return userGuard;
  }

  if (!allowedRoles.includes(userGuard.user.role)) {
    return {
      success: false,
      error: `Forbidden: User role '${userGuard.user.role}' not permitted`,
    };
  }

  return {
    success: true,
    user: userGuard.user,
  };
}

/**
 * Require user with specific permission
 */
export function requirePermissionOrError(
  req: AuthRequest,
  permission: Permission | string
): GuardResult {
  const userGuard = requireUserOrError(req);
  if (!userGuard.success) {
    return userGuard;
  }

  if (!hasPermission(userGuard.user.role, permission)) {
    return {
      success: false,
      error: `Forbidden: Permission '${permission}' not granted`,
    };
  }

  return {
    success: true,
    user: userGuard.user,
  };
}

/**
 * Require user with any of the specified permissions
 */
export function requireAnyPermissionOrError(
  req: AuthRequest,
  permissions: (Permission | string)[]
): GuardResult {
  const userGuard = requireUserOrError(req);
  if (!userGuard.success) {
    return userGuard;
  }

  const hasAny = permissions.some((perm) =>
    hasPermission(userGuard.user.role, perm)
  );

  if (!hasAny) {
    return {
      success: false,
      error: 'Forbidden: None of the required permissions are granted',
    };
  }

  return {
    success: true,
    user: userGuard.user,
  };
}

/**
 * Require organization context
 */
export function requireOrganizationOrError(req: AuthRequest): GuardResult {
  const userGuard = requireUserOrError(req);
  if (!userGuard.success) {
    return userGuard;
  }

  const organizationId = req.organizationId || req.accountId || req.tenantId;

  if (!organizationId) {
    return {
      success: false,
      error: 'Bad Request: No organization context',
    };
  }

  return {
    success: true,
    user: userGuard.user,
    organizationId,
  };
}

/**
 * Send unauthorized response
 */
export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
  unauthorized(res, message);
}

/**
 * Send forbidden response
 */
export function sendForbidden(res: Response, message: string = 'Forbidden'): void {
  forbidden(res, message);
}

/**
 * Check if request can access a resource
 * Useful for resource-level authorization
 */
export function canAccessResource(
  req: AuthRequest,
  resourceOwnerId: string | null | undefined
): boolean {
  if (!req.user) return false;

  // Admin can access everything
  if (req.user.role === 'admin') return true;

  // User can access their own resources
  if (req.user.id === resourceOwnerId) return true;

  return false;
}

/**
 * Middleware-style guard - next if authorized, otherwise send response
 */
export function guardWithRole(req: AuthRequest, res: Response, ...allowedRoles: string[]): boolean {
  const result = requireRoleOrError(req, ...allowedRoles);
  if (!result.success) {
    sendForbidden(res, result.error);
    return false;
  }
  return true;
}

/**
 * Middleware-style permission guard
 */
export function guardWithPermission(
  req: AuthRequest,
  res: Response,
  permission: Permission | string
): boolean {
  const result = requirePermissionOrError(req, permission);
  if (!result.success) {
    sendForbidden(res, result.error);
    return false;
  }
  return true;
}

/**
 * Extract user safely from request
 */
export function getUser(req: AuthRequest) {
  return req.user;
}

/**
 * Extract organization safely from request
 */
export function getOrganization(req: AuthRequest) {
  return req.organizationId || req.accountId || req.tenantId;
}

/**
 * Extract data scope if available
 */
export function getDataScope(req: AuthRequest) {
  return req.dataScope;
}
