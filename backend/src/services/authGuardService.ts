/**
 * Auth Guards Service
 * Server-side helpers for authorization checks
 * Inspired by wc-manage guards pattern
 */

import pool from '@config/database';
import type { AuthRequest } from '@middleware/auth';
import type { Response } from 'express';
import { unauthorized, forbidden, badRequest, notFoundMessage } from '@utils/responseHelpers';
import { type Permission } from '@utils/permissions';
import {
  hasAnyStaticPermissionAccess,
  hasRoleAccess,
  hasStaticPermissionAccess,
} from '@services/authorization';

export type GuardFailureCode = 'unauthorized' | 'forbidden' | 'bad_request' | 'not_found';

export interface GuardFailure {
  code: GuardFailureCode;
  message: string;
  statusCode: 400 | 401 | 403 | 404;
}

export type SafeGuardResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: GuardFailure;
    };

interface GuardResult<T = unknown> {
  success: boolean;
  user?: any;
  workspaceId?: string;
  organizationId?: string;
  error?: string;
  code?: GuardFailureCode;
  statusCode?: number;
  data?: T;
}

const toLegacyError = <T>(result: SafeGuardResult<T>): GuardResult<T> => {
  if (result.ok) {
    return {
      success: true,
      ...(result.data as object),
      data: result.data,
    } as GuardResult<T>;
  }

  return {
    success: false,
    error: result.error.message,
    code: result.error.code,
    statusCode: result.error.statusCode,
  };
};

const getOrganizationId = (req: AuthRequest): string | undefined => {
  return req.organizationId || req.accountId || req.tenantId;
};

const requireUserError = (): GuardFailure => ({
  code: 'unauthorized',
  message: 'Unauthorized: No authenticated user',
  statusCode: 401,
});

/**
 * Strict variants: throw typed errors for call sites that need hard guarantees.
 */
export function requireUserStrict(req: AuthRequest): { user: any } {
  const result = requireUserSafe(req);
  if (!result.ok) {
    const guardError = new Error(result.error.message) as Error & {
      code: GuardFailureCode;
      statusCode: number;
    };
    guardError.code = result.error.code;
    guardError.statusCode = result.error.statusCode;
    throw guardError;
  }
  return result.data;
}

export function requireRoleStrict(req: AuthRequest, ...allowedRoles: string[]): { user: any } {
  const result = requireRoleSafe(req, ...allowedRoles);
  if (!result.ok) {
    const guardError = new Error(result.error.message) as Error & {
      code: GuardFailureCode;
      statusCode: number;
    };
    guardError.code = result.error.code;
    guardError.statusCode = result.error.statusCode;
    throw guardError;
  }
  return result.data;
}

export function requirePermissionStrict(
  req: AuthRequest,
  permission: Permission | string
): { user: any } {
  const result = requirePermissionSafe(req, permission);
  if (!result.ok) {
    const guardError = new Error(result.error.message) as Error & {
      code: GuardFailureCode;
      statusCode: number;
    };
    guardError.code = result.error.code;
    guardError.statusCode = result.error.statusCode;
    throw guardError;
  }
  return result.data;
}

/**
 * Safe variants: deterministic result contract for route/controller callers.
 */
export function requireUserSafe(req: AuthRequest): SafeGuardResult<{ user: any }> {
  if (!req.user) {
    return { ok: false, error: requireUserError() };
  }

  return {
    ok: true,
    data: { user: req.user },
  };
}

export function requireRoleSafe(
  req: AuthRequest,
  ...allowedRoles: string[]
): SafeGuardResult<{ user: any }> {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return userResult;
  }

  if (!hasRoleAccess(userResult.data.user.role, allowedRoles, req.authorizationContext?.roles)) {
    return {
      ok: false,
      error: {
        code: 'forbidden',
        message: `Forbidden: User role '${userResult.data.user.role}' not permitted`,
        statusCode: 403,
      },
    };
  }

  return {
    ok: true,
    data: { user: userResult.data.user },
  };
}

