import { type NextFunction, type Response } from 'express';
import { sendSuccess } from '@modules/shared/http/envelope';
import type {
  CreateFundedProgramDTO,
  CreateGrantFunderDTO,
  CreateGrantProgramDTO,
  CreateRecipientOrganizationDTO,
  GrantListFilters,
  UpdateFundedProgramDTO,
  UpdateGrantFunderDTO,
  UpdateGrantProgramDTO,
  UpdateRecipientOrganizationDTO,
} from '@app-types/grant';
import { Permission } from '@utils/permissions';
import { notFoundMessage } from '@utils/responseHelpers';
import { type AuthRequest } from '@middleware/auth';
import type { GrantsControllerContext } from './grantsControllerShared';

export const createGrantsPortfolioHandlers = (context: GrantsControllerContext) => {
  const listFunders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listFunders(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getFunderById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const funder = await context.service.getFunderById(organizationId, id);
      if (!context.sendNotFoundIfMissing(res, funder, 'Grant funder not found')) return;

      sendSuccess(res, funder);
    } catch (error) {
      next(error);
    }
  };

  const createFunder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const funder = await context.service.createFunder(
        organizationId,
        userId,
        req.body as CreateGrantFunderDTO
      );
      sendSuccess(res, funder, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateFunder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const funder = await context.service.updateFunder(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantFunderDTO
      );
      if (!context.sendNotFoundIfMissing(res, funder, 'Grant funder not found')) return;

      sendSuccess(res, funder);
    } catch (error) {
      next(error);
    }
  };

  const deleteFunder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const deleted = await context.service.deleteFunder(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant funder not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listPrograms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listPrograms(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getProgramById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const program = await context.service.getProgramById(organizationId, id);
      if (!context.sendNotFoundIfMissing(res, program, 'Grant program not found')) return;

      sendSuccess(res, program);
    } catch (error) {
      next(error);
    }
  };

  const createProgram = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const program = await context.service.createProgram(
        organizationId,
        userId,
        req.body as CreateGrantProgramDTO
      );
      sendSuccess(res, program, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateProgram = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const program = await context.service.updateProgram(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantProgramDTO
      );
      if (!context.sendNotFoundIfMissing(res, program, 'Grant program not found')) return;

      sendSuccess(res, program);
    } catch (error) {
      next(error);
    }
  };

  const deleteProgram = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const deleted = await context.service.deleteProgram(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant program not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listRecipients = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listRecipients(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getRecipientById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const recipient = await context.service.getRecipientById(organizationId, id);
      if (!context.sendNotFoundIfMissing(res, recipient, 'Recipient organization not found')) return;

      sendSuccess(res, recipient);
    } catch (error) {
      next(error);
    }
  };

  const createRecipient = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const recipient = await context.service.createRecipient(
        organizationId,
        userId,
        req.body as CreateRecipientOrganizationDTO
      );
      sendSuccess(res, recipient, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateRecipient = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const recipient = await context.service.updateRecipient(
        organizationId,
        id,
        userId,
        req.body as UpdateRecipientOrganizationDTO
      );
      if (!context.sendNotFoundIfMissing(res, recipient, 'Recipient organization not found')) return;

      sendSuccess(res, recipient);
    } catch (error) {
      next(error);
    }
  };

  const deleteRecipient = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const deleted = await context.service.deleteRecipient(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Recipient organization not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listFundedPrograms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listFundedPrograms(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getFundedProgramById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const fundedProgram = await context.service.getFundedProgramById(organizationId, id);
      if (!context.sendNotFoundIfMissing(res, fundedProgram, 'Funded program not found')) return;

      sendSuccess(res, fundedProgram);
    } catch (error) {
      next(error);
    }
  };

  const createFundedProgram = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const fundedProgram = await context.service.createFundedProgram(
        organizationId,
        userId,
        req.body as CreateFundedProgramDTO
      );
      sendSuccess(res, fundedProgram, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateFundedProgram = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const fundedProgram = await context.service.updateFundedProgram(
        organizationId,
        id,
        userId,
        req.body as UpdateFundedProgramDTO
      );
      if (!context.sendNotFoundIfMissing(res, fundedProgram, 'Funded program not found')) return;

      sendSuccess(res, fundedProgram);
    } catch (error) {
      next(error);
    }
  };

  const deleteFundedProgram = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const deleted = await context.service.deleteFundedProgram(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Funded program not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  return {
    listFunders,
    getFunderById,
    createFunder,
    updateFunder,
    deleteFunder,
    listPrograms,
    getProgramById,
    createProgram,
    updateProgram,
    deleteProgram,
    listRecipients,
    getRecipientById,
    createRecipient,
    updateRecipient,
    deleteRecipient,
    listFundedPrograms,
    getFundedProgramById,
    createFundedProgram,
    updateFundedProgram,
    deleteFundedProgram,
  };
};
