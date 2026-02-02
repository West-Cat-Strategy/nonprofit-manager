/**
 * Event Routes
 * API routes for event scheduling and registration
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
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
} from '../controllers/eventController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/events
 * Get all events with optional filtering
 */
router.get(
  '/',
  [
    query('event_type').optional().isString(),
    query('status').optional().isString(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('organizer_id').optional().isUUID(),
    query('search').optional().isString(),
  ],
  getEvents
);

/**
 * GET /api/events/:id
 * Get a single event
 */
router.get('/:id', [param('id').isUUID()], getEvent);

/**
 * POST /api/events
 * Create a new event
 */
router.post(
  '/',
  [
    body('name').isString().trim().notEmpty().withMessage('Event name is required'),
    body('description').optional().isString(),
    body('event_type').isString().isIn([
      'fundraiser',
      'volunteer_opportunity',
      'community_event',
      'training',
      'meeting',
      'workshop',
      'conference',
      'social',
      'other',
    ]).withMessage('Invalid event type'),
    body('start_date').isISO8601().withMessage('Valid start date is required'),
    body('end_date').optional().isISO8601(),
    body('location').optional().isString(),
    body('capacity').optional().isInt({ min: 1 }),
    body('registration_required').isBoolean(),
    body('registration_deadline').optional().isISO8601(),
    body('status').optional().isIn(['draft', 'published', 'cancelled', 'completed']),
    body('organizer_id').optional().isUUID(),
  ],
  createEvent
);

/**
 * PUT /api/events/:id
 * Update an event
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('event_type').optional().isString(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('location').optional().isString(),
    body('capacity').optional().isInt({ min: 1 }),
    body('registration_required').optional().isBoolean(),
    body('registration_deadline').optional().isISO8601(),
    body('status').optional().isString(),
    body('organizer_id').optional().isUUID(),
  ],
  updateEvent
);

/**
 * DELETE /api/events/:id
 * Cancel an event
 */
router.delete('/:id', [param('id').isUUID()], deleteEvent);

/**
 * GET /api/events/:id/registrations
 * Get registrations for an event
 */
router.get(
  '/:id/registrations',
  [
    param('id').isUUID(),
    query('status').optional().isString(),
  ],
  getEventRegistrations
);

/**
 * POST /api/events/:id/register
 * Register for an event
 */
router.post(
  '/:id/register',
  [
    param('id').isUUID(),
    body('contact_id').optional().isUUID(),
    body('attendee_name').isString().trim().notEmpty().withMessage('Attendee name is required'),
    body('attendee_email').isEmail().withMessage('Valid email is required'),
    body('attendee_phone').optional().isString(),
    body('notes').optional().isString(),
  ],
  registerForEvent
);

/**
 * PUT /api/events/registrations/:id
 * Update a registration
 */
router.put(
  '/registrations/:id',
  [
    param('id').isUUID(),
    body('status').optional().isIn(['registered', 'confirmed', 'attended', 'no_show', 'cancelled']),
    body('notes').optional().isString(),
    body('attendee_name').optional().isString(),
    body('attendee_email').optional().isEmail(),
    body('attendee_phone').optional().isString(),
  ],
  updateRegistration
);

/**
 * POST /api/events/registrations/:id/checkin
 * Check in an attendee
 */
router.post(
  '/registrations/:id/checkin',
  [param('id').isUUID()],
  checkInAttendee
);

/**
 * DELETE /api/events/registrations/:id
 * Cancel a registration
 */
router.delete(
  '/registrations/:id',
  [param('id').isUUID()],
  cancelRegistration
);

/**
 * GET /api/events/:id/attendance
 * Get attendance statistics
 */
router.get(
  '/:id/attendance',
  [param('id').isUUID()],
  getAttendanceStats
);

/**
 * GET /api/events/registrations
 * Get all registrations with filtering
 */
router.get(
  '/registrations',
  [
    query('event_id').optional().isUUID(),
    query('contact_id').optional().isUUID(),
    query('status').optional().isString(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
  ],
  getRegistrations
);

export default router;
