import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { serverError } from '@utils/responseHelpers';
import * as outcomeReportService from '../services/outcomesReportService';
import type { OutcomeReportFilters } from '@app-types/outcomes';
import { sendSuccess } from '@modules/shared/http/envelope';

const guardReportPermission = (req: AuthRequest, res: Response): boolean => {
  const guardResult = requirePermissionSafe(req, Permission.OUTCOMES_VIEW_REPORTS);
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

export const getOutcomesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardReportPermission(req, res)) {
    return;
  }

  try {
    const query = (req.validatedQuery ?? req.query) as {
      from: string;
      to: string;
      staffId?: string;
      source?: 'all' | 'interaction' | 'event';
      interactionType?: OutcomeReportFilters['interactionType'];
      bucket?: 'week' | 'month';
      includeNonReportable?: boolean;
    };

    const isAdmin = req.user?.role === 'admin';

    if (query.includeNonReportable && !isAdmin) {
      sendForbidden(res, 'Only admins can include non-reportable outcomes');
      return;
    }

    const filters: OutcomeReportFilters = {
      from: query.from,
      to: query.to,
      staffId: query.staffId,
      source: query.source || 'all',
      interactionType: query.interactionType,
      bucket: query.bucket || 'week',
      includeNonReportable: query.includeNonReportable,
    };

    const report = await outcomeReportService.getOutcomesReport(filters, isAdmin);

    sendSuccess(res, report);
  } catch {
    serverError(res, 'Failed to generate outcomes report');
  }
};
