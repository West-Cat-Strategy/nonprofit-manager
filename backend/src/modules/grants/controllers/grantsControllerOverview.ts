import { type NextFunction, type Response } from 'express';
import { sendSuccess } from '@modules/shared/http/envelope';
import { setTabularDownloadHeaders } from '@modules/shared/export/tabularExport';
import type { GrantJurisdiction, GrantListFilters } from '@app-types/grant';
import { Permission } from '@utils/permissions';
import { type AuthRequest } from '@middleware/auth';
import type { GrantsControllerContext } from './grantsControllerShared';

export const createGrantsOverviewHandlers = (context: GrantsControllerContext) => {
  const getSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<{ jurisdiction?: GrantJurisdiction; fiscal_year?: string }>(req);
      const summary = await context.service.getSummary(organizationId, query);
      sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  };

  const getCalendar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_VIEW)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<{ start_date?: string; end_date?: string; limit?: number }>(req);
      const items = await context.service.getCalendar(organizationId, query);
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  };

  const exportGrants = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!context.ensurePermission(req, res, Permission.GRANT_EXPORT)) return;

      const organizationId = context.requireOrganization(req, res);
      if (!organizationId) return;

      const query = context.getQuery<GrantListFilters & { format?: 'csv' | 'xlsx' }>(req);
      const file = await context.service.exportGrants(organizationId, query, query.format ?? 'csv');
      setTabularDownloadHeaders(res, file);
      res.send(file.buffer);
    } catch (error) {
      next(error);
    }
  };

  return {
    getSummary,
    getCalendar,
    exportGrants,
  };
};
