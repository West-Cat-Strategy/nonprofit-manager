import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { scheduledReportService } from '@services/scheduledReportService';
import { sendSuccess } from '@modules/shared/http/envelope';
import { badRequest, notFoundMessage, serverError, unauthorized } from '@utils/responseHelpers';
import {
  requirePermissionOrError,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';

const getOrgId = (req: AuthRequest): string | null => req.organizationId || req.accountId || req.tenantId || null;

const ensurePermission = (req: AuthRequest, res: Response, permission: Permission): boolean => {
  const guard = requirePermissionOrError(req, permission);
  if (!guard.success) {
    if (guard.error?.toLowerCase().startsWith('unauthorized')) {
      sendUnauthorized(res, guard.error);
    } else {
      sendForbidden(res, guard.error || 'Forbidden');
    }
    return false;
  }
  return true;
};

const handleServiceError = (res: Response, error: unknown, fallbackMessage: string): void => {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const normalized = message.toLowerCase();
  const likelyClientError =
    normalized.includes('invalid') ||
    normalized.includes('not found') ||
    normalized.includes('inaccessible') ||
    normalized.includes('must be') ||
    normalized.includes('payload');

  if (likelyClientError) {
    badRequest(res, message);
    return;
  }

  serverError(res, message || fallbackMessage);
};

export const scheduledReportController = {
  async listScheduledReports(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.SCHEDULED_REPORT_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const rows = await scheduledReportService.listScheduledReports(organizationId);
      sendSuccess(res, rows);
    } catch {
      serverError(res, 'Failed to fetch scheduled reports');
    }
  },

  async getScheduledReport(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.SCHEDULED_REPORT_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const report = await scheduledReportService.getScheduledReportById(organizationId, params.id);
      if (!report) {
        notFoundMessage(res, 'Scheduled report not found');
        return;
      }

      sendSuccess(res, report);
    } catch {
      serverError(res, 'Failed to fetch scheduled report');
    }
  },

  async createScheduledReport(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.SCHEDULED_REPORT_MANAGE)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        unauthorized(res, 'Organization context and user required');
        return;
      }

      const created = await scheduledReportService.createScheduledReport(organizationId, userId, req.body);
      sendSuccess(res, created, 201);
    } catch (error) {
      handleServiceError(res, error, 'Failed to create scheduled report');
    }
  },

  async updateScheduledReport(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.SCHEDULED_REPORT_MANAGE)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        unauthorized(res, 'Organization context and user required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const updated = await scheduledReportService.updateScheduledReport(
        organizationId,
        params.id,
        userId,
        req.body
      );

      if (!updated) {
        notFoundMessage(res, 'Scheduled report not found');
        return;
      }

      sendSuccess(res, updated);
    } catch (error) {
      handleServiceError(res, error, 'Failed to update scheduled report');
    }
  },

  async toggleScheduledReport(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.SCHEDULED_REPORT_MANAGE)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        unauthorized(res, 'Organization context and user required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const toggled = await scheduledReportService.toggleScheduledReport(
        organizationId,
        params.id,
        userId,
        req.body || {}
      );

      if (!toggled) {
        notFoundMessage(res, 'Scheduled report not found');
        return;
      }

      sendSuccess(res, toggled);
    } catch (error) {
      handleServiceError(res, error, 'Failed to toggle scheduled report');
    }
  },

  async runScheduledReportNow(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.SCHEDULED_REPORT_MANAGE)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const run = await scheduledReportService.runScheduledReportNow(organizationId, params.id);
      if (!run) {
        notFoundMessage(res, 'Scheduled report not found');
        return;
      }

      sendSuccess(res, run);
    } catch (error) {
      handleServiceError(res, error, 'Failed to execute scheduled report');
    }
  },

  async deleteScheduledReport(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.SCHEDULED_REPORT_MANAGE)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const deleted = await scheduledReportService.deleteScheduledReport(organizationId, params.id);

      if (!deleted) {
        notFoundMessage(res, 'Scheduled report not found');
        return;
      }

      res.status(204).send();
    } catch {
      serverError(res, 'Failed to delete scheduled report');
    }
  },

  async listScheduledReportRuns(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.SCHEDULED_REPORT_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const query = ((req as any).validatedQuery ?? req.query) as { limit?: number };

      const rows = await scheduledReportService.listScheduledReportRuns(
        organizationId,
        params.id,
        query.limit || 20
      );
      sendSuccess(res, rows);
    } catch {
      serverError(res, 'Failed to fetch scheduled report runs');
    }
  },
};

export default scheduledReportController;
