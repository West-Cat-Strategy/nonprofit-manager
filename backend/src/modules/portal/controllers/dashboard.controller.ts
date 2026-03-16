import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { PortalDashboardUseCase } from '../usecases/dashboardUseCase';

const getPortalContactId = (req: PortalAuthRequest): string | null => req.portalUser?.contactId ?? null;

export const createPortalDashboardController = (useCase: PortalDashboardUseCase) => {
  const getDashboard = async (
    req: PortalAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      const portalUserId = req.portalUser?.id ?? null;
      if (!contactId || !portalUserId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const dashboard = await useCase.getDashboard(contactId, portalUserId);
      sendSuccess(res, dashboard);
    } catch (error) {
      next(error);
    }
  };

  return {
    getDashboard,
  };
};
