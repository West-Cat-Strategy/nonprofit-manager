import { NextFunction, Response } from 'express';
import type {
  CreateEventDTO,
  EventWalkInCheckInDTO,
  CreateRegistrationDTO,
  EventFilters,
  EventConfirmationEmailResult,
  EventMutationScope,
  RotateEventCheckInPinResult,
  EventRegistration,
  PaginationParams,
  RegistrationFilters,
  SendEventRemindersDTO,
  SyncEventReminderAutomationsDTO,
  UpdateEventDTO,
  UpdateEventReminderAutomationDTO,
  UpdateEventCheckInSettingsDTO,
  UpdateRegistrationDTO,
  CreateEventReminderAutomationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { AuthRequest } from '@middleware/auth';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
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

interface EventCalendarPayload {
  event_id: string;
  event_name: string;
  description?: string | null;
  start_date: Date | string;
  end_date: Date | string;
  location_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

const toIcsUtc = (value: Date): string => {
  const iso = value.toISOString();
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

const buildEventLocation = (event: EventCalendarPayload): string | null => {
  const parts = [
    event.location_name,
    event.address_line1,
    event.address_line2,
    event.city,
    event.state_province,
    event.postal_code,
    event.country,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);

  return parts.length > 0 ? parts.join(', ') : null;
};

const getScopeFilter = (req: AuthRequest): DataScopeFilter | undefined =>
  req.dataScope?.filter as DataScopeFilter | undefined;

const getValidatedQuery = (req: AuthRequest): Record<string, unknown> =>
  (req.validatedQuery ?? req.query) as Record<string, unknown>;

const getValidatedParams = (req: AuthRequest): Record<string, string> =>
  (req.validatedParams ?? req.params) as Record<string, string>;

const resolveMutationScope = (value: unknown): EventMutationScope =>
  value === 'future_occurrences' || value === 'series' ? value : 'occurrence';

export const createEventsController = (
  catalogUseCase: EventCatalogUseCase,
  registrationUseCase: EventRegistrationUseCase,
  remindersUseCase: EventRemindersUseCase
) => {
  const ensurePermission = (req: AuthRequest, res: Response, permission: Permission): boolean => {
    const guard = requirePermissionSafe(req, permission);
    if (!guard.ok) {
      if (guard.error.code === 'unauthorized') {
        sendUnauthorized(res, guard.error.message);
      } else {
        sendForbidden(res, guard.error.message || 'Forbidden');
      }
      return false;
    }

    return true;
  };

  const ensureEventAccess = async (
    eventId: string,
    req: AuthRequest,
    res: Response
  ): Promise<boolean> => {
    const scopedEvent = await catalogUseCase.getById(eventId, getScopeFilter(req));
    if (scopedEvent) {
      return true;
    }

    const unscopedEvent = await catalogUseCase.getById(eventId);
    if (unscopedEvent) {
      sendError(res, 'FORBIDDEN', 'Event is outside your data scope', 403);
      return false;
    }

    sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
    return false;
  };

  const ensureRegistrationEventAccess = async (
    registrationId: string,
    req: AuthRequest,
    res: Response
  ): Promise<EventRegistration | null> => {
    const registration = await registrationUseCase.getById(registrationId);
    if (!registration) {
      sendError(res, 'REGISTRATION_NOT_FOUND', 'Registration not found', 404);
      return null;
    }

    const canAccess = await ensureEventAccess(registration.event_id, req, res);
    if (!canAccess) {
      return null;
    }

    return registration;
  };

  const isValidationRegistrationError = (message: string): boolean =>
    message === 'No fields to update' ||
    message === 'Event is at full capacity' ||
    message === 'Occurrence not found' ||
    message === 'Case must belong to the same contact as the registration' ||
    message.startsWith('Checked-in attendees cannot be moved to');

  const getEvents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const query = getValidatedQuery(req);

      const filters: EventFilters = {
        event_type: parseEventType(query.event_type),
        status: parseEventStatus(query.status),
        is_public: parseBooleanQuery(query.is_public),
        start_date: query.start_date ? new Date(query.start_date as string) : undefined,
        end_date: query.end_date ? new Date(query.end_date as string) : undefined,
        search: typeof query.search === 'string' ? query.search : undefined,
      };

      const pagination: PaginationParams = {
        page: parsePositiveInt(query.page),
        limit: parsePositiveInt(query.limit),
        sort_by: typeof query.sort_by === 'string' ? query.sort_by : undefined,
        sort_order:
          query.sort_order === 'asc' || query.sort_order === 'desc' ? query.sort_order : undefined,
      };

      const events = await catalogUseCase.list(filters, pagination, getScopeFilter(req));
      sendSuccess(res, events);
    } catch (error) {
      next(error);
    }
  };

  const getEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const event = await catalogUseCase.getById(params.id, getScopeFilter(req));
      if (!event) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  };

  const getOccurrences = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const query = getValidatedQuery(req);
      const rows = await catalogUseCase.listOccurrences(
        {
          event_id: typeof query.event_id === 'string' ? query.event_id : undefined,
          start_date: (query.start_date as Date | undefined) ?? (query.from as Date | undefined),
          end_date: (query.end_date as Date | undefined) ?? (query.to as Date | undefined),
          include_cancelled: parseBooleanQuery(query.include_cancelled),
        },
        getScopeFilter(req)
      );
      sendSuccess(res, rows);
    } catch (error) {
      next(error);
    }
  };

  const getOccurrence = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const occurrence = await catalogUseCase.getOccurrenceById(params.occurrenceId, getScopeFilter(req));
      if (!occurrence) {
        sendError(res, 'OCCURRENCE_NOT_FOUND', 'Occurrence not found', 404);
        return;
      }
      sendSuccess(res, occurrence);
    } catch (error) {
      next(error);
    }
  };

  const getSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const summary = await catalogUseCase.attendanceSummary(getScopeFilter(req));
      sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  };

  const downloadCalendarIcs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const query = getValidatedQuery(req);
      const eventRaw = await catalogUseCase.getById(params.id, getScopeFilter(req));
      if (!eventRaw) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }
      const occurrenceId = typeof query.occurrence_id === 'string' ? query.occurrence_id : undefined;
      const occurrence = occurrenceId
        ? await catalogUseCase.getOccurrenceById(occurrenceId, getScopeFilter(req))
        : null;

      const event = (occurrence
        ? {
            event_id: eventRaw.event_id,
            event_name: occurrence.occurrence_name ?? occurrence.event_name,
            description: occurrence.description ?? eventRaw.description,
            start_date: occurrence.start_date,
            end_date: occurrence.end_date,
            location_name: occurrence.location_name,
            address_line1: occurrence.address_line1,
            address_line2: occurrence.address_line2,
            city: occurrence.city,
            state_province: occurrence.state_province,
            postal_code: occurrence.postal_code,
            country: occurrence.country,
          }
        : eventRaw) as EventCalendarPayload;
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        sendError(res, 'EVENT_DATE_INVALID', 'Event has invalid calendar dates', 422);
        return;
      }

      const dtStamp = toIcsUtc(new Date());
      const dtStart = toIcsUtc(startDate);
      const dtEnd = toIcsUtc(endDate);
      const summary = escapeIcsText(event.event_name);
      const description = event.description ? escapeIcsText(event.description) : null;
      const location = buildEventLocation(event);
      const escapedLocation = location ? escapeIcsText(location) : null;
      const uid = occurrenceId
        ? `${event.event_id}:${occurrenceId}@nonprofit-manager`
        : `${event.event_id}@nonprofit-manager`;

      const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//West Cat Strategy//Nonprofit Manager//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
      ];

      if (description) {
        lines.push(`DESCRIPTION:${description}`);
      }

      if (escapedLocation) {
        lines.push(`LOCATION:${escapedLocation}`);
      }

      lines.push('END:VEVENT', 'END:VCALENDAR');

      const fileName = occurrenceId
        ? `event-${event.event_id}-${occurrenceId}.ics`
        : `event-${event.event_id}.ics`;
      const calendarIcs = `${lines.join('\r\n')}\r\n`;

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(calendarIcs);
    } catch (error) {
      next(error);
    }
  };

  const createEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_CREATE)) return;

    try {
      const event = await catalogUseCase.create(req.body as CreateEventDTO, req.user!.id);
      sendSuccess(res, event, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const event = await catalogUseCase.update(params.id, req.body as UpdateEventDTO, req.user!.id);
      if (!event) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }
      sendSuccess(res, event);
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        sendError(res, 'EVENT_NOT_FOUND', error.message, 404);
        return;
      }
      next(error);
    }
  };

  const updateOccurrence = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const query = getValidatedQuery(req);
      const scopedOccurrence = await catalogUseCase.getOccurrenceById(
        params.occurrenceId,
        getScopeFilter(req)
      );
      if (!scopedOccurrence) {
        const unscopedOccurrence = await catalogUseCase.getOccurrenceById(params.occurrenceId);
        if (unscopedOccurrence) {
          sendError(res, 'FORBIDDEN', 'Occurrence is outside your data scope', 403);
        } else {
          sendError(res, 'OCCURRENCE_NOT_FOUND', 'Occurrence not found', 404);
        }
        return;
      }

      const updated = await catalogUseCase.updateOccurrence(
        params.occurrenceId,
        req.body,
        resolveMutationScope(query.scope),
        req.user!.id
      );

      if (!updated) {
        sendError(res, 'OCCURRENCE_NOT_FOUND', 'Occurrence not found', 404);
        return;
      }

      sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof Error && error.message === 'Occurrence not found') {
        sendError(res, 'OCCURRENCE_NOT_FOUND', error.message, 404);
        return;
      }
      next(error);
    }
  };

  const deleteEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_DELETE)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      await catalogUseCase.delete(params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const listRegistrations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const query = getValidatedQuery(req);
      const eventId = params.id || (typeof query.event_id === 'string' ? query.event_id : undefined);
      const contactId = typeof query.contact_id === 'string' ? query.contact_id : undefined;

      if (eventId) {
        const canAccess = await ensureEventAccess(eventId, req, res);
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
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
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
      if (error instanceof Error && error.message.includes('already registered')) {
        sendError(res, 'ALREADY_REGISTERED', error.message, 409);
        return;
      }
      if (error instanceof Error && isValidationRegistrationError(error.message)) {
        sendError(res, 'VALIDATION_ERROR', error.message, 400);
        return;
      }
      next(error);
    }
  };

  const updateRegistration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await ensureRegistrationEventAccess(params.id, req, res);
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
      if (error instanceof Error) {
        if (error.message === 'Registration not found') {
          sendError(res, 'REGISTRATION_NOT_FOUND', error.message, 404);
          return;
        }
        if (isValidationRegistrationError(error.message)) {
          sendError(res, 'VALIDATION_ERROR', error.message, 400);
          return;
        }
      }
      next(error);
    }
  };

  const getCheckInSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
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
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
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
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const bodyOccurrenceId =
        req.body && typeof req.body.occurrence_id === 'string' ? req.body.occurrence_id : undefined;
      const updated = await registrationUseCase.rotateCheckInPin(params.id, req.user!.id, bodyOccurrenceId);
      const response: RotateEventCheckInPinResult = updated;
      sendSuccess(res, response);
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        sendError(res, 'EVENT_NOT_FOUND', error.message, 404);
        return;
      }
      next(error);
    }
  };

  const checkIn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await ensureRegistrationEventAccess(params.id, req, res);
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
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const body = req.body as { token: string };

      const canAccess = await ensureEventAccess(params.id, req, res);
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
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

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
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const result = await registrationUseCase.walkInCheckIn(
        params.id,
        req.body as EventWalkInCheckInDTO,
        req.user!.id
      );
      sendSuccess(res, result, result.created_registration ? 201 : 200);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Event not found') {
          sendError(res, 'EVENT_NOT_FOUND', error.message, 404);
          return;
        }
        if (
          error.message === 'Event is at full capacity' ||
          error.message === 'Event is not accepting check-ins' ||
          error.message.includes('Check-in is available') ||
          error.message.includes('cannot be checked in')
        ) {
          sendError(res, 'CHECKIN_ERROR', error.message, 400);
          return;
        }
      }
      next(error);
    }
  };

  const cancelRegistration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await ensureRegistrationEventAccess(params.id, req, res);
      if (!registration) return;

      await registrationUseCase.cancel(registration.registration_id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const sendConfirmationEmail = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const registration = await ensureRegistrationEventAccess(params.id, req, res);
      if (!registration) return;

      const result = await registrationUseCase.sendConfirmationEmail(
        registration.registration_id,
        req.user?.id ?? null
      );
      const response: EventConfirmationEmailResult = result;
      sendSuccess(res, response);
    } catch (error) {
      if (error instanceof Error && error.message === 'Registration not found') {
        sendError(res, 'REGISTRATION_NOT_FOUND', error.message, 404);
        return;
      }
      next(error);
    }
  };

  const sendReminders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const summary = await remindersUseCase.send(
        params.id,
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
    if (!ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const rows = await remindersUseCase.listAutomations(params.id);
      sendSuccess(res, rows);
    } catch (error) {
      next(error);
    }
  };

  const createAutomation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
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
      next(error);
    }
  };

  const updateAutomation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
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
      if (error instanceof Error && error.message === 'Reminder automation not found') {
        sendError(res, 'AUTOMATION_NOT_FOUND', error.message, 404);
        return;
      }
      next(error);
    }
  };

  const cancelAutomation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const row = await remindersUseCase.cancelAutomation(params.id, params.automationId, req.user!.id);
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
    if (!ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await ensureEventAccess(params.id, req, res);
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
      next(error);
    }
  };

  return {
    getEvents,
    getEvent,
    getOccurrences,
    getOccurrence,
    getSummary,
    downloadCalendarIcs,
    createEvent,
    updateEvent,
    updateOccurrence,
    deleteEvent,
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
    sendReminders,
    listAutomations,
    createAutomation,
    updateAutomation,
    cancelAutomation,
    syncAutomations,
  };
};
