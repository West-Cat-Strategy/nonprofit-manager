import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { PortalEventsUseCase } from '../usecases/eventsUseCase';

const getPortalContactId = (req: PortalAuthRequest): string | null => req.portalUser?.contactId ?? null;

export const createPortalEventsController = (useCase: PortalEventsUseCase) => {
  const getEvents = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const events = await useCase.listEvents(contactId);
      sendSuccess(res, events);
    } catch (error) {
      next(error);
    }
  };

  const register = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      const portalUserId = req.portalUser?.id;
      if (!contactId || !portalUserId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const result = await useCase.register({
        contactId,
        eventId: req.params.eventId,
        portalUserId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (result === 'not_found') {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }

      if (result === 'not_public') {
        sendError(res, 'EVENT_FORBIDDEN', 'This event is not open for self-registration', 403);
        return;
      }

      if (result === 'started') {
        sendError(res, 'EVENT_STARTED', 'This event has already started', 400);
        return;
      }

      if (result === 'inactive') {
        sendError(res, 'EVENT_INACTIVE', 'This event is not accepting registrations', 400);
        return;
      }

      if (result === 'exists') {
        sendError(res, 'ALREADY_REGISTERED', 'Already registered for this event', 409);
        return;
      }

      if (result === 'full') {
        sendError(res, 'EVENT_FULL', 'Event is at full capacity', 400);
        return;
      }

      sendSuccess(res, { eventId: req.params.eventId, status: 'registered' }, 201);
    } catch (error) {
      next(error);
    }
  };

  const cancel = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      const portalUserId = req.portalUser?.id;
      if (!contactId || !portalUserId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const result = await useCase.cancelRegistration({
        contactId,
        eventId: req.params.eventId,
        portalUserId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (result === 'not_found') {
        sendError(res, 'REGISTRATION_NOT_FOUND', 'Registration not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getEvents,
    register,
    cancel,
  };
};