export function requirePermissionSafe(
  req: AuthRequest,
  permission: Permission | string
): SafeGuardResult<{ user: any }> {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return userResult;
  }

  if (
    !hasStaticPermissionAccess(
      userResult.data.user.role,
      permission,
      req.authorizationContext?.roles
    )
  ) {
    return {
      ok: false,
      error: {
        code: 'forbidden',
        message: `Forbidden: Permission '${permission}' not granted`,
        statusCode: 403,
      },
    };
  }

  return {
    ok: true,
    data: { user: userResult.data.user },
  };
}

export function requireAnyPermissionSafe(
  req: AuthRequest,
  permissions: (Permission | string)[]
): SafeGuardResult<{ user: any }> {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return userResult;
  }

  const hasAny = hasAnyStaticPermissionAccess(
    userResult.data.user.role,
    permissions,
    req.authorizationContext?.roles
  );

  if (!hasAny) {
    return {
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Forbidden: None of the required permissions are granted',
        statusCode: 403,
      },
    };
  }

  return {
    ok: true,
    data: { user: userResult.data.user },
  };
}

export function requireOrganizationSafe(
  req: AuthRequest
): SafeGuardResult<{ user: any; organizationId: string }> {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return userResult;
  }

  const organizationId = getOrganizationId(req);
  if (!organizationId) {
    return {
      ok: false,
      error: {
        code: 'bad_request',
        message: 'Bad Request: No organization context',
        statusCode: 400,
      },
    };
  }

  return {
    ok: true,
    data: {
      user: userResult.data.user,
      organizationId,
    },
  };
}

export async function requireActiveOrganizationSafe(
  req: AuthRequest
): Promise<SafeGuardResult<{ user: any; organizationId: string }>> {
  const orgResult = requireOrganizationSafe(req);
  if (!orgResult.ok) {
    return orgResult;
  }

  const result = await pool.query<{ is_active: boolean }>(
    `SELECT is_active
     FROM accounts
     WHERE id = $1
     LIMIT 1`,
    [orgResult.data.organizationId]
  );

  if (result.rows.length === 0) {
    return {
      ok: false,
      error: {
        code: 'not_found',
        message: 'Organization context not found',
        statusCode: 404,
      },
    };
  }

  if (!result.rows[0].is_active) {
    return {
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Organization is inactive',
        statusCode: 403,
      },
    };
  }

  return orgResult;
}

/**
 * Backward compatible APIs for existing call sites.
 */
export function requireUserOrError(req: AuthRequest): GuardResult {
  return toLegacyError(requireUserSafe(req));
}

export function requireRoleOrError(req: AuthRequest, ...allowedRoles: string[]): GuardResult {
  return toLegacyError(requireRoleSafe(req, ...allowedRoles));
}

export function requirePermissionOrError(
  req: AuthRequest,
  permission: Permission | string
): GuardResult {
  return toLegacyError(requirePermissionSafe(req, permission));
}

export function requireAnyPermissionOrError(
  req: AuthRequest,
  permissions: (Permission | string)[]
): GuardResult {
  return toLegacyError(requireAnyPermissionSafe(req, permissions));
}

export function requireOrganizationOrError(req: AuthRequest): GuardResult {
  return toLegacyError(requireOrganizationSafe(req));
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

const sendGuardFailure = (res: Response, result: GuardResult): void => {
  if (result.code === 'unauthorized') {
    sendUnauthorized(res, result.error || 'Unauthorized');
    return;
  }

  if (result.code === 'bad_request') {
    badRequest(res, result.error || 'Bad Request');
    return;
  }

  if (result.code === 'not_found') {
    notFoundMessage(res, result.error || 'Not Found');
    return;
  }

  sendForbidden(res, result.error || 'Forbidden');
};

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
    sendGuardFailure(res, result);
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
    sendGuardFailure(res, result);
    return false;
  }
  return true;
}

/**
 * Extract user safely from request
 */
export function getUser(req: AuthRequest): any {
  return req.user;
}

/**
 * Extract organization safely from request
 */
export function getOrganization(req: AuthRequest) {
  return getOrganizationId(req);
}

/**
 * Extract data scope if available
 */
export function getDataScope(req: AuthRequest) {
  return req.dataScope;
}
