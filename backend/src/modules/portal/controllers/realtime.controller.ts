import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import {
  isPortalRealtimeEnabled,
  openPortalRealtimeStream,
} from '@services/portalRealtimeService';
import { sendError } from '../../shared/http/envelope';

export const createPortalRealtimeController = () => {
  const stream = (req: PortalAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!isPortalRealtimeEnabled()) {
        sendError(res, 'PORTAL_REALTIME_DISABLED', 'Portal realtime stream is disabled', 404);
        return;
      }

      if (!req.portalUser?.id) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const query = (req.validatedQuery ?? req.query) as { channels?: string };
      const channelsRaw = typeof query.channels === 'string' ? query.channels : undefined;

      openPortalRealtimeStream({
        req,
        res,
        audience: 'portal',
        userId: req.portalUser.id,
        contactId: req.portalUser.contactId,
        channelsRaw,
      });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 'PORTAL_STREAM_ERROR', error.message, 400);
        return;
      }
      next(error);
    }
  };

  return {
    stream,
  };
};

