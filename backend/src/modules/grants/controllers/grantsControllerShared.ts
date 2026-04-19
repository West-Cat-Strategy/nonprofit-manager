import { type NextFunction, type Response } from 'express';
import { grantService } from '../services/grants.service';
import { type AuthRequest } from '@middleware/auth';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { notFoundMessage } from '@utils/responseHelpers';

export type GrantsControllerHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

export type GrantsControllerContext = {
  service: typeof grantService;
  ensurePermission(req: AuthRequest, res: Response, permission: Permission): boolean;
  requireOrganization(req: AuthRequest, res: Response): string | null;
  requireUser(req: AuthRequest, res: Response): string | null;
  getQuery<T>(req: AuthRequest): T;
  getParams<T extends Record<string, string>>(req: AuthRequest): T;
  sendNotFoundIfMissing<T>(res: Response, value: T | null, message: string): value is T;
};

const getOrganizationId = (req: AuthRequest): string | null =>
  req.organizationId || req.accountId || req.tenantId || null;

const getUserId = (req: AuthRequest): string | null => req.user?.id ?? null;

const ensurePermission = (req: AuthRequest, res: Response, permission: Permission): boolean => {
  const guard = requirePermissionSafe(req, permission);
  if (!guard.ok) {
    if (guard.error.code === 'unauthorized') {
      sendUnauthorized(res, guard.error.message);
    } else {
      sendForbidden(res, guard.error.message || 'Forbidden');
    }
    return false;
  }

  return true;
};

const requireOrganization = (req: AuthRequest, res: Response): string | null => {
  const organizationId = getOrganizationId(req);
  if (!organizationId) {
    sendUnauthorized(res, 'Organization context required');
    return null;
  }

  return organizationId;
};

const requireUser = (req: AuthRequest, res: Response): string | null => {
  const userId = getUserId(req);
  if (!userId) {
    sendUnauthorized(res, 'Unauthorized');
    return null;
  }

  return userId;
};

const getQuery = <T>(req: AuthRequest): T => (req.validatedQuery ?? req.query) as T;

const getParams = <T extends Record<string, string>>(req: AuthRequest): T =>
  (req.validatedParams ?? req.params) as T;

const sendNotFoundIfMissing = <T>(res: Response, value: T | null, message: string): value is T => {
  if (!value) {
    notFoundMessage(res, message);
    return false;
  }

  return true;
};

export const createGrantsControllerContext = (): GrantsControllerContext => ({
  service: grantService,
  ensurePermission,
  requireOrganization,
  requireUser,
  getQuery,
  getParams,
  sendNotFoundIfMissing,
});
