/**
 * Report Sharing Controller
 * API endpoints for report sharing functionality
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth';
import { services } from '../container/services';
import { badRequest, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { publicReportSnapshotService } from '@services/publicReportSnapshotService';
import { sendSuccess } from '@modules/shared/http/envelope';

const savedReportService = services.savedReport;

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

/**
 * GET /api/v2/saved-reports/share/principals
 * Lookup shareable users and roles for share dialog picker
 */
export const getSharePrincipals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_VIEW)) return;

    const query = ((req as any).validatedQuery ?? req.query) as {
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

/**
 * POST /api/reports/:id/share
 * Share report with users or roles
 */
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

/**
 * DELETE /api/reports/:id/share
 * Remove share access
 */
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

/**
 * POST /api/reports/:id/public-link
 * Generate public shareable link
 */
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

/**
 * DELETE /api/reports/:id/public-link
 * Revoke public link
 */
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

/**
 * GET /api/public/reports/:token
 * Get snapshot metadata by public token (no auth required)
 */
export const getReportByPublicToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = String(req.params.token || '');
    if (!token) {
      badRequest(res, 'Public report token is required');
      return;
    }

    const report = await publicReportSnapshotService.getPublicSnapshotMeta(token);

    if (!report) {
      notFoundMessage(res, 'Report not found or link has expired');
      return;
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/reports/:token/download?format=csv|xlsx
 * Download public report snapshot artifact
 */
export const downloadPublicReportByToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = String(req.params.token || '');
    const query = ((req as any).validatedQuery ?? req.query) as {
      format?: 'csv' | 'xlsx';
    };

    if (!token) {
      badRequest(res, 'Public report token is required');
      return;
    }

    if (query.format !== 'csv' && query.format !== 'xlsx') {
      badRequest(res, 'Format must be csv or xlsx');
      return;
    }

    try {
      const download = await publicReportSnapshotService.getPublicSnapshotDownload(
        token,
        query.format
      );
      res.setHeader('Content-Type', download.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${download.fileName}"`);
      res.send(download.buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download report';
      if (message.toLowerCase().includes('not found')) {
        notFoundMessage(res, message);
        return;
      }
      badRequest(res, message);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  getSharePrincipals,
  shareReport,
  removeShare,
  generatePublicLink,
  revokePublicLink,
  getReportByPublicToken,
  downloadPublicReportByToken,
};
