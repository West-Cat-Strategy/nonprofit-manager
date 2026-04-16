import { Response } from 'express';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { getAuditLogPage } from '@services/auditLogQueryService';
import { serverError } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import { getAdminDashboardStats } from '../usecases/adminDashboardStatsUseCase';

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    return sendSuccess(res, await getAdminDashboardStats());
  } catch (error) {
    logger.error('Failed to fetch admin stats', {
      error,
      correlationId: req.correlationId,
    });
    return serverError(res, 'Failed to fetch admin stats');
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const query = req.validatedQuery as { limit: number; offset: number } | undefined;
        const limit = query?.limit ?? 50;
        const offset = query?.offset ?? 0;
        const page = await getAuditLogPage({ limit, offset });
        return sendSuccess(res, page);
    } catch (error) {
        logger.error('Failed to fetch audit logs', {
            error,
            correlationId: req.correlationId,
        });
        return serverError(res, 'Failed to fetch audit logs');
    }
};

export const getUserAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const query = req.validatedQuery as { limit: number; offset: number } | undefined;
        const limit = query?.limit ?? 50;
        const offset = query?.offset ?? 0;
        const params = (req.validatedParams ?? req.params) as { id: string };
        const page = await getAuditLogPage({ limit, offset, userId: params.id });
        return sendSuccess(res, page);
    } catch (error) {
        logger.error('Failed to fetch user audit logs', {
            error,
            correlationId: req.correlationId,
        });
        return serverError(res, 'Failed to fetch user audit logs');
    }
};
