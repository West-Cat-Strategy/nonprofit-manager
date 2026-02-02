/**
 * Event Controller
 * HTTP request handlers for event scheduling and registration
 */

import { Response, NextFunction } from 'express';
import { EventService } from '../services/eventService';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import type {
  CreateEventDTO,
  UpdateEventDTO,
  CreateRegistrationDTO,
  UpdateRegistrationDTO,
  EventFilters,
  RegistrationFilters,
  CheckInDTO,
} from '../types/event';

const eventService = new EventService(pool);

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
      event_type: req.query.event_type as any,
      status: req.query.status as any,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      organizer_id: req.query.organizer_id as string,
      search: req.query.search as string,
    };

    const events = await eventService.getEvents(filters);
    res.json(events);
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
    const event = await eventService.getEvent(id);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
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
    const data: CreateEventDTO = {
      ...req.body,
      created_by: req.user!.id,
    };

    const event = await eventService.createEvent(data);
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

    const event = await eventService.updateEvent(id, data);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
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
    const deleted = await eventService.deleteEvent(id);

    if (!deleted) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

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
      event_id: id,
      status: req.query.status as any,
    };

    const registrations = await eventService.getRegistrations(filters);
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

    const registration = await eventService.createRegistration(data);

    if ('error' in registration) {
      res.status(400).json({ error: registration.error });
      return;
    }

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
      res.status(404).json({ error: 'Registration not found' });
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

    const data: CheckInDTO = {
      registration_id: id,
      checked_in_by: req.user!.id,
    };

    const registration = await eventService.checkIn(data);

    if (!registration) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

    res.json(registration);
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
    const cancelled = await eventService.cancelRegistration(id);

    if (!cancelled) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

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
    const stats = await eventService.getAttendanceStats(id);

    if (!stats) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/registrations
 * Get all registrations with optional filtering
 */
export const getRegistrations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: RegistrationFilters = {
      event_id: req.query.event_id as string,
      contact_id: req.query.contact_id as string,
      status: req.query.status as any,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };

    const registrations = await eventService.getRegistrations(filters);
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
