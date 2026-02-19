import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import {
  requirePermissionOrError,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { serverError, validationError } from '@utils/responseHelpers';
import * as outcomeReportService from '@services/outcomeReportService';
import type { OutcomeReportFilters } from '@app-types/outcomes';

const guardReportPermission = (req: AuthRequest, res: Response): boolean => {
  const guardResult = requirePermissionOrError(req, Permission.OUTCOMES_VIEW_REPORTS);
  if (!guardResult.success) {
    if (guardResult.error?.toLowerCase().startsWith('unauthorized')) {
      sendUnauthorized(res, guardResult.error);
    } else {
      sendForbidden(res, guardResult.error || 'Forbidden');
    }
    return false;
  }
  return true;
};

export const getOutcomesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardReportPermission(req, res)) {
    return;
  }

  try {
    const query = ((req as any).validatedQuery ?? req.query) as {
      from: string;
      to: string;
      programId?: string;
      staffId?: string;
      interactionType?: string;
      bucket?: 'week' | 'month';
      includeNonReportable?: boolean;
    };

    const isAdmin = req.user?.role === 'admin';

    if (query.programId) {
      validationError(res, {
        programId: 'programId is not supported by the current case interaction schema',
      });
      return;
    }

    if (query.includeNonReportable && !isAdmin) {
      sendForbidden(res, 'Only admins can include non-reportable outcomes');
      return;
    }

    const filters: OutcomeReportFilters = {
      from: query.from,
      to: query.to,
      programId: query.programId,
      staffId: query.staffId,
      interactionType: query.interactionType,
      bucket: query.bucket || 'week',
      includeNonReportable: query.includeNonReportable,
    };

    const report = await outcomeReportService.getOutcomesReport(filters, isAdmin);

    res.json({ success: true, data: report });
  } catch {
    serverError(res, 'Failed to generate outcomes report');
  }
};
