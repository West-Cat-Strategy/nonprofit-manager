import { NextFunction, Response } from 'express';
import type {
  CreateRegistrationDTO,
  EventConfirmationEmailResult,
  EventWalkInCheckInDTO,
  RegistrationFilters,
  RotateEventCheckInPinResult,
  UpdateEventCheckInSettingsDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import {
  parseBooleanQuery,
  parseRegistrationStatus,
} from '../mappers/queryMappers';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import type { EventsControllerSharedContext } from './events.controller.shared';
import {
  getScopeFilter,
  getValidatedParams,
  getValidatedQuery,
  sendEventHttpError,
} from './events.controller.shared';

export const buildEventRegistrationHandlers = (
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

  const register = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const data: CreateRegistrationDTO = {
        ...(req.body as CreateRegistrationDTO),
        event_id: params.id,
      };
      const registration = await registrationUseCase.register(data, {
        actorUserId: req.user?.id ?? null,
        source: 'staff',
      });
      sendSuccess(res, registration, 201);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const updateRegistration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await shared.ensureRegistrationEventAccess(params.id, req, res);
      if (!registration) return;

      const updated = await registrationUseCase.update(
        registration.registration_id,
        req.body as UpdateRegistrationDTO,
        {
          actorUserId: req.user?.id ?? null,
          source: 'staff',
        }
      );
      if (!updated) {
        sendError(res, 'REGISTRATION_NOT_FOUND', 'Registration not found', 404);
        return;
      }
      sendSuccess(res, updated);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const getCheckInSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const query = getValidatedQuery(req);
      const settings = await registrationUseCase.getCheckInSettings(
        params.id,
        typeof query.occurrence_id === 'string' ? query.occurrence_id : undefined
      );
      if (!settings) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }
      sendSuccess(res, settings);
    } catch (error) {
      next(error);
    }
  };

  const updateCheckInSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const updated = await registrationUseCase.updateCheckInSettings(
        params.id,
        req.body as UpdateEventCheckInSettingsDTO,
        req.user!.id
      );
      if (!updated) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  };

  const rotateCheckInPin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const bodyOccurrenceId =
        req.body && typeof req.body.occurrence_id === 'string' ? req.body.occurrence_id : undefined;
      const updated = await registrationUseCase.rotateCheckInPin(params.id, req.user!.id, bodyOccurrenceId);
      const response: RotateEventCheckInPinResult = updated;
      sendSuccess(res, response);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const checkIn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await shared.ensureRegistrationEventAccess(params.id, req, res);
      if (!registration) return;

      const result = await registrationUseCase.checkIn(registration.registration_id, {
        method: 'manual',
        checkedInBy: req.user?.id ?? null,
      });
      if (!result.success) {
        sendError(res, 'CHECKIN_ERROR', result.message, 400);
        return;
      }
      sendSuccess(res, result.registration ?? null);
    } catch (error) {
      next(error);
    }
  };

  const scanCheckIn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const body = req.body as { token: string };

      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const registration = await registrationUseCase.getByToken(params.id, body.token);
      if (!registration) {
        sendError(res, 'REGISTRATION_NOT_FOUND', 'Registration not found', 404);
        return;
      }

      const result = await registrationUseCase.checkIn(registration.registration_id, {
        method: 'qr',
        checkedInBy: req.user?.id ?? null,
      });
      if (!result.success) {
        sendError(res, 'CHECKIN_ERROR', result.message, 400);
        return;
      }

      sendSuccess(res, result.registration ?? null);
    } catch (error) {
      next(error);
    }
  };

  const scanCheckInGlobal = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const body = req.body as { token: string };
      const registration = await registrationUseCase.getByTokenGlobal(
        body.token,
        getScopeFilter(req)
      );

      if (!registration) {
        sendError(res, 'REGISTRATION_NOT_FOUND', 'Registration not found', 404);
        return;
      }

      const result = await registrationUseCase.checkIn(registration.registration_id, {
        method: 'qr',
        checkedInBy: req.user?.id ?? null,
      });

      if (!result.success) {
        sendError(res, 'CHECKIN_ERROR', result.message, 400);
        return;
      }

      sendSuccess(res, result.registration ?? null);
    } catch (error) {
      next(error);
    }
  };

  const walkInCheckIn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const result = await registrationUseCase.walkInCheckIn(
        params.id,
        req.body as EventWalkInCheckInDTO,
        req.user!.id
      );
      sendSuccess(res, result, result.created_registration ? 201 : 200);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const cancelRegistration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await shared.ensureRegistrationEventAccess(params.id, req, res);
      if (!registration) return;

      await registrationUseCase.cancel(registration.registration_id);
      res.status(204).send();
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const sendConfirmationEmail = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await shared.ensureRegistrationEventAccess(params.id, req, res);
      if (!registration) return;

      const result = await registrationUseCase.sendConfirmationEmail(
        registration.registration_id,
        req.user?.id ?? null
      );
      const response: EventConfirmationEmailResult = result;
      sendSuccess(res, response);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  return {
    listRegistrations,
    register,
    updateRegistration,
    getCheckInSettings,
    updateCheckInSettings,
    rotateCheckInPin,
    checkIn,
    scanCheckIn,
    scanCheckInGlobal,
    walkInCheckIn,
    cancelRegistration,
    sendConfirmationEmail,
  };
};
