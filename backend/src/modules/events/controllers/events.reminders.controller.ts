import { NextFunction, Response } from 'express';
import type {
  CreateEventReminderAutomationDTO,
  SendEventRemindersDTO,
  SyncEventReminderAutomationsDTO,
  UpdateEventReminderAutomationDTO,
} from '@app-types/event';
import { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { sendSuccess } from '../../shared/http/envelope';
import { parseOptionalDateInput } from '../mappers/queryMappers';
import { EventRemindersUseCase } from '../usecases/reminders.usecase';
import type { EventsControllerSharedContext } from './events.controller.shared';
import { getValidatedParams, sendEventHttpError } from './events.controller.shared';

export const buildEventReminderHandlers = (
  remindersUseCase: EventRemindersUseCase,
  shared: EventsControllerSharedContext
) => {
  const sendReminders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const summary = await remindersUseCase.send(
        params.id,
        req.body as SendEventRemindersDTO,
        req.user?.id ?? null
      );
      sendSuccess(res, summary);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const listAutomations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const rows = await remindersUseCase.listAutomations(params.id);
      sendSuccess(res, rows);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const createAutomation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const payload: CreateEventReminderAutomationDTO = {
        occurrenceId: req.body.occurrenceId,
        timingType: req.body.timingType,
        relativeMinutesBefore: req.body.relativeMinutesBefore,
        absoluteSendAt: parseOptionalDateInput(req.body.absoluteSendAt),
        sendEmail: req.body.sendEmail,
        sendSms: req.body.sendSms,
        customMessage: req.body.customMessage,
        timezone: req.body.timezone,
      };

      const row = await remindersUseCase.createAutomation(params.id, payload, req.user!.id);
      sendSuccess(res, row, 201);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const updateAutomation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const payload: UpdateEventReminderAutomationDTO = {
        occurrenceId: req.body.occurrenceId,
        timingType: req.body.timingType,
        relativeMinutesBefore: req.body.relativeMinutesBefore,
        absoluteSendAt: parseOptionalDateInput(req.body.absoluteSendAt),
        sendEmail: req.body.sendEmail,
        sendSms: req.body.sendSms,
        customMessage: req.body.customMessage,
        timezone: req.body.timezone,
        isActive: req.body.isActive,
      };

      const row = await remindersUseCase.updateAutomation(params.id, params.automationId, payload, req.user!.id);
      sendSuccess(res, row);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const cancelAutomation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const row = await remindersUseCase.cancelAutomation(params.id, params.automationId, req.user!.id);
      sendSuccess(res, row);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const syncAutomations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const itemsRaw: Array<Record<string, unknown>> = Array.isArray(req.body?.items) ? req.body.items : [];
      const payload: SyncEventReminderAutomationsDTO = {
        items: itemsRaw.map((item: Record<string, unknown>) => ({
          occurrenceId: typeof item.occurrenceId === 'string' ? item.occurrenceId : undefined,
          timingType: item.timingType as CreateEventReminderAutomationDTO['timingType'],
          relativeMinutesBefore:
            typeof item.relativeMinutesBefore === 'number' ? item.relativeMinutesBefore : undefined,
          absoluteSendAt: parseOptionalDateInput(item.absoluteSendAt),
          sendEmail: typeof item.sendEmail === 'boolean' ? item.sendEmail : undefined,
          sendSms: typeof item.sendSms === 'boolean' ? item.sendSms : undefined,
          customMessage: typeof item.customMessage === 'string' ? item.customMessage : undefined,
          timezone: typeof item.timezone === 'string' ? item.timezone : undefined,
        })),
      };

      const rows = await remindersUseCase.syncAutomations(params.id, payload, req.user!.id);
      sendSuccess(res, rows);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  return {
    sendReminders,
    listAutomations,
    createAutomation,
    updateAutomation,
    cancelAutomation,
    syncAutomations,
  };
};
