import { NextFunction, Response } from 'express';
import type { EventWalkInCheckInDTO } from '@app-types/event';
import { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import type { EventsControllerSharedContext } from './events.controller.shared';
import {
  getScopeFilter,
  getValidatedParams,
  sendEventHttpError,
} from './events.controller.shared';

export const buildEventRegistrationCheckInHandlers = (
  registrationUseCase: EventRegistrationUseCase,
  shared: EventsControllerSharedContext
) => {
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

  return {
    checkIn,
    scanCheckIn,
    scanCheckInGlobal,
    walkInCheckIn,
  };
};
