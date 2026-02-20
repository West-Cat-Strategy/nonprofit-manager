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
  sendEventReminders,
  getEventReminderAutomations,
  createEventReminderAutomation,
  updateEventReminderAutomation,
  cancelEventReminderAutomation,
  syncEventReminderAutomations,
} from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { validateRequest } from '@middleware/domains/security';

const router = Router();
const eventTypeValues = [
  'fundraiser',
  'community',
  'training',
  'meeting',
  'workshop',
  'webinar',
  'conference',
  'outreach',
  'volunteer',
  'social',
  'other',
];
const eventStatusValues = ['planned', 'active', 'completed', 'cancelled', 'postponed'];
const registrationStatusValues = ['registered', 'waitlisted', 'cancelled', 'confirmed', 'no_show'];
const recurrencePatternValues = ['daily', 'weekly', 'monthly', 'yearly'];
const reminderTimingTypeValues = ['relative', 'absolute'];

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
    query('event_type').optional().isIn(eventTypeValues),
    query('status').optional().isIn(eventStatusValues),
    query('is_public').optional().isBoolean(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('organizer_id').optional().isUUID(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort_by').optional().isIn(['start_date', 'end_date', 'created_at', 'updated_at', 'name', 'status', 'event_type']),
    query('sort_order').optional().isIn(['asc', 'desc']),
  ],
  validateRequest,
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
router.get('/:id', [param('id').isUUID()], validateRequest, getEvent);

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
      .isIn(eventTypeValues),
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
    body('status').optional().isIn(eventStatusValues),
    body('is_public').optional().isBoolean(),
    body('is_recurring').optional().isBoolean(),
    body('recurrence_pattern').optional().isIn(recurrencePatternValues),
    body('recurrence_interval').optional().isInt({ min: 1 }),
    body('recurrence_end_date').optional().isISO8601(),
  ],
  validateRequest,
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
    body('event_type').optional().isIn(eventTypeValues),
    body('status').optional().isIn(eventStatusValues),
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
    body('is_public').optional().isBoolean(),
    body('is_recurring').optional().isBoolean(),
    body('recurrence_pattern').optional().isIn(recurrencePatternValues),
    body('recurrence_interval').optional().isInt({ min: 1 }),
    body('recurrence_end_date').optional().isISO8601(),
  ],
  validateRequest,
  updateEvent
);

/**
 * DELETE /api/events/:id
 * Cancel an event
 */
router.delete('/:id', [param('id').isUUID()], validateRequest, deleteEvent);

/**
 * GET /api/events/:id/registrations
 * Get registrations for an event
 */
router.get(
  '/:id/registrations',
  [
    param('id').isUUID(),
    query('status').optional().isIn(registrationStatusValues),
    query('registration_status').optional().isIn(registrationStatusValues),
    query('checked_in').optional().isBoolean(),
  ],
  validateRequest,
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
    body('contact_id').isUUID().withMessage('Valid contact_id is required'),
    body('registration_status').optional().isIn(registrationStatusValues),
    body('notes').optional().isString(),
  ],
  validateRequest,
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
    body('registration_status').optional().isIn(registrationStatusValues),
    body('notes').optional().isString(),
  ],
  validateRequest,
  updateRegistration
);

/**
 * POST /api/events/registrations/:id/checkin
 * Check in an attendee
 */
router.post(
  '/registrations/:id/check-in',
  [param('id').isUUID()],
  validateRequest,
  checkInAttendee
);

router.post(
  '/registrations/:id/checkin',
  [param('id').isUUID()],
  validateRequest,
  checkInAttendee
);

/**
 * DELETE /api/events/registrations/:id
 * Cancel a registration
 */
router.delete(
  '/registrations/:id',
  [param('id').isUUID()],
  validateRequest,
  cancelRegistration
);

/**
 * GET /api/events/:id/attendance
 * Get attendance statistics
 */
router.get(
  '/:id/attendance',
  [param('id').isUUID()],
  validateRequest,
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
    query('status').optional().isIn(registrationStatusValues),
    query('registration_status').optional().isIn(registrationStatusValues),
    query('checked_in').optional().isBoolean(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
  ],
  validateRequest,
  getRegistrations
);

/**
 * POST /api/events/:id/reminders/send
 * Send reminders to event registrants via configured channels.
 */
router.post(
  '/:id/reminders/send',
  [
    param('id').isUUID(),
    body('sendEmail').optional().isBoolean(),
    body('sendSms').optional().isBoolean(),
    body('customMessage').optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  sendEventReminders
);

/**
 * GET /api/events/:id/reminder-automations
 * List reminder automations for an event.
 */
router.get(
  '/:id/reminder-automations',
  [param('id').isUUID()],
  validateRequest,
  getEventReminderAutomations
);

/**
 * POST /api/events/:id/reminder-automations
 * Create a reminder automation for an event.
 */
router.post(
  '/:id/reminder-automations',
  [
    param('id').isUUID(),
    body('timingType').isIn(reminderTimingTypeValues),
    body('relativeMinutesBefore').optional().isInt({ min: 1 }),
    body('absoluteSendAt').optional().isISO8601(),
    body('sendEmail').optional().isBoolean(),
    body('sendSms').optional().isBoolean(),
    body('customMessage').optional().isString().isLength({ max: 500 }),
    body('timezone').optional().isString().isLength({ min: 1, max: 64 }),
  ],
  validateRequest,
  createEventReminderAutomation
);

/**
 * PATCH /api/events/:id/reminder-automations/:automationId
 * Update a pending reminder automation.
 */
router.patch(
  '/:id/reminder-automations/:automationId',
  [
    param('id').isUUID(),
    param('automationId').isUUID(),
    body('timingType').optional().isIn(reminderTimingTypeValues),
    body('relativeMinutesBefore').optional().isInt({ min: 1 }),
    body('absoluteSendAt').optional().isISO8601(),
    body('sendEmail').optional().isBoolean(),
    body('sendSms').optional().isBoolean(),
    body('customMessage').optional().isString().isLength({ max: 500 }),
    body('timezone').optional().isString().isLength({ min: 1, max: 64 }),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  updateEventReminderAutomation
);

/**
 * POST /api/events/:id/reminder-automations/:automationId/cancel
 * Cancel a pending reminder automation.
 */
router.post(
  '/:id/reminder-automations/:automationId/cancel',
  [param('id').isUUID(), param('automationId').isUUID()],
  validateRequest,
  cancelEventReminderAutomation
);

/**
 * PUT /api/events/:id/reminder-automations/sync
 * Replace all pending reminder automations for this event.
 */
router.put(
  '/:id/reminder-automations/sync',
  [
    param('id').isUUID(),
    body('items').isArray(),
    body('items.*.timingType').isIn(reminderTimingTypeValues),
    body('items.*.relativeMinutesBefore').optional().isInt({ min: 1 }),
    body('items.*.absoluteSendAt').optional().isISO8601(),
    body('items.*.sendEmail').optional().isBoolean(),
    body('items.*.sendSms').optional().isBoolean(),
    body('items.*.customMessage').optional().isString().isLength({ max: 500 }),
    body('items.*.timezone').optional().isString().isLength({ min: 1, max: 64 }),
  ],
  validateRequest,
  syncEventReminderAutomations
);

export default router;
