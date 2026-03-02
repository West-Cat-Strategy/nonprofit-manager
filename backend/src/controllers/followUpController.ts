import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { followUpService } from '@services/followUpService';
import { sendSuccess } from '@modules/shared/http/envelope';
import { notFoundMessage, serverError, unauthorized } from '@utils/responseHelpers';
import {
  requirePermissionOrError,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import type { FollowUpEntityType, FollowUpFilters } from '@app-types/followUp';

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

export const followUpController = {
  async getFollowUps(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const query = ((req as any).validatedQuery ?? req.query) as Record<string, unknown>;
      const filters: FollowUpFilters = {
        entity_type: query.entity_type as FollowUpEntityType | undefined,
        entity_id: query.entity_id as string | undefined,
        status: query.status as FollowUpFilters['status'],
        assigned_to: query.assigned_to as string | undefined,
        date_from: query.date_from as string | undefined,
        date_to: query.date_to as string | undefined,
        overdue_only: query.overdue_only as boolean | undefined,
        page: query.page as number | undefined,
        limit: query.limit as number | undefined,
      };

      const result = await followUpService.getFollowUps(organizationId, filters);
      sendSuccess(res, result);
    } catch {
      serverError(res, 'Failed to fetch follow-ups');
    }
  },

  async getFollowUpSummary(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const query = ((req as any).validatedQuery ?? req.query) as Record<string, unknown>;
      const summary = await followUpService.getFollowUpSummary(organizationId, {
        entity_type: query.entity_type as FollowUpEntityType | undefined,
        entity_id: query.entity_id as string | undefined,
        status: query.status as FollowUpFilters['status'],
        assigned_to: query.assigned_to as string | undefined,
        date_from: query.date_from as string | undefined,
        date_to: query.date_to as string | undefined,
        overdue_only: query.overdue_only as boolean | undefined,
      });

      sendSuccess(res, summary);
    } catch {
      serverError(res, 'Failed to fetch follow-up summary');
    }
  },

  async getUpcomingFollowUps(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const query = ((req as any).validatedQuery ?? req.query) as Record<string, unknown>;
      const limit = Number(query.limit || 10);
      const rows = await followUpService.getUpcomingFollowUps(organizationId, limit);
      sendSuccess(res, rows);
    } catch {
      serverError(res, 'Failed to fetch upcoming follow-ups');
    }
  },

  async getFollowUpById(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const followUp = await followUpService.getFollowUpById(organizationId, params.id);

      if (!followUp) {
        notFoundMessage(res, 'Follow-up not found');
        return;
      }

      sendSuccess(res, followUp);
    } catch {
      serverError(res, 'Failed to fetch follow-up');
    }
  },

  async createFollowUp(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_CREATE)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        unauthorized(res, 'Organization context and user authentication required');
        return;
      }

      const created = await followUpService.createFollowUp(organizationId, userId, req.body);
      sendSuccess(res, created, 201);
    } catch {
      serverError(res, 'Failed to create follow-up');
    }
  },

  async updateFollowUp(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_EDIT)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        unauthorized(res, 'Organization context and user authentication required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const updated = await followUpService.updateFollowUp(organizationId, params.id, userId, req.body);
      if (!updated) {
        notFoundMessage(res, 'Follow-up not found');
        return;
      }

      sendSuccess(res, updated);
    } catch {
      serverError(res, 'Failed to update follow-up');
    }
  },

  async completeFollowUp(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_EDIT)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        unauthorized(res, 'Organization context and user authentication required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const completed = await followUpService.completeFollowUp(organizationId, params.id, userId, req.body || {});

      if (!completed) {
        notFoundMessage(res, 'Follow-up not found');
        return;
      }

      sendSuccess(res, completed);
    } catch {
      serverError(res, 'Failed to complete follow-up');
    }
  },

  async cancelFollowUp(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_EDIT)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        unauthorized(res, 'Organization context and user authentication required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const cancelled = await followUpService.cancelFollowUp(organizationId, params.id, userId);

      if (!cancelled) {
        notFoundMessage(res, 'Follow-up not found');
        return;
      }

      sendSuccess(res, cancelled);
    } catch {
      serverError(res, 'Failed to cancel follow-up');
    }
  },

  async rescheduleFollowUp(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_EDIT)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        unauthorized(res, 'Organization context and user authentication required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const body = req.body as { scheduled_date: string; scheduled_time?: string | null };
      const updated = await followUpService.rescheduleFollowUp(
        organizationId,
        params.id,
        userId,
        body.scheduled_date,
        body.scheduled_time
      );

      if (!updated) {
        notFoundMessage(res, 'Follow-up not found');
        return;
      }

      sendSuccess(res, updated);
    } catch {
      serverError(res, 'Failed to reschedule follow-up');
    }
  },

  async deleteFollowUp(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_DELETE)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const deleted = await followUpService.deleteFollowUp(organizationId, params.id);

      if (!deleted) {
        notFoundMessage(res, 'Follow-up not found');
        return;
      }

      res.status(204).send();
    } catch {
      serverError(res, 'Failed to delete follow-up');
    }
  },

  async getCaseFollowUps(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const rows = await followUpService.getEntityFollowUps(organizationId, 'case', params.id);
      sendSuccess(res, rows);
    } catch {
      serverError(res, 'Failed to fetch case follow-ups');
    }
  },

  async getTaskFollowUps(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.FOLLOWUP_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const rows = await followUpService.getEntityFollowUps(organizationId, 'task', params.id);
      sendSuccess(res, rows);
    } catch {
      serverError(res, 'Failed to fetch task follow-ups');
    }
  },
};

export default followUpController;
