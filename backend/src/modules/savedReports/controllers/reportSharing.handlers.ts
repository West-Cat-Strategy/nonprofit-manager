import type { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { badRequest, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { publicReportSnapshotService } from '@services/publicReportSnapshotService';
import { sendSuccess } from '@modules/shared/http/envelope';
import { savedReportService } from '../services/savedReportService';

const getOrgId = (req: AuthRequest): string | null =>
  req.organizationId || req.accountId || req.tenantId || null;

const ensurePermission = (
  req: AuthRequest,
  res: Response,
  permission: Permission
): boolean => {
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

const handleOwnershipOrLookupError = (res: Response, error: unknown): void => {
  const message = error instanceof Error ? error.message : 'Request failed';
  const normalized = message.toLowerCase();
  if (normalized.includes('not found')) {
    notFoundMessage(res, message);
    return;
  }
  if (normalized.includes('only report owner') || normalized.includes('access denied')) {
    sendForbidden(res, message);
    return;
  }
  badRequest(res, message);
};

export const getSharePrincipals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_VIEW)) return;

    const query = (req.validatedQuery ?? req.query) as {
      search?: string;
      limit?: number;
    };

    const principals = await savedReportService.getSharePrincipals(
      query.search,
      query.limit
    );
    sendSuccess(res, principals);
  } catch (error) {
    next(error);
  }
};

export const shareReport = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_VIEW)) return;

    const actorUserId = req.user?.id;
    const actorRole = req.user?.role || 'member';
    if (!actorUserId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;
    const { user_ids, role_names, share_settings } = req.body;

    const report = await savedReportService.shareReport(
      id,
      actorUserId,
      actorRole,
      user_ids,
      role_names,
      share_settings
    );

    res.json(report);
  } catch (error) {
    handleOwnershipOrLookupError(res, error);
  }
};

export const removeShare = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_VIEW)) return;

    const actorUserId = req.user?.id;
    const actorRole = req.user?.role || 'member';
    if (!actorUserId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;
    const { user_ids, role_names } = req.body;

    const report = await savedReportService.removeShare(
      id,
      actorUserId,
      actorRole,
      user_ids,
      role_names
    );

    res.json(report);
  } catch (error) {
    handleOwnershipOrLookupError(res, error);
  }
};

export const generatePublicLink = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_VIEW)) return;

    const actorUserId = req.user?.id;
    const actorRole = req.user?.role || 'member';
    if (!actorUserId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;
    const { expires_at } = req.body as { expires_at?: string };
    const organizationId = getOrgId(req) || undefined;

    const link = await publicReportSnapshotService.createSnapshotForPublicLink({
      savedReportId: id,
      actorUserId,
      actorRole,
      organizationId,
      expiresAt: expires_at,
    });

    res.json(link);
  } catch (error) {
    handleOwnershipOrLookupError(res, error);
  }
};

export const revokePublicLink = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_VIEW)) return;

    const actorUserId = req.user?.id;
    const actorRole = req.user?.role || 'member';
    if (!actorUserId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;
    await publicReportSnapshotService.revokePublicLink({
      savedReportId: id,
      actorUserId,
      actorRole,
    });

    res.json({ message: 'Public link revoked successfully' });
  } catch (error) {
    handleOwnershipOrLookupError(res, error);
  }
};
