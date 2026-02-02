/**
 * Event Routes
 * API endpoints for event management
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import eventController from '../controllers/eventController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validation rules
const createEventValidation = [
  body('event_name').trim().notEmpty().withMessage('Event name is required'),
  body('event_type')
    .isIn(['fundraiser', 'community', 'training', 'meeting', 'volunteer', 'social', 'other'])
    .withMessage('Invalid event type'),
  body('status')
    .optional()
    .isIn(['planned', 'active', 'completed', 'cancelled', 'postponed'])
    .withMessage('Invalid status'),
  body('start_date').isISO8601().withMessage('Invalid start date'),
  body('end_date').isISO8601().withMessage('Invalid end date'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
];

const updateEventValidation = [
  body('event_name').optional().trim().notEmpty().withMessage('Event name cannot be empty'),
  body('event_type')
    .optional()
    .isIn(['fundraiser', 'community', 'training', 'meeting', 'volunteer', 'social', 'other'])
    .withMessage('Invalid event type'),
  body('status')
    .optional()
    .isIn(['planned', 'active', 'completed', 'cancelled', 'postponed'])
    .withMessage('Invalid status'),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
];

const createRegistrationValidation = [
  body('event_id').isUUID().withMessage('Invalid event ID'),
  body('contact_id').isUUID().withMessage('Invalid contact ID'),
  body('registration_status')
    .optional()
    .isIn(['registered', 'waitlisted', 'cancelled', 'confirmed', 'no_show'])
    .withMessage('Invalid registration status'),
];

const updateRegistrationValidation = [
  body('registration_status')
    .optional()
    .isIn(['registered', 'waitlisted', 'cancelled', 'confirmed', 'no_show'])
    .withMessage('Invalid registration status'),
];

const eventQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('event_type')
    .optional()
    .isIn(['fundraiser', 'community', 'training', 'meeting', 'volunteer', 'social', 'other'])
    .withMessage('Invalid event type'),
  query('status')
    .optional()
    .isIn(['planned', 'active', 'completed', 'cancelled', 'postponed'])
    .withMessage('Invalid status'),
];

// Event routes
router.get('/', authenticate, eventQueryValidation, eventController.getEvents);
router.get('/:id', authenticate, eventController.getEventById);
router.post('/', authenticate, createEventValidation, eventController.createEvent);
router.put('/:id', authenticate, updateEventValidation, eventController.updateEvent);
router.delete('/:id', authenticate, eventController.deleteEvent);

// Calendar export routes
router.get('/:id/calendar.ics', authenticate, eventController.exportCalendar);
router.get('/:id/calendar-links', authenticate, eventController.getCalendarLinks);

// Registration routes
router.get('/:eventId/registrations', authenticate, eventController.getEventRegistrations);
router.post(
  '/registrations',
  authenticate,
  createRegistrationValidation,
  eventController.registerContact
);
router.put(
  '/registrations/:registrationId',
  authenticate,
  updateRegistrationValidation,
  eventController.updateRegistration
);
router.post(
  '/registrations/:registrationId/check-in',
  authenticate,
  eventController.checkInAttendee
);
router.delete('/registrations/:registrationId', authenticate, eventController.cancelRegistration);

// Contact registrations
router.get(
  '/contacts/:contactId/registrations',
  authenticate,
  eventController.getContactRegistrations
);

export default router;
