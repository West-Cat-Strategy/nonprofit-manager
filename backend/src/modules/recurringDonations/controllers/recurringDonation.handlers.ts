import type { Request, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess } from '@modules/shared/http/envelope';
import { recurringDonationService } from '../services/recurringDonationService';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { badRequest, notFoundMessage, serverError, unauthorized } from '@utils/responseHelpers';

const getOrgId = (req: AuthRequest): string | null =>
  req.organizationId || req.accountId || req.tenantId || null;

const getPublicBaseUrl = (req: Request): string => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : req.protocol;
  return `${protocol}://${req.get('host') || 'localhost:3000'}`;
};

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

const handleServiceError = (res: Response, error: unknown, fallbackMessage: string): void => {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const normalized = message.toLowerCase();
  const likelyClientError =
    normalized.includes('invalid') ||
    normalized.includes('not found') ||
    normalized.includes('missing') ||
    normalized.includes('must') ||
    normalized.includes('not yet connected') ||
    normalized.includes('not supported') ||
    normalized.includes('only supported');

  if (likelyClientError) {
    badRequest(res, message);
    return;
  }

  serverError(res, message || fallbackMessage);
};

export const recurringDonationController = {
  async getCheckoutResult(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.validatedQuery ?? req.query) as {
        plan_id: string;
        return_to?: string;
      };
      const params = (req.validatedParams ?? req.params) as { sessionId: string };

      const result = await recurringDonationService.resolveCheckoutSuccess(
        query.plan_id,
        params.sessionId,
        getPublicBaseUrl(req),
        query.return_to
      );

      sendSuccess(res, result);
    } catch (error) {
      handleServiceError(res, error, 'Failed to resolve recurring donation checkout result');
    }
  },

  async redirectToManagementPortal(req: Request, res: Response): Promise<void> {
    try {
      const params = (req.validatedParams ?? req.params) as { token: string };
      const url = await recurringDonationService.getPortalSessionUrl(params.token);
      res.redirect(302, url);
    } catch (error) {
      handleServiceError(res, error, 'Failed to open recurring donation management portal');
    }
  },

  async listPlans(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.DONATION_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const query = (req.validatedQuery ?? req.query) as {
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
      };
      const rows = await recurringDonationService.listPlans(
        organizationId,
        {
          search: query.search,
          status: query.status as any,
        },
        query.page || 1,
        query.limit || 20
      );

      sendSuccess(res, rows);
    } catch (error) {
      handleServiceError(res, error, 'Failed to fetch recurring donation plans');
    }
  },

  async getPlan(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.DONATION_VIEW)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = (req.validatedParams ?? req.params) as { id: string };
      const plan = await recurringDonationService.getPlanById(organizationId, params.id);
      if (!plan) {
        notFoundMessage(res, 'Recurring donation plan not found');
        return;
      }

      sendSuccess(res, plan);
    } catch (error) {
      handleServiceError(res, error, 'Failed to fetch recurring donation plan');
    }
  },

  async updatePlan(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.DONATION_EDIT)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        sendUnauthorized(res, 'Organization context and user are required');
        return;
      }

      const params = (req.validatedParams ?? req.params) as { id: string };
      const updated = await recurringDonationService.updatePlan(
        organizationId,
        params.id,
        userId,
        req.body || {}
      );
      if (!updated) {
        notFoundMessage(res, 'Recurring donation plan not found');
        return;
      }

      sendSuccess(res, updated);
    } catch (error) {
      handleServiceError(res, error, 'Failed to update recurring donation plan');
    }
  },

  async cancelPlan(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.DONATION_EDIT)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        sendUnauthorized(res, 'Organization context and user are required');
        return;
      }

      const params = (req.validatedParams ?? req.params) as { id: string };
      const updated = await recurringDonationService.cancelPlan(organizationId, params.id, userId);
      if (!updated) {
        notFoundMessage(res, 'Recurring donation plan not found');
        return;
      }

      sendSuccess(res, updated);
    } catch (error) {
      handleServiceError(res, error, 'Failed to cancel recurring donation plan');
    }
  },

  async reactivatePlan(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.DONATION_EDIT)) return;

    try {
      const organizationId = getOrgId(req);
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        sendUnauthorized(res, 'Organization context and user are required');
        return;
      }

      const params = (req.validatedParams ?? req.params) as { id: string };
      const updated = await recurringDonationService.reactivatePlan(
        organizationId,
        params.id,
        userId
      );
      if (!updated) {
        notFoundMessage(res, 'Recurring donation plan not found');
        return;
      }

      sendSuccess(res, updated);
    } catch (error) {
      handleServiceError(res, error, 'Failed to reactivate recurring donation plan');
    }
  },

  async generateManagementLink(req: AuthRequest, res: Response): Promise<void> {
    if (!ensurePermission(req, res, Permission.DONATION_EDIT)) return;

    try {
      const organizationId = getOrgId(req);
      if (!organizationId) {
        unauthorized(res, 'Organization context required');
        return;
      }

      const params = (req.validatedParams ?? req.params) as { id: string };
      const url = await recurringDonationService.generateManagementLink(
        organizationId,
        params.id,
        getPublicBaseUrl(req)
      );

      sendSuccess(res, url);
    } catch (error) {
      handleServiceError(res, error, 'Failed to generate recurring donation management link');
    }
  },
};

export default recurringDonationController;
