/**
 * Event Routes
 * API routes for event scheduling and registration
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getEvents,
  getEventAttendanceSummary,
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
import { loadDataScope } from '../middleware/dataScope';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(loadDataScope('events'));

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
  handleValidationErrors,
  getEvents
);

/**
 * GET /api/events/summary
 * Get event attendance summary for dashboards
 */
router.get('/summary', getEventAttendanceSummary);

/**
 * GET /api/events/:id
 * Get a single event
 */
router.get('/:id', [param('id').isUUID()], handleValidationErrors, getEvent);

/**
 * POST /api/events
 * Create a new event
 */
router.post(
  '/',
  [
    body('event_name').isString().trim().notEmpty().withMessage('Event name is required'),
    body('description').optional().isString(),
    body('event_type')
      .isString()
      .trim()
      .notEmpty(),
    body('start_date').isISO8601().withMessage('Valid start date is required'),
    body('end_date').isISO8601().withMessage('Valid end date is required'),
    body('location_name').optional().isString(),
    body('address_line1').optional().isString(),
    body('address_line2').optional().isString(),
    body('city').optional().isString(),
    body('state_province').optional().isString(),
    body('postal_code').optional().isString(),
    body('country').optional().isString(),
    body('capacity').optional().isInt({ min: 1 }),
    body('status').optional().isString(),
  ],
  handleValidationErrors,
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
    body('event_name').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('event_type').optional().isString(),
    body('status').optional().isString(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('location_name').optional().isString(),
    body('address_line1').optional().isString(),
    body('address_line2').optional().isString(),
    body('city').optional().isString(),
    body('state_province').optional().isString(),
    body('postal_code').optional().isString(),
    body('country').optional().isString(),
    body('capacity').optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  updateEvent
);

/**
 * DELETE /api/events/:id
 * Cancel an event
 */
router.delete('/:id', [param('id').isUUID()], handleValidationErrors, deleteEvent);

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
  handleValidationErrors,
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
  handleValidationErrors,
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
  handleValidationErrors,
  updateRegistration
);

/**
 * POST /api/events/registrations/:id/checkin
 * Check in an attendee
 */
router.post(
  '/registrations/:id/checkin',
  [param('id').isUUID()],
  handleValidationErrors,
  checkInAttendee
);

/**
 * DELETE /api/events/registrations/:id
 * Cancel a registration
 */
router.delete(
  '/registrations/:id',
  [param('id').isUUID()],
  handleValidationErrors,
  cancelRegistration
);

/**
 * GET /api/events/:id/attendance
 * Get attendance statistics
 */
router.get(
  '/:id/attendance',
  [param('id').isUUID()],
  handleValidationErrors,
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
  handleValidationErrors,
  getRegistrations
);

export default router;
