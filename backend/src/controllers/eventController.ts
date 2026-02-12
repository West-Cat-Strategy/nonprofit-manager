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
  RegistrationFilters,
} from '@app-types/event';
import { EventType, EventStatus, RegistrationStatus } from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { badRequest, notFoundMessage } from '@utils/responseHelpers';

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
      start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
      end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
      search: req.query.search as string,
    };

    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const events = await eventService.getEvents(filters, {}, scope);
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
      registration_status: parseRegistrationStatus(req.query.status),
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
    const contactId = req.query.contact_id as string;

    if (!contactId) {
      badRequest(res, 'contact_id query parameter is required');
      return;
    }

    const registrations = await eventService.getContactRegistrations(contactId);
    res.json(registrations);
  } catch (error) {
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
};