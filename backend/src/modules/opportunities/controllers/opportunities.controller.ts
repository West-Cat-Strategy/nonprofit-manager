import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess } from '@modules/shared/http/envelope';
import { badRequest, notFoundMessage, serverError, unauthorized } from '@utils/responseHelpers';
import {
  requirePermissionOrError,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import type { OpportunityFilters } from '@app-types/opportunity';
import { opportunityService } from '../services/opportunity.service';

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
    normalized.includes('must include') ||
    normalized.includes('exactly once') ||
    normalized.includes('organization') ||
    normalized.includes('stage');

  if (likelyClientError) {
    badRequest(res, message);
    return;
  }

  serverError(res, message || fallbackMessage);
};

export const opportunitiesController = {
  async listStages(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_VIEW)) return;

    try {
      const orgId = getOrgId(req);
      if (!orgId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      await opportunityService.ensureDefaultStages(orgId, req.user?.id || null);
      const stages = await opportunityService.listStages(orgId);
      sendSuccess(res, stages);
    } catch {
      serverError(res, 'Failed to fetch opportunity stages');
    }
  },

  async createStage(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_STAGE_MANAGE)) return;

    try {
      const orgId = getOrgId(req);
      const userId = req.user?.id;
      if (!orgId || !userId) {
        unauthorized(res, 'Organization context and user required');
        return;
      }

      const created = await opportunityService.createStage(orgId, userId, req.body);
      sendSuccess(res, created, 201);
    } catch (error) {
      handleServiceError(res, error, 'Failed to create opportunity stage');
    }
  },

  async updateStage(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_STAGE_MANAGE)) return;

    try {
      const orgId = getOrgId(req);
      const userId = req.user?.id;
      if (!orgId || !userId) {
        unauthorized(res, 'Organization context and user required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { stageId: string };
      const updated = await opportunityService.updateStage(orgId, params.stageId, userId, req.body);

      if (!updated) {
        notFoundMessage(res, 'Opportunity stage not found');
        return;
      }

      sendSuccess(res, updated);
    } catch (error) {
      handleServiceError(res, error, 'Failed to update opportunity stage');
    }
  },

  async reorderStages(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_STAGE_MANAGE)) return;

    try {
      const orgId = getOrgId(req);
      const userId = req.user?.id;
      if (!orgId || !userId) {
        unauthorized(res, 'Organization context and user required');
        return;
      }

      const rows = await opportunityService.reorderStages(orgId, userId, req.body);
      sendSuccess(res, rows);
    } catch (error) {
      handleServiceError(res, error, 'Failed to reorder stages');
    }
  },

  async listOpportunities(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_VIEW)) return;

    try {
      const orgId = getOrgId(req);
      if (!orgId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      await opportunityService.ensureDefaultStages(orgId, req.user?.id || null);
      const query = ((req as any).validatedQuery ?? req.query) as Record<string, unknown>;
      const result = await opportunityService.listOpportunities(orgId, {
        stage_id: query.stage_id as string | undefined,
        status: query.status as OpportunityFilters['status'],
        assigned_to: query.assigned_to as string | undefined,
        search: query.search as string | undefined,
        page: query.page as number | undefined,
        limit: query.limit as number | undefined,
      });

      sendSuccess(res, result);
    } catch {
      serverError(res, 'Failed to fetch opportunities');
    }
  },

  async getOpportunitySummary(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_VIEW)) return;

    try {
      const orgId = getOrgId(req);
      if (!orgId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      await opportunityService.ensureDefaultStages(orgId, req.user?.id || null);
      const summary = await opportunityService.getSummary(orgId);
      sendSuccess(res, summary);
    } catch {
      serverError(res, 'Failed to fetch opportunity summary');
    }
  },

  async getOpportunityById(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_VIEW)) return;

    try {
      const orgId = getOrgId(req);
      if (!orgId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const row = await opportunityService.getOpportunityById(orgId, params.id);

      if (!row) {
        notFoundMessage(res, 'Opportunity not found');
        return;
      }

      sendSuccess(res, row);
    } catch {
      serverError(res, 'Failed to fetch opportunity');
    }
  },

  async createOpportunity(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_CREATE)) return;

    try {
      const orgId = getOrgId(req);
      const userId = req.user?.id;
      if (!orgId || !userId) {
        unauthorized(res, 'Organization context and user required');
        return;
      }

      await opportunityService.ensureDefaultStages(orgId, userId);
      const created = await opportunityService.createOpportunity(orgId, userId, req.body);
      sendSuccess(res, created, 201);
    } catch (error) {
      handleServiceError(res, error, 'Failed to create opportunity');
    }
  },

  async updateOpportunity(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_EDIT)) return;

    try {
      const orgId = getOrgId(req);
      const userId = req.user?.id;
      if (!orgId || !userId) {
        unauthorized(res, 'Organization context and user required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const updated = await opportunityService.updateOpportunity(orgId, params.id, userId, req.body);

      if (!updated) {
        notFoundMessage(res, 'Opportunity not found');
        return;
      }

      sendSuccess(res, updated);
    } catch (error) {
      handleServiceError(res, error, 'Failed to update opportunity');
    }
  },

  async moveOpportunityStage(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_EDIT)) return;

    try {
      const orgId = getOrgId(req);
      const userId = req.user?.id;
      if (!orgId || !userId) {
        unauthorized(res, 'Organization context and user required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const moved = await opportunityService.moveOpportunityStage(orgId, params.id, userId, req.body);

      if (!moved) {
        notFoundMessage(res, 'Opportunity not found');
        return;
      }

      sendSuccess(res, moved);
    } catch (error) {
      handleServiceError(res, error, 'Failed to move opportunity stage');
    }
  },

  async deleteOpportunity(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.OPPORTUNITY_DELETE)) return;

    try {
      const orgId = getOrgId(req);
      if (!orgId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = ((req as any).validatedParams ?? req.params) as { id: string };
      const deleted = await opportunityService.deleteOpportunity(orgId, params.id);

      if (!deleted) {
        notFoundMessage(res, 'Opportunity not found');
        return;
      }

      res.status(204).send();
    } catch {
      serverError(res, 'Failed to delete opportunity');
    }
  },
};

export default opportunitiesController;
