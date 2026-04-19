import { type NextFunction, type Response } from 'express';
import { sendSuccess } from '@modules/shared/http/envelope';
import type {
  CreateGrantAwardDTO,
  CreateGrantDisbursementDTO,
  GrantListFilters,
  UpdateGrantAwardDTO,
  UpdateGrantDisbursementDTO,
} from '@app-types/grant';
import { Permission } from '@utils/permissions';
import { notFoundMessage } from '@utils/responseHelpers';
import { type AuthRequest } from '@middleware/auth';
import type { GrantsControllerContext } from './grantsControllerShared';

export const createGrantsAwardHandlers = (context: GrantsControllerContext) => {
  const listGrants = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listGrants(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getGrantById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const grant = await context.service.getGrantById(organizationId, id);
      if (!context.sendNotFoundIfMissing(res, grant, 'Grant award not found')) return;

      sendSuccess(res, grant);
    } catch (error) {
      next(error);
    }
  };

  const createGrant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const grant = await context.service.createGrant(
        organizationId,
        userId,
        req.body as CreateGrantAwardDTO
      );
      sendSuccess(res, grant, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateGrant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const grant = await context.service.updateGrant(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantAwardDTO
      );
      if (!context.sendNotFoundIfMissing(res, grant, 'Grant award not found')) return;

      sendSuccess(res, grant);
    } catch (error) {
      next(error);
    }
  };

  const deleteGrant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const deleted = await context.service.deleteGrant(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant award not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listDisbursements = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listDisbursements(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getDisbursementById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const disbursement = await context.service.getDisbursementById(organizationId, id);
      if (!context.sendNotFoundIfMissing(res, disbursement, 'Grant disbursement not found')) return;

      sendSuccess(res, disbursement);
    } catch (error) {
      next(error);
    }
  };

  const createDisbursement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const disbursement = await context.service.createDisbursement(
        organizationId,
        userId,
        req.body as CreateGrantDisbursementDTO
      );
      sendSuccess(res, disbursement, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateDisbursement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const disbursement = await context.service.updateDisbursement(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantDisbursementDTO
      );
      if (!context.sendNotFoundIfMissing(res, disbursement, 'Grant disbursement not found')) return;

      sendSuccess(res, disbursement);
    } catch (error) {
      next(error);
    }
  };

  const deleteDisbursement = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const deleted = await context.service.deleteDisbursement(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant disbursement not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  return {
    listGrants,
    getGrantById,
    createGrant,
    updateGrant,
    deleteGrant,
    listDisbursements,
    getDisbursementById,
    createDisbursement,
    updateDisbursement,
    deleteDisbursement,
  };
};
