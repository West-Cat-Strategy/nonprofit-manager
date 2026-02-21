import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { services } from '@container/services';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { validateRequest } from '@middleware/domains/security';
import { createEventsController } from '../controllers/events.controller';
import { EventRepository } from '../repositories/eventRepository';
import { EventCatalogUseCase } from '../usecases/eventCatalog.usecase';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import { EventRemindersUseCase } from '../usecases/reminders.usecase';

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

export const createEventsV2Routes = (): Router => {
  const repository = new EventRepository(services.event);
  const controller = createEventsController(
    new EventCatalogUseCase(repository),
    new EventRegistrationUseCase(repository),
    new EventRemindersUseCase(repository)
  );
  const eventsV2Routes = Router();

  eventsV2Routes.use(authenticate);
  eventsV2Routes.use(loadDataScope('events'));

  eventsV2Routes.get(
  '/',
  [
    query('event_type').optional().isIn(eventTypeValues),
    query('status').optional().isIn(eventStatusValues),
    query('is_public').optional().isBoolean(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort_by').optional().isIn(['start_date', 'end_date', 'created_at', 'updated_at', 'name', 'status', 'event_type']),
    query('sort_order').optional().isIn(['asc', 'desc']),
  ],
  validateRequest,
  controller.getEvents
);

  eventsV2Routes.get('/summary', controller.getSummary);
  eventsV2Routes.get('/:id', [param('id').isUUID()], validateRequest, controller.getEvent);

  eventsV2Routes.post(
  '/',
  [
    body('event_name').isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('event_type').isIn(eventTypeValues),
    body('start_date').isISO8601(),
    body('end_date').isISO8601(),
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
  controller.createEvent
);

  eventsV2Routes.put(
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
  controller.updateEvent
);

  eventsV2Routes.delete('/:id', [param('id').isUUID()], validateRequest, controller.deleteEvent);

  eventsV2Routes.get(
  '/:id/registrations',
  [
    param('id').isUUID(),
    query('status').optional().isIn(registrationStatusValues),
    query('registration_status').optional().isIn(registrationStatusValues),
    query('checked_in').optional().isBoolean(),
  ],
  validateRequest,
  controller.listRegistrations
);

  eventsV2Routes.get(
  '/registrations',
  [
    query('event_id').optional().isUUID(),
    query('contact_id').optional().isUUID(),
    query('status').optional().isIn(registrationStatusValues),
    query('registration_status').optional().isIn(registrationStatusValues),
    query('checked_in').optional().isBoolean(),
  ],
  validateRequest,
  controller.listRegistrations
);

  eventsV2Routes.post(
  '/:id/register',
  [
    param('id').isUUID(),
    body('contact_id').isUUID(),
    body('registration_status').optional().isIn(registrationStatusValues),
    body('notes').optional().isString(),
  ],
  validateRequest,
  controller.register
);

  eventsV2Routes.put(
  '/registrations/:id',
  [
    param('id').isUUID(),
    body('registration_status').optional().isIn(registrationStatusValues),
    body('notes').optional().isString(),
  ],
  validateRequest,
  controller.updateRegistration
);

  eventsV2Routes.post('/registrations/:id/check-in', [param('id').isUUID()], validateRequest, controller.checkIn);
  eventsV2Routes.post('/registrations/:id/checkin', [param('id').isUUID()], validateRequest, controller.checkIn);
  eventsV2Routes.delete('/registrations/:id', [param('id').isUUID()], validateRequest, controller.cancelRegistration);

  eventsV2Routes.post(
  '/:id/reminders/send',
  [
    param('id').isUUID(),
    body('sendEmail').optional().isBoolean(),
    body('sendSms').optional().isBoolean(),
    body('customMessage').optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  controller.sendReminders
);

  eventsV2Routes.get('/:id/reminder-automations', [param('id').isUUID()], validateRequest, controller.listAutomations);

  eventsV2Routes.post(
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
  controller.createAutomation
);

  eventsV2Routes.patch(
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
  controller.updateAutomation
);

  eventsV2Routes.post(
  '/:id/reminder-automations/:automationId/cancel',
  [param('id').isUUID(), param('automationId').isUUID()],
  validateRequest,
  controller.cancelAutomation
);

  eventsV2Routes.put(
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
    controller.syncAutomations
  );

  return eventsV2Routes;
};

export const eventsV2Routes = createEventsV2Routes();
