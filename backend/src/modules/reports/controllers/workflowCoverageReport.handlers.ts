import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import {
  ensureRequestPermission,
  getRequestOrganizationId,
} from '@modules/shared/http/controllerAuth';
import { sendSuccess } from '@modules/shared/http/envelope';
import { unauthorized } from '@utils/responseHelpers';
import { Permission } from '@utils/permissions';
import type { WorkflowCoverageFilters } from '@app-types/report';
import workflowCoverageReportService from '@services/workflowCoverageReportService';

export const getWorkflowCoverageReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureRequestPermission(req, res, Permission.REPORT_VIEW)) {
      return;
    }

    const organizationId = getRequestOrganizationId(req);
    if (!organizationId) {
      unauthorized(res, 'Organization context required');
      return;
    }

    const query = (req.validatedQuery ?? req.query) as WorkflowCoverageFilters;
    const report = await workflowCoverageReportService.getWorkflowCoverageReport(organizationId, {
      ownerId: query.ownerId,
      statusType: query.statusType,
      missing: query.missing,
    });

    sendSuccess(res, report);
  } catch (error) {
    next(error);
  }
};
