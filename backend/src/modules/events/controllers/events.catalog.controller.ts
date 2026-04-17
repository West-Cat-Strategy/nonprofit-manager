import { NextFunction, Response } from 'express';
import type {
  CreateEventDTO,
  EventFilters,
  PaginationParams,
  UpdateEventDTO,
} from '@app-types/event';
import { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import {
  parseBooleanQuery,
  parseEventStatus,
  parseEventType,
  parsePositiveInt,
} from '../mappers/queryMappers';
import { EventCatalogUseCase } from '../usecases/eventCatalog.usecase';
import type { EventsControllerSharedContext } from './events.controller.shared';
import {
  buildEventLocation,
  escapeIcsText,
  EventCalendarPayload,
  getScopeFilter,
  getValidatedParams,
  getValidatedQuery,
  resolveMutationScope,
  sendEventHttpError,
  toIcsUtc,
} from './events.controller.shared';

export const buildEventsCatalogHandlers = (
  catalogUseCase: EventCatalogUseCase,
  shared: EventsControllerSharedContext
) => {
  const getEvents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_VIEW)) return;

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
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const getEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const event = await catalogUseCase.getById(params.id, getScopeFilter(req));
      if (!event) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }
      sendSuccess(res, event);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const getOccurrences = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const query = getValidatedQuery(req);
      const rows = await catalogUseCase.listOccurrences(
        {
          event_id: typeof query.event_id === 'string' ? query.event_id : undefined,
          start_date: (query.start_date as Date | undefined) ?? (query.from as Date | undefined),
          end_date: (query.end_date as Date | undefined) ?? (query.to as Date | undefined),
          search: typeof query.search === 'string' ? query.search : undefined,
          event_type: parseEventType(query.event_type),
          status: parseEventStatus(query.status),
          is_public: parseBooleanQuery(query.is_public),
          include_cancelled: parseBooleanQuery(query.include_cancelled),
        },
        getScopeFilter(req)
      );
      sendSuccess(res, rows);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const getOccurrence = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const params = getValidatedParams(req);
      const occurrence = await catalogUseCase.getOccurrenceById(params.occurrenceId, getScopeFilter(req));
      if (!occurrence) {
        sendError(res, 'OCCURRENCE_NOT_FOUND', 'Occurrence not found', 404);
        return;
      }
      sendSuccess(res, occurrence);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const getSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_VIEW)) return;

    try {
      const summary = await catalogUseCase.attendanceSummary(getScopeFilter(req));
      sendSuccess(res, summary);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const downloadCalendarIcs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_VIEW)) return;

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
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const createEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_CREATE)) return;

    try {
      const event = await catalogUseCase.create(req.body as CreateEventDTO, req.user!.id);
      sendSuccess(res, event, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      const event = await catalogUseCase.update(params.id, req.body as UpdateEventDTO, req.user!.id);
      if (!event) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
        return;
      }
      sendSuccess(res, event);
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const updateOccurrence = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_EDIT)) return;

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
      if (sendEventHttpError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const deleteEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!shared.ensurePermission(req, res, Permission.EVENT_DELETE)) return;

    try {
      const params = getValidatedParams(req);
      const canAccess = await shared.ensureEventAccess(params.id, req, res);
      if (!canAccess) return;

      await catalogUseCase.delete(params.id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      if (sendEventHttpError(res, error)) {
        return;
      }
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
  };
};
