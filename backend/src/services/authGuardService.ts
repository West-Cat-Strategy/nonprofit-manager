/**
 * Auth Guards Service
 * Server-side helpers for authorization checks
 */

import pool from '@config/database';
import type { AuthRequest } from '@middleware/auth';
import type { Response } from 'express';
import { unauthorized, forbidden } from '@utils/responseHelpers';
import { type Permission } from '@utils/permissions';
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

const getOrganizationId = (req: AuthRequest): string | undefined => {
  return req.organizationId || req.accountId || req.tenantId;
};

const requireUserError = (): GuardFailure => ({
  code: 'unauthorized',
  message: 'Unauthorized: No authenticated user',
  statusCode: 401,
});

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

export async function requireActiveOrganizationSafe(
  req: AuthRequest
): Promise<SafeGuardResult<{ user: any; organizationId: string }>> {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return {
      ok: false,
      error: {
        code: 'unauthorized',
        message: 'Unauthorized: No authenticated user',
        statusCode: 401,
      },
    };
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
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    sendUnauthorized(res);
    return false;
  }

  if (!hasRoleAccess(userResult.data.user.role, allowedRoles, req.authorizationContext?.roles)) {
    sendForbidden(res);
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
