/**
 * Event Controller
 * HTTP request handlers for event scheduling and registration
 */

import { Response, NextFunction } from 'express';
import { services } from '../container/services';
import { AuthRequest } from '@middleware/auth';
import type {
  CreateEventDTO,
  UpdateEventDTO,
  CreateRegistrationDTO,
  UpdateRegistrationDTO,
  EventFilters,
  PaginationParams,
  RegistrationFilters,
  SendEventRemindersDTO,
  CreateEventReminderAutomationDTO,
  UpdateEventReminderAutomationDTO,
  SyncEventReminderAutomationsDTO,
} from '@app-types/event';
import { EventType, EventStatus, RegistrationStatus } from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { badRequest, notFoundMessage } from '@utils/responseHelpers';
import * as eventReminderAutomationService from '@services/eventReminderAutomationService';

const eventService = services.event;

// Type-safe enum parsers
const parseEventType = (value: unknown): EventType | undefined => {
  if (typeof value !== 'string') return undefined;
  return Object.values(EventType).includes(value as EventType) ? (value as EventType) : undefined;
};

const parseEventStatus = (value: unknown): EventStatus | undefined => {
  if (typeof value !== 'string') return undefined;
  return Object.values(EventStatus).includes(value as EventStatus) ? (value as EventStatus) : undefined;
};

const parseRegistrationStatus = (value: unknown): RegistrationStatus | undefined => {
  if (typeof value !== 'string') return undefined;
  return Object.values(RegistrationStatus).includes(value as RegistrationStatus) ? (value as RegistrationStatus) : undefined;
};

const parseBooleanQuery = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return undefined;
  return parsed;
};

const parseOptionalDateInput = (value: unknown): Date | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return undefined;
};

/**
 * GET /api/events
 * Get all events with optional filtering
 */
export const getEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const events = await eventService.getEvents(filters, pagination, scope);
    res.json(events);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/summary
 * Get event attendance summary for dashboards
 */
export const getEventAttendanceSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const summary = await eventService.getEventAttendanceSummary(new Date(), scope);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:id
 * Get a single event by ID
 */
export const getEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const event = await eventService.getEventById(id, scope);

    if (!event) {
      notFoundMessage(res, 'Event not found');
      return;
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events
 * Create a new event
 */
export const createEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data: CreateEventDTO = req.body;

    const event = await eventService.createEvent(data, req.user!.id);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/events/:id
 * Update an event
 */
export const updateEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateEventDTO = req.body;

    const event = await eventService.updateEvent(id, data, req.user!.id);

    if (!event) {
      notFoundMessage(res, 'Event not found');
      return;
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/events/:id
 * Delete (cancel) an event
 */
export const deleteEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await eventService.deleteEvent(id, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:id/registrations
 * Get registrations for an event
 */
export const getEventRegistrations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const filters: RegistrationFilters = {
      registration_status: parseRegistrationStatus(req.query.registration_status ?? req.query.status),
      checked_in: req.query.checked_in === 'true' ? true : req.query.checked_in === 'false' ? false : undefined,
    };

    const registrations = await eventService.getEventRegistrations(id, filters);
    res.json(registrations);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:id/register
 * Register for an event
 */
export const registerForEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const data: CreateRegistrationDTO = {
      ...req.body,
      event_id: id,
    };

    const registration = await eventService.registerContact(data);
    res.status(201).json(registration);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/events/registrations/:id
 * Update a registration
 */
export const updateRegistration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateRegistrationDTO = req.body;

    const registration = await eventService.updateRegistration(id, data);

    if (!registration) {
      notFoundMessage(res, 'Registration not found');
      return;
    }

    res.json(registration);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/registrations/:id/checkin
 * Check in an attendee
 */
export const checkInAttendee = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await eventService.checkInAttendee(id);

    if (!result.success) {
      badRequest(res, result.message);
      return;
    }

    res.json(result.registration);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/events/registrations/:id
 * Cancel a registration
 */
export const cancelRegistration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await eventService.cancelRegistration(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:id/attendance
 * Get attendance statistics for an event
 */
export const getAttendanceStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Get registrations for the event
    const registrations = await eventService.getEventRegistrations(id);

    // Calculate stats
    const stats = {
      total_registered: registrations.length,
      checked_in: registrations.filter(r => r.checked_in).length,
      attendance_rate: registrations.length > 0
        ? (registrations.filter(r => r.checked_in).length / registrations.length) * 100
        : 0,
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/registrations
 * Get registrations for a contact
 */
export const getRegistrations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const eventId = req.query.event_id as string | undefined;
    const contactId = req.query.contact_id as string;
    const filters: RegistrationFilters = {
      registration_status: parseRegistrationStatus(req.query.registration_status ?? req.query.status),
      checked_in: req.query.checked_in === 'true' ? true : req.query.checked_in === 'false' ? false : undefined,
    };

    if (eventId) {
      const registrations = await eventService.getEventRegistrations(eventId, filters);
      res.json(registrations);
      return;
    }

    if (contactId) {
      const registrations = await eventService.getContactRegistrations(contactId);
      res.json(registrations);
      return;
    }

    badRequest(res, 'Either event_id or contact_id query parameter is required');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:id/reminders/send
 * Send event reminders to registered/confirmed attendees via email and/or SMS.
 */
export const sendEventReminders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: SendEventRemindersDTO = req.body || {};

    const summary = await eventService.sendEventReminders(id, data, {
      triggerType: 'manual',
      sentBy: req.user?.id || null,
    });
    res.json({ data: summary, message: 'Event reminders processed' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Event not found') {
        notFoundMessage(res, 'Event not found');
        return;
      }
      if (error.message === 'At least one reminder channel must be enabled') {
        badRequest(res, error.message);
        return;
      }
    }
    next(error);
  }
};

/**
 * GET /api/events/:id/reminder-automations
 * List all reminder automations for an event.
 */
export const getEventReminderAutomations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const automations = await eventReminderAutomationService.listEventReminderAutomations(id);
    res.json({ data: automations });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:id/reminder-automations
 * Create one reminder automation for an event.
 */
export const createEventReminderAutomation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data: CreateEventReminderAutomationDTO = {
      timingType: req.body.timingType,
      relativeMinutesBefore: req.body.relativeMinutesBefore,
      absoluteSendAt: parseOptionalDateInput(req.body.absoluteSendAt),
      sendEmail: req.body.sendEmail,
      sendSms: req.body.sendSms,
      customMessage: req.body.customMessage,
      timezone: req.body.timezone,
    };

    const automation = await eventReminderAutomationService.createEventReminderAutomation(
      id,
      data,
      req.user!.id
    );

    res.status(201).json({ data: automation, message: 'Reminder automation created' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('requires') || error.message.includes('enabled') || error.message.includes('500')) {
        badRequest(res, error.message);
        return;
      }
    }
    next(error);
  }
};

/**
 * PATCH /api/events/:id/reminder-automations/:automationId
 * Update a pending (unattempted) reminder automation.
 */
export const updateEventReminderAutomation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, automationId } = req.params;
    const data: UpdateEventReminderAutomationDTO = {
      timingType: req.body.timingType,
      relativeMinutesBefore: req.body.relativeMinutesBefore,
      absoluteSendAt: parseOptionalDateInput(req.body.absoluteSendAt),
      sendEmail: req.body.sendEmail,
      sendSms: req.body.sendSms,
      customMessage: req.body.customMessage,
      timezone: req.body.timezone,
      isActive: req.body.isActive,
    };

    const updated = await eventReminderAutomationService.updateEventReminderAutomation(
      id,
      automationId,
      data,
      req.user!.id
    );

    res.json({ data: updated, message: 'Reminder automation updated' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Reminder automation not found') {
        notFoundMessage(res, error.message);
        return;
      }
      if (error.message.includes('cannot') || error.message.includes('requires') || error.message.includes('enabled') || error.message.includes('500')) {
        badRequest(res, error.message);
        return;
      }
    }
    next(error);
  }
};

