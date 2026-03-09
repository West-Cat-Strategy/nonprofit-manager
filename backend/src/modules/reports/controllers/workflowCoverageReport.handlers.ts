import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { sendSuccess } from '@modules/shared/http/envelope';
import { unauthorized } from '@utils/responseHelpers';
import { Permission } from '@utils/permissions';
import type { WorkflowCoverageFilters } from '@app-types/report';
import workflowCoverageReportService from '@services/workflowCoverageReportService';

const getOrgId = (req: AuthRequest): string | null =>
  req.organizationId || req.accountId || req.tenantId || null;

const guardReportPermission = (req: AuthRequest, res: Response): boolean => {
  const guardResult = requirePermissionSafe(req, Permission.REPORT_VIEW);
  if (!guardResult.ok) {
    if (guardResult.error.code === 'unauthorized') {
      sendUnauthorized(res, guardResult.error.message);
    } else {
      sendForbidden(res, guardResult.error.message || 'Forbidden');
    }
    return false;
  }
  return true;
};

export const getWorkflowCoverageReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!guardReportPermission(req, res)) {
      return;
    }

    const organizationId = getOrgId(req);
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
