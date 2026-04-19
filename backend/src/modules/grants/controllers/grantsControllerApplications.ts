import { type NextFunction, type Response } from 'express';
import { sendSuccess } from '@modules/shared/http/envelope';
import type {
  CreateGrantApplicationDTO,
  CreateGrantAwardDTO,
  GrantApplicationStatus,
  GrantListFilters,
  UpdateGrantApplicationDTO,
} from '@app-types/grant';
import { Permission } from '@utils/permissions';
import { notFoundMessage } from '@utils/responseHelpers';
import { type AuthRequest } from '@middleware/auth';
import type { GrantsControllerContext } from './grantsControllerShared';

export const createGrantsApplicationHandlers = (context: GrantsControllerContext) => {
  const listApplications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listApplications(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getApplicationById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const application = await context.service.getApplicationById(organizationId, id);
      if (!context.sendNotFoundIfMissing(res, application, 'Grant application not found')) return;

      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  const createApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const application = await context.service.createApplication(
        organizationId,
        userId,
        req.body as CreateGrantApplicationDTO
      );
      sendSuccess(res, application, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const application = await context.service.updateApplication(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantApplicationDTO
      );
      if (!context.sendNotFoundIfMissing(res, application, 'Grant application not found')) return;

      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  const updateApplicationStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const body = req.body as {
        status: GrantApplicationStatus;
        reviewed_at?: string | null;
        decision_at?: string | null;
        approved_amount?: number | null;
        outcome_reason?: string | null;
        notes?: string | null;
      };
      const application = await context.service.updateApplicationStatus(
        organizationId,
        id,
        userId,
        body.status,
        body
      );
      if (!context.sendNotFoundIfMissing(res, application, 'Grant application not found')) return;

      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  const awardApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const awardResult = await context.service.awardApplication(
        organizationId,
        id,
        userId,
        req.body as CreateGrantAwardDTO
      );
      if (!context.sendNotFoundIfMissing(res, awardResult, 'Grant application not found')) return;

      sendSuccess(res, awardResult, 201);
    } catch (error) {
      next(error);
    }
  };

  const deleteApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const deleted = await context.service.deleteApplication(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant application not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  return {
    listApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    updateApplicationStatus,
    awardApplication,
    deleteApplication,
  };
};