/**
 * POST /api/events/:id/reminder-automations/:automationId/cancel
 * Cancel a pending (unattempted) reminder automation.
 */
export const cancelEventReminderAutomation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, automationId } = req.params;
    const cancelled = await eventReminderAutomationService.cancelEventReminderAutomation(
      id,
      automationId,
      req.user!.id
    );
    res.json({ data: cancelled, message: 'Reminder automation cancelled' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Reminder automation not found') {
        notFoundMessage(res, error.message);
        return;
      }
      if (error.message.includes('cannot')) {
        badRequest(res, error.message);
        return;
      }
    }
    next(error);
  }
};

/**
 * PUT /api/events/:id/reminder-automations/sync
 * Replace all pending automations for an event with provided items.
 */
export const syncEventReminderAutomations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const itemsRaw: Array<Record<string, unknown>> = Array.isArray(req.body?.items)
      ? req.body.items
      : [];
    const data: SyncEventReminderAutomationsDTO = {
      items: itemsRaw.map((item: Record<string, unknown>) => ({
        timingType: item.timingType as CreateEventReminderAutomationDTO['timingType'],
        relativeMinutesBefore:
          typeof item.relativeMinutesBefore === 'number'
            ? item.relativeMinutesBefore
            : undefined,
        absoluteSendAt: parseOptionalDateInput(item.absoluteSendAt),
        sendEmail: typeof item.sendEmail === 'boolean' ? item.sendEmail : undefined,
        sendSms: typeof item.sendSms === 'boolean' ? item.sendSms : undefined,
        customMessage:
          typeof item.customMessage === 'string' ? item.customMessage : undefined,
        timezone: typeof item.timezone === 'string' ? item.timezone : undefined,
      })),
    };

    const automations = await eventReminderAutomationService.syncPendingEventReminderAutomations(
      id,
      data,
      req.user!.id
    );
    res.json({
      data: automations,
      message: 'Pending reminder automations synchronized',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('requires') || error.message.includes('enabled') || error.message.includes('500')) {
        badRequest(res, error.message);
        return;
      }
    }
    next(error);
  }
};

export default {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,
  registerForEvent,
  updateRegistration,
  checkInAttendee,
  cancelRegistration,
  getAttendanceStats,
  getRegistrations,
  sendEventReminders,
  getEventReminderAutomations,
  createEventReminderAutomation,
  updateEventReminderAutomation,
  cancelEventReminderAutomation,
  syncEventReminderAutomations,
};
