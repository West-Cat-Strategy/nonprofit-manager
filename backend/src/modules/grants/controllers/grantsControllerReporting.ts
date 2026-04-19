import { type NextFunction, type Response } from 'express';
import { sendSuccess } from '@modules/shared/http/envelope';
import type {
  CreateGrantDocumentDTO,
  CreateGrantReportDTO,
  GrantListFilters,
  UpdateGrantDocumentDTO,
  UpdateGrantReportDTO,
} from '@app-types/grant';
import { Permission } from '@utils/permissions';
import { notFoundMessage } from '@utils/responseHelpers';
import { type AuthRequest } from '@middleware/auth';
import type { GrantsControllerContext } from './grantsControllerShared';

export const createGrantsReportingHandlers = (context: GrantsControllerContext) => {
  const listReports = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listReports(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getReportById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const report = await context.service.getReportById(organizationId, id);
      if (!context.sendNotFoundIfMissing(res, report, 'Grant report not found')) return;

      sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  };

  const createReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const report = await context.service.createReport(
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
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const report = await context.service.updateReport(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantReportDTO
      );
      if (!context.sendNotFoundIfMissing(res, report, 'Grant report not found')) return;

      sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  };

  const deleteReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const deleted = await context.service.deleteReport(organizationId, id, userId);
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
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listDocuments(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getDocumentById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const document = await context.service.getDocumentById(organizationId, id);
      if (!context.sendNotFoundIfMissing(res, document, 'Grant document not found')) return;

      sendSuccess(res, document);
    } catch (error) {
      next(error);
    }
  };

  const createDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_CREATE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const document = await context.service.createDocument(
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
      if (!context.ensurePermission(req, res, Permission.GRANT_EDIT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const document = await context.service.updateDocument(
        organizationId,
        id,
        userId,
        req.body as UpdateGrantDocumentDTO
      );
      if (!context.sendNotFoundIfMissing(res, document, 'Grant document not found')) return;

      sendSuccess(res, document);
    } catch (error) {
      next(error);
    }
  };

  const deleteDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_DELETE)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const userId = context.requireUser(req, res);
      if (!userId) return;

      const { id } = context.getParams<{ id: string }>(req);
      const deleted = await context.service.deleteDocument(organizationId, id, userId);
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
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters>(req);
      const result = await context.service.listActivities(organizationId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  return {
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
  };
};
