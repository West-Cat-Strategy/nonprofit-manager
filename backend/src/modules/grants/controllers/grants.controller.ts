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
import { sendSuccess } from '@modules/shared/http/envelope';
import { setTabularDownloadHeaders } from '@modules/shared/export/tabularExport';
import type {
  CreateFundedProgramDTO,
  CreateGrantApplicationDTO,
  CreateGrantAwardDTO,
  CreateGrantDisbursementDTO,
  CreateGrantDocumentDTO,
  CreateGrantFunderDTO,
  CreateGrantProgramDTO,
  CreateGrantReportDTO,
  CreateRecipientOrganizationDTO,
  GrantListFilters,
  GrantJurisdiction,
  UpdateFundedProgramDTO,
  UpdateGrantApplicationDTO,
  UpdateGrantAwardDTO,
  UpdateGrantDisbursementDTO,
  UpdateGrantDocumentDTO,
  UpdateGrantFunderDTO,
  UpdateGrantProgramDTO,
  UpdateGrantReportDTO,
  UpdateRecipientOrganizationDTO,
} from '@app-types/grant';

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

export const createGrantsController = () => {
  const listSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<{ jurisdiction?: GrantJurisdiction; fiscal_year?: string }>(req);
      const summary = await grantService.getSummary(organizationId, query);
      sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  };

  const listFunders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listFunders(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getFunderById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = getParams<{ id: string }>(req);
      const funder = await grantService.getFunderById(organizationId, id);
      if (!sendNotFoundIfMissing(res, funder, 'Grant funder not found')) return;

      sendSuccess(res, funder);
    } catch (error) {
      next(error);
    }
  };

  const createFunder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const funder = await grantService.createFunder(
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
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const funder = await grantService.updateFunder(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantFunderDTO
      );
      if (!sendNotFoundIfMissing(res, funder, 'Grant funder not found')) return;

      sendSuccess(res, funder);
    } catch (error) {
      next(error);
    }
  };

  const deleteFunder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const deleted = await grantService.deleteFunder(organizationId, id, userId);
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
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listPrograms(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getProgramById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = getParams<{ id: string }>(req);
      const program = await grantService.getProgramById(organizationId, id);
      if (!sendNotFoundIfMissing(res, program, 'Grant program not found')) return;

      sendSuccess(res, program);
    } catch (error) {
      next(error);
    }
  };

  const createProgram = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const program = await grantService.createProgram(
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
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const program = await grantService.updateProgram(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantProgramDTO
      );
      if (!sendNotFoundIfMissing(res, program, 'Grant program not found')) return;

      sendSuccess(res, program);
    } catch (error) {
      next(error);
    }
  };

  const deleteProgram = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const deleted = await grantService.deleteProgram(organizationId, id, userId);
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
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listRecipients(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getRecipientById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = getParams<{ id: string }>(req);
      const recipient = await grantService.getRecipientById(organizationId, id);
      if (!sendNotFoundIfMissing(res, recipient, 'Recipient organization not found')) return;

      sendSuccess(res, recipient);
    } catch (error) {
      next(error);
    }
  };

  const createRecipient = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const recipient = await grantService.createRecipient(
        organizationId,
        userId,
        req.body as CreateRecipientOrganizationDTO
      );
      sendSuccess(res, recipient, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateRecipient = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const recipient = await grantService.updateRecipient(
        organizationId,
        id,
        userId,
        req.body as UpdateRecipientOrganizationDTO
      );
      if (!sendNotFoundIfMissing(res, recipient, 'Recipient organization not found')) return;

      sendSuccess(res, recipient);
    } catch (error) {
      next(error);
    }
  };

  const deleteRecipient = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const deleted = await grantService.deleteRecipient(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Recipient organization not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listFundedPrograms = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listFundedPrograms(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getFundedProgramById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = getParams<{ id: string }>(req);
      const program = await grantService.getFundedProgramById(organizationId, id);
      if (!sendNotFoundIfMissing(res, program, 'Funded program not found')) return;

      sendSuccess(res, program);
    } catch (error) {
      next(error);
    }
  };

  const createFundedProgram = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const program = await grantService.createFundedProgram(
        organizationId,
        userId,
        req.body as CreateFundedProgramDTO
      );
      sendSuccess(res, program, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateFundedProgram = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const program = await grantService.updateFundedProgram(
        organizationId,
        id,
        userId,
        req.body as UpdateFundedProgramDTO
      );
      if (!sendNotFoundIfMissing(res, program, 'Funded program not found')) return;

      sendSuccess(res, program);
    } catch (error) {
      next(error);
    }
  };

  const deleteFundedProgram = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const deleted = await grantService.deleteFundedProgram(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Funded program not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listApplications = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listApplications(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getApplicationById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = getParams<{ id: string }>(req);
      const application = await grantService.getApplicationById(organizationId, id);
      if (!sendNotFoundIfMissing(res, application, 'Grant application not found')) return;

      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  const createApplication = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const application = await grantService.createApplication(
        organizationId,
        userId,
        req.body as CreateGrantApplicationDTO
      );
      sendSuccess(res, application, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateApplication = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const application = await grantService.updateApplication(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantApplicationDTO
      );
      if (!sendNotFoundIfMissing(res, application, 'Grant application not found')) return;

      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  const updateApplicationStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const { status, reviewed_at, decision_at, approved_amount, outcome_reason, notes } =
        req.body as {
          status: NonNullable<UpdateGrantApplicationDTO['status']>;
          reviewed_at?: string | null;
          decision_at?: string | null;
          approved_amount?: number | null;
          outcome_reason?: string | null;
          notes?: string | null;
        };

      const application = await grantService.updateApplicationStatus(
        organizationId,
        id,
        userId,
        status,
        {
          reviewed_at,
          decision_at,
          approved_amount,
          outcome_reason,
          notes,
        }
      );
      if (!sendNotFoundIfMissing(res, application, 'Grant application not found')) return;

      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  };

  const awardApplication = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const result = await grantService.awardApplication(
        organizationId,
        id,
        userId,
        req.body as CreateGrantAwardDTO
      );
      if (!sendNotFoundIfMissing(res, result, 'Grant application not found')) return;

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  const deleteApplication = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const deleted = await grantService.deleteApplication(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant application not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listGrants = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listGrants(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getGrantById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = getParams<{ id: string }>(req);
      const grant = await grantService.getGrantById(organizationId, id);
      if (!sendNotFoundIfMissing(res, grant, 'Grant award not found')) return;

      sendSuccess(res, grant);
    } catch (error) {
      next(error);
    }
  };

  const createGrant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const grant = await grantService.createGrant(
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
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const grant = await grantService.updateGrant(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantAwardDTO
      );
      if (!sendNotFoundIfMissing(res, grant, 'Grant award not found')) return;

      sendSuccess(res, grant);
    } catch (error) {
      next(error);
    }
  };

  const deleteGrant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const deleted = await grantService.deleteGrant(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant award not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listDisbursements = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listDisbursements(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getDisbursementById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = getParams<{ id: string }>(req);
      const disbursement = await grantService.getDisbursementById(organizationId, id);
      if (!sendNotFoundIfMissing(res, disbursement, 'Grant disbursement not found')) return;

      sendSuccess(res, disbursement);
    } catch (error) {
      next(error);
    }
  };

  const createDisbursement = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const disbursement = await grantService.createDisbursement(
        organizationId,
        userId,
        req.body as CreateGrantDisbursementDTO
      );
      sendSuccess(res, disbursement, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateDisbursement = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const disbursement = await grantService.updateDisbursement(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantDisbursementDTO
      );
      if (!sendNotFoundIfMissing(res, disbursement, 'Grant disbursement not found')) return;

      sendSuccess(res, disbursement);
    } catch (error) {
      next(error);
    }
  };

  const deleteDisbursement = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const deleted = await grantService.deleteDisbursement(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant disbursement not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listReports = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listReports(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getReportById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = getParams<{ id: string }>(req);
      const report = await grantService.getReportById(organizationId, id);
      if (!sendNotFoundIfMissing(res, report, 'Grant report not found')) return;

      sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  };

  const createReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const report = await grantService.createReport(
        organizationId,
        userId,
        req.body as CreateGrantReportDTO
      );
      sendSuccess(res, report, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const report = await grantService.updateReport(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantReportDTO
      );
      if (!sendNotFoundIfMissing(res, report, 'Grant report not found')) return;

      sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  };

  const deleteReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const deleted = await grantService.deleteReport(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant report not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listDocuments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listDocuments(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getDocumentById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = getParams<{ id: string }>(req);
      const document = await grantService.getDocumentById(organizationId, id);
      if (!sendNotFoundIfMissing(res, document, 'Grant document not found')) return;

      sendSuccess(res, document);
    } catch (error) {
      next(error);
    }
  };

  const createDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const document = await grantService.createDocument(
        organizationId,
        userId,
        req.body as CreateGrantDocumentDTO
      );
      sendSuccess(res, document, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const document = await grantService.updateDocument(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantDocumentDTO
      );
      if (!sendNotFoundIfMissing(res, document, 'Grant document not found')) return;

      sendSuccess(res, document);
    } catch (error) {
      next(error);
    }
  };

  const deleteDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const userId = requireUser(req, res);
      if (!userId) return;

      const { id } = getParams<{ id: string }>(req);
      const deleted = await grantService.deleteDocument(organizationId, id, userId);
      if (!deleted) {
        notFoundMessage(res, 'Grant document not found');
        return;
      }

      sendSuccess(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  const listActivities = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters>(req);
      const result = await grantService.listActivities(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getCalendar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<{ start_date?: string; end_date?: string; limit?: number }>(req);
      const items = await grantService.getCalendar(organizationId, query);
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  };

  const exportGrants = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!ensurePermission(req, res, Permission.GRANT_EXPORT)) return;

      const organizationId = requireOrganization(req, res);
      if (!organizationId) return;

      const query = getQuery<GrantListFilters & { format?: 'csv' | 'xlsx' }>(req);
      const file = await grantService.exportGrants(organizationId, query, query.format ?? 'csv');
      setTabularDownloadHeaders(res, file);
      res.send(file.buffer);
    } catch (error) {
      next(error);
    }
  };

  return {
    getSummary: listSummary,
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
    listApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    updateApplicationStatus,
    awardApplication,
    deleteApplication,
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
    listReports,
    getReportById,
    createReport,
    updateReport,
    deleteReport,
    listDocuments,
    getDocumentById,
    createDocument,
    updateDocument,
    deleteDocument,
    listActivities,
    getCalendar,
    exportGrants,
  };
};

export type GrantsController = ReturnType<typeof createGrantsController>;
