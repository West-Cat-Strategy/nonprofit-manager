import { NextFunction, Response } from 'express';
import type {
  RotateEventCheckInPinResult,
  UpdateEventCheckInSettingsDTO,
} from '@app-types/event';
import { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import type { EventsControllerSharedContext } from './events.controller.shared';
import {
  getValidatedParams,
  getValidatedQuery,
  sendEventHttpError,
} from './events.controller.shared';

export const buildEventRegistrationSettingsHandlers = (
  registrationUseCase: EventRegistrationUseCase,
  shared: EventsControllerSharedContext
) => {
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

  return {
    getCheckInSettings,
    updateCheckInSettings,
    rotateCheckInPin,
  };
};
