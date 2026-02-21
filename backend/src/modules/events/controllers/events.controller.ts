import { NextFunction, Response } from 'express';
import type {
  CreateEventDTO,
  CreateRegistrationDTO,
  EventFilters,
  PaginationParams,
  RegistrationFilters,
  SendEventRemindersDTO,
  UpdateEventDTO,
  UpdateRegistrationDTO,
  CreateEventReminderAutomationDTO,
  UpdateEventReminderAutomationDTO,
  SyncEventReminderAutomationsDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { AuthRequest } from '@middleware/auth';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import {
  parseBooleanQuery,
  parseEventStatus,
  parseEventType,
  parseOptionalDateInput,
  parsePositiveInt,
  parseRegistrationStatus,
} from '../mappers/queryMappers';
import { EventCatalogUseCase } from '../usecases/eventCatalog.usecase';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import { EventRemindersUseCase } from '../usecases/reminders.usecase';

export const createEventsController = (
  catalogUseCase: EventCatalogUseCase,
  registrationUseCase: EventRegistrationUseCase,
  remindersUseCase: EventRemindersUseCase
) => {
  const getEvents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: EventFilters = {
        event_type: parseEventType(req.query.event_type),
        status: parseEventStatus(req.query.status),
        is_public: parseBooleanQuery(req.query.is_public),
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        search: req.query.search as string,
      };

      const pagination: PaginationParams = {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
        sort_by: typeof req.query.sort_by === 'string' ? req.query.sort_by : undefined,
        sort_order: req.query.sort_order === 'asc' || req.query.sort_order === 'desc'
          ? req.query.sort_order
          : undefined,
      };

      const events = await catalogUseCase.list(filters, pagination, req.dataScope?.filter as DataScopeFilter | undefined);
      sendSuccess(res, events);
    } catch (error) {
      next(error);
    }
  };

  const getEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const event = await catalogUseCase.getById(req.params.id, req.dataScope?.filter as DataScopeFilter | undefined);
      if (!event) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  };

  const getSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await catalogUseCase.attendanceSummary(req.dataScope?.filter as DataScopeFilter | undefined);
      sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  };

  const createEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const event = await catalogUseCase.create(req.body as CreateEventDTO, req.user!.id);
      sendSuccess(res, event, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const event = await catalogUseCase.update(req.params.id, req.body as UpdateEventDTO, req.user!.id);
      if (!event) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  };

  const deleteEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await catalogUseCase.delete(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const listRegistrations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = req.params.id || (req.query.event_id as string | undefined);
      const contactId = req.query.contact_id as string | undefined;

      if (eventId) {
        const filters: RegistrationFilters = {
          registration_status: parseRegistrationStatus(req.query.registration_status ?? req.query.status),
          checked_in:
            req.query.checked_in === 'true' ? true : req.query.checked_in === 'false' ? false : undefined,
        };
        const rows = await registrationUseCase.listByEvent(eventId, filters);
        sendSuccess(res, rows);
        return;
      }

      if (contactId) {
        const rows = await registrationUseCase.listByContact(contactId);
        sendSuccess(res, rows);
        return;
      }

      sendError(res, 'VALIDATION_ERROR', 'Either event_id or contact_id query parameter is required', 400);
    } catch (error) {
      next(error);
    }
  };

  const register = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateRegistrationDTO = {
        ...(req.body as CreateRegistrationDTO),
        event_id: req.params.id,
      };
      const registration = await registrationUseCase.register(data);
      sendSuccess(res, registration, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already registered')) {
        sendError(res, 'ALREADY_REGISTERED', error.message, 409);
        return;
      }
      next(error);
    }
  };

  const updateRegistration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registration = await registrationUseCase.update(
        req.params.id,
        req.body as UpdateRegistrationDTO
      );
      if (!registration) {
        sendError(res, 'REGISTRATION_NOT_FOUND', 'Registration not found', 404);
        return;
      }
      sendSuccess(res, registration);
    } catch (error) {
      next(error);
    }
  };

  const checkIn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await registrationUseCase.checkIn(req.params.id);
      if (!result.success) {
        sendError(res, 'CHECKIN_ERROR', result.message, 400);
        return;
      }
      sendSuccess(res, result.registration ?? null);
    } catch (error) {
      next(error);
    }
  };

  const cancelRegistration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await registrationUseCase.cancel(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const sendReminders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await remindersUseCase.send(
        req.params.id,
        req.body as SendEventRemindersDTO,
        req.user?.id ?? null
      );
      sendSuccess(res, summary);
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        sendError(res, 'EVENT_NOT_FOUND', error.message, 404);
        return;
      }
      next(error);
    }
  };

  const listAutomations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await remindersUseCase.listAutomations(req.params.id);
      sendSuccess(res, rows);
    } catch (error) {
      next(error);
    }
  };

  const createAutomation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: CreateEventReminderAutomationDTO = {
        timingType: req.body.timingType,
        relativeMinutesBefore: req.body.relativeMinutesBefore,
        absoluteSendAt: parseOptionalDateInput(req.body.absoluteSendAt),
        sendEmail: req.body.sendEmail,
        sendSms: req.body.sendSms,
        customMessage: req.body.customMessage,
        timezone: req.body.timezone,
      };

      const row = await remindersUseCase.createAutomation(req.params.id, payload, req.user!.id);
      sendSuccess(res, row, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateAutomation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: UpdateEventReminderAutomationDTO = {
        timingType: req.body.timingType,
        relativeMinutesBefore: req.body.relativeMinutesBefore,
        absoluteSendAt: parseOptionalDateInput(req.body.absoluteSendAt),
        sendEmail: req.body.sendEmail,
        sendSms: req.body.sendSms,
        customMessage: req.body.customMessage,
        timezone: req.body.timezone,
        isActive: req.body.isActive,
      };

      const row = await remindersUseCase.updateAutomation(req.params.id, req.params.automationId, payload, req.user!.id);
      sendSuccess(res, row);
    } catch (error) {
      if (error instanceof Error && error.message === 'Reminder automation not found') {
        sendError(res, 'AUTOMATION_NOT_FOUND', error.message, 404);
        return;
      }
      next(error);
    }
  };

  const cancelAutomation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const row = await remindersUseCase.cancelAutomation(req.params.id, req.params.automationId, req.user!.id);
      sendSuccess(res, row);
    } catch (error) {
      if (error instanceof Error && error.message === 'Reminder automation not found') {
        sendError(res, 'AUTOMATION_NOT_FOUND', error.message, 404);
        return;
      }
      next(error);
    }
  };

  const syncAutomations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const itemsRaw: Array<Record<string, unknown>> = Array.isArray(req.body?.items) ? req.body.items : [];
      const payload: SyncEventReminderAutomationsDTO = {
        items: itemsRaw.map((item: Record<string, unknown>) => ({
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

      const rows = await remindersUseCase.syncAutomations(req.params.id, payload, req.user!.id);
      sendSuccess(res, rows);
    } catch (error) {
      next(error);
    }
  };

  return {
    getEvents,
    getEvent,
    getSummary,
    createEvent,
    updateEvent,
    deleteEvent,
    listRegistrations,
    register,
    updateRegistration,
    checkIn,
    cancelRegistration,
    sendReminders,
    listAutomations,
    createAutomation,
    updateAutomation,
    cancelAutomation,
    syncAutomations,
  };
};
