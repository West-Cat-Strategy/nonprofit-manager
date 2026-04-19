import { NextFunction, Response } from 'express';
import type {
  CreateRegistrationDTO,
  EventConfirmationEmailResult,
  EventMutationScope,
  UpdateRegistrationDTO,
} from '@app-types/event';
import { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import type { EventsControllerSharedContext } from './events.controller.shared';
import {
  getValidatedParams,
  getValidatedQuery,
  resolveMutationScope,
  sendEventHttpError,
} from './events.controller.shared';

export const buildEventRegistrationMutationHandlers = (
  registrationUseCase: EventRegistrationUseCase,
  shared: EventsControllerSharedContext
) => {
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

  const updateRegistration = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await shared.ensureRegistrationEventAccess(params.id, req, res);
      if (!registration) return;
      const query = getValidatedQuery(req);
      const scope: EventMutationScope = resolveMutationScope(query.scope);

      const updated = await registrationUseCase.update(
        registration.registration_id,
        req.body as UpdateRegistrationDTO,
        scope,
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

  const cancelRegistration = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await shared.ensureRegistrationEventAccess(params.id, req, res);
      if (!registration) return;

      await registrationUseCase.cancel(registration.registration_id, {
        actorUserId: req.user?.id ?? null,
        source: 'staff',
      });
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
    register,
    updateRegistration,
    cancelRegistration,
    sendConfirmationEmail,
  };
};
