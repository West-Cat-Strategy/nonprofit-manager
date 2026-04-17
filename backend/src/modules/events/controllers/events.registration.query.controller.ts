import { NextFunction, Response } from 'express';
import type { RegistrationFilters } from '@app-types/event';
import { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import {
  parseBooleanQuery,
  parseRegistrationStatus,
} from '../mappers/queryMappers';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import type { EventsControllerSharedContext } from './events.controller.shared';
import { getScopeFilter, getValidatedParams, getValidatedQuery } from './events.controller.shared';

export const buildEventRegistrationQueryHandlers = (
  registrationUseCase: EventRegistrationUseCase,
  shared: EventsControllerSharedContext
) => {
  const listRegistrations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const query = getValidatedQuery(req);
      const eventId = params.id || (typeof query.event_id === 'string' ? query.event_id : undefined);
      const contactId = typeof query.contact_id === 'string' ? query.contact_id : undefined;

      if (eventId) {
        const canAccess = await shared.ensureEventAccess(eventId, req, res);
        if (!canAccess) return;

        const filters: RegistrationFilters = {
          occurrence_id: typeof query.occurrence_id === 'string' ? query.occurrence_id : undefined,
          registration_status: parseRegistrationStatus(query.registration_status ?? query.status),
          checked_in: parseBooleanQuery(query.checked_in),
        };
        const rows = await registrationUseCase.listByEvent(eventId, filters);
        sendSuccess(res, rows);
        return;
      }

      if (contactId) {
        const rows = await registrationUseCase.listByContact(contactId, getScopeFilter(req));
        sendSuccess(res, rows);
        return;
      }

      sendError(res, 'VALIDATION_ERROR', 'Either event_id or contact_id query parameter is required', 400);
    } catch (error) {
      next(error);
    }
  };

  return {
    listRegistrations,
  };
};
