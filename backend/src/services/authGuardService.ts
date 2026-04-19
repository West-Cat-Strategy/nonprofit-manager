/**
 * Auth Guards Service
 * Server-side helpers for authorization checks
 */

import pool from '@config/database';
import type { AuthRequest } from '@middleware/auth';
import type { Response } from 'express';
import { unauthorized, forbidden } from '@utils/responseHelpers';
import { type Permission, hasAnyPermissionForRoles } from '@utils/permissions';
import {
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

type AuthenticatedUser = NonNullable<AuthRequest['user']>;

const getOrganizationId = (req: AuthRequest): string | undefined => {
  return req.organizationId || req.accountId || req.tenantId;
};

const requireUserError = (): GuardFailure => ({
  code: 'unauthorized',
  message: 'Unauthorized: No authenticated user',
  statusCode: 401,
});

const requireRoleError = (allowedRoles: string[]): GuardFailure => ({
  code: 'forbidden',
  message: `Forbidden: Requires role [${allowedRoles.join(', ')}]`,
  statusCode: 403,
});

const requirePermissionError = (permission: Permission | string): GuardFailure => ({
  code: 'forbidden',
  message: `Forbidden: Permission '${permission}' not granted`,
  statusCode: 403,
});

const requireAnyPermissionError = (permissions: (Permission | string)[]): GuardFailure => ({
  code: 'forbidden',
  message: `Forbidden: Requires one of [${permissions.join(', ')}]`,
  statusCode: 403,
});

const getCandidateRoles = (
  user: AuthenticatedUser,
  req: AuthRequest
): string[] => req.authorizationContext?.roles || [user.role];

/**
 * Safe variants: deterministic result contract for route/controller callers.
 */
export function requireUserSafe(req: AuthRequest): SafeGuardResult<{ user: AuthenticatedUser }> {
  if (!req.user) {
    return { ok: false, error: requireUserError() };
  }

  return {
    ok: true,
    data: { user: req.user },
  };
}

export function requirePermissionSafe(
  req: AuthRequest,
  permission: Permission | string
): SafeGuardResult<{ user: AuthenticatedUser }> {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return userResult;
  }

  if (!hasStaticPermissionAccess(userResult.data.user.role, permission, req.authorizationContext?.roles)) {
    return { ok: false, error: requirePermissionError(permission) };
  }

  return {
    ok: true,
    data: { user: userResult.data.user },
  };
}

export function requireAnyPermissionSafe(
  req: AuthRequest,
  permissions: (Permission | string)[]
): SafeGuardResult<{ user: AuthenticatedUser }> {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return userResult;
  }

  if (!hasAnyPermissionForRoles(getCandidateRoles(userResult.data.user, req), permissions)) {
    return { ok: false, error: requireAnyPermissionError(permissions) };
  }

  return {
    ok: true,
    data: { user: userResult.data.user },
  };
}

export function requireRoleSafe(
  req: AuthRequest,
  ...allowedRoles: string[]
): SafeGuardResult<{ user: AuthenticatedUser }> {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return userResult;
  }

  if (!hasRoleAccess(userResult.data.user.role, allowedRoles, req.authorizationContext?.roles)) {
    return { ok: false, error: requireRoleError(allowedRoles) };
  }

  return {
    ok: true,
    data: { user: userResult.data.user },
  };
}

export async function requireActiveOrganizationSafe(
  req: AuthRequest
): Promise<SafeGuardResult<{ user: AuthenticatedUser; organizationId: string }>> {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return { ok: false, error: requireUserError() };
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

  if (
    req.organizationContextValidated?.organizationId === organizationId &&
    req.organizationContextValidated.isActive
  ) {
    return {
      ok: true,
      data: { ...userResult.data, organizationId },
    };
  }

  const result = await pool.query<{ is_active: boolean }>(
    `SELECT is_active
     FROM accounts
     WHERE id = $1
     LIMIT 1`,
    [organizationId]
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

  return {
    ok: true,
    data: { ...userResult.data, organizationId },
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
 * Middleware-style role guard - next if authorized, otherwise send response
 */
export function guardWithRole(req: AuthRequest, res: Response, ...allowedRoles: string[]): boolean {
  const guardResult = requireRoleSafe(req, ...allowedRoles);
  if (guardResult.ok) {
    return true;
  }

  if (guardResult.error.code === 'unauthorized') {
    sendUnauthorized(res, guardResult.error.message);
    return false;
  }

  sendForbidden(res, guardResult.error.message);
  return false;
}

export function guardWithPermission(
  req: AuthRequest,
  res: Response,
  permission: Permission | string
): boolean {
  const guardResult = requirePermissionSafe(req, permission);
  if (guardResult.ok) {
    return true;
  }

  if (guardResult.error.code === 'unauthorized') {
    sendUnauthorized(res, guardResult.error.message);
    return false;
  }

  sendForbidden(res, guardResult.error.message);
  return false;
}

export function guardWithAnyPermission(
  req: AuthRequest,
  res: Response,
  ...permissions: (Permission | string)[]
): boolean {
  const guardResult = requireAnyPermissionSafe(req, permissions);
  if (guardResult.ok) {
    return true;
  }

  if (guardResult.error.code === 'unauthorized') {
    sendUnauthorized(res, guardResult.error.message);
    return false;
  }

  sendForbidden(res, guardResult.error.message);
  return false;
}

/**
 * Extract user safely from request
 */
export function getUser(req: AuthRequest): AuthenticatedUser | undefined {
  return req.user;
}
