/**
 * Event Controller
 * HTTP handlers for event management
 */

import { Response, NextFunction } from 'express';
import eventService from '../services/eventService';
import {
  CreateEventDTO,
  CreateRegistrationDTO,
  EventStatus,
  EventType,
  RegistrationStatus,
  UpdateEventDTO,
  UpdateRegistrationDTO,
} from '../types/event';
import { AuthRequest } from '../middleware/auth';
import {
  generateICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from '../utils/calendar';

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getBoolean = (value: unknown): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const getDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export class EventController {
  /**
   * Get all events
   */
  async getEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: getString(req.query.search),
        event_type: getString(req.query.event_type) as EventType | undefined,
        status: getString(req.query.status) as EventStatus | undefined,
        start_date: getDate(req.query.start_date),
        end_date: getDate(req.query.end_date),
      };

      const pagination = {
        page: getString(req.query.page) ? parseInt(req.query.page as string) : 1,
        limit: getString(req.query.limit) ? parseInt(req.query.limit as string) : 20,
        sort_by: getString(req.query.sort_by),
        sort_order: getString(req.query.sort_order) as 'asc' | 'desc' | undefined,
      };

      const result = await eventService.getEvents(filters, pagination);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventService.getEventById(req.params.id);

      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      res.json(event);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new event
   */
  async createEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventData: CreateEventDTO = req.body;
      const userId = req.user!.id;

      const event = await eventService.createEvent(eventData, userId);
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update event
   */
  async updateEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventData: UpdateEventDTO = req.body;
      const userId = req.user!.id;

      const event = await eventService.updateEvent(req.params.id, eventData, userId);
      res.json(event);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await eventService.deleteEvent(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ==================== EVENT REGISTRATIONS ====================

  /**
   * Get event registrations
   */
  async getEventRegistrations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        registration_status: getString(
          req.query.registration_status
        ) as RegistrationStatus | undefined,
        checked_in: getBoolean(req.query.checked_in),
      };

      const registrations = await eventService.getEventRegistrations(req.params.eventId, filters);
      res.json(registrations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contact registrations
   */
  async getContactRegistrations(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const registrations = await eventService.getContactRegistrations(req.params.contactId);
      res.json(registrations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register contact for event
   */
  async registerContact(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrationData: CreateRegistrationDTO = req.body;
      const registration = await eventService.registerContact(registrationData);
      res.status(201).json(registration);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update registration
   */
  async updateRegistration(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updateData: UpdateRegistrationDTO = req.body;
      const registration = await eventService.updateRegistration(
        req.params.registrationId,
        updateData
      );
      res.json(registration);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check in attendee
   */
  async checkInAttendee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await eventService.checkInAttendee(req.params.registrationId);

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await eventService.cancelRegistration(req.params.registrationId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export event as .ics calendar file
   */
  async exportCalendar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventService.getEventById(req.params.id);

      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      const icsContent = generateICS(event);

      // Set headers for file download
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${event.event_name.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`
      );

      res.send(icsContent);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get calendar links for an event (Google, Outlook, .ics download)
   */
  async getCalendarLinks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventService.getEventById(req.params.id);

      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      res.json({
        google: generateGoogleCalendarUrl(event),
        outlook: generateOutlookCalendarUrl(event),
        ics: `${baseUrl}/api/events/${event.event_id}/calendar.ics`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new EventController();
