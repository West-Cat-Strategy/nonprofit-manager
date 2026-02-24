import { Router } from 'express';
import { z } from 'zod';
import { services } from '@container/services';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
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
] as const;
const eventStatusValues = ['planned', 'active', 'completed', 'cancelled', 'postponed'] as const;
const registrationStatusValues = ['registered', 'waitlisted', 'cancelled', 'confirmed', 'no_show'] as const;
const recurrencePatternValues = ['daily', 'weekly', 'monthly', 'yearly'] as const;
const reminderTimingTypeValues = ['relative', 'absolute'] as const;

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO8601 date');

const eventIdParamsSchema = z.object({
  id: uuidSchema,
});

const eventAutomationParamsSchema = z.object({
  id: uuidSchema,
  automationId: uuidSchema,
});

const listEventsQuerySchema = z.object({
  event_type: z.enum(eventTypeValues).optional(),
  status: z.enum(eventStatusValues).optional(),
  is_public: z.coerce.boolean().optional(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort_by: z
    .enum(['start_date', 'end_date', 'created_at', 'updated_at', 'name', 'status', 'event_type'])
    .optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

const createEventSchema = z.object({
  event_name: z.string().trim().min(1),
  description: z.string().optional(),
  event_type: z.enum(eventTypeValues),
  start_date: dateStringSchema,
  end_date: dateStringSchema,
  location_name: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  status: z.enum(eventStatusValues).optional(),
  is_public: z.coerce.boolean().optional(),
  is_recurring: z.coerce.boolean().optional(),
  recurrence_pattern: z.enum(recurrencePatternValues).optional(),
  recurrence_interval: z.coerce.number().int().min(1).optional(),
  recurrence_end_date: dateStringSchema.optional(),
});

const updateEventSchema = z.object({
  event_name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  event_type: z.enum(eventTypeValues).optional(),
  status: z.enum(eventStatusValues).optional(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  location_name: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  is_public: z.coerce.boolean().optional(),
  is_recurring: z.coerce.boolean().optional(),
  recurrence_pattern: z.enum(recurrencePatternValues).optional(),
  recurrence_interval: z.coerce.number().int().min(1).optional(),
  recurrence_end_date: dateStringSchema.optional(),
});

const listEventRegistrationsQuerySchema = z.object({
  status: z.enum(registrationStatusValues).optional(),
  registration_status: z.enum(registrationStatusValues).optional(),
  checked_in: z.coerce.boolean().optional(),
});

const listRegistrationsQuerySchema = z.object({
  event_id: uuidSchema.optional(),
  contact_id: uuidSchema.optional(),
  status: z.enum(registrationStatusValues).optional(),
  registration_status: z.enum(registrationStatusValues).optional(),
  checked_in: z.coerce.boolean().optional(),
});

const createRegistrationSchema = z.object({
  contact_id: uuidSchema,
  registration_status: z.enum(registrationStatusValues).optional(),
  notes: z.string().optional(),
});

const updateRegistrationSchema = z.object({
  registration_status: z.enum(registrationStatusValues).optional(),
  notes: z.string().optional(),
});

const sendRemindersSchema = z.object({
  sendEmail: z.coerce.boolean().optional(),
  sendSms: z.coerce.boolean().optional(),
  customMessage: z.string().max(500).optional(),
});

const createAutomationSchema = z.object({
  timingType: z.enum(reminderTimingTypeValues),
  relativeMinutesBefore: z.coerce.number().int().min(1).optional(),
  absoluteSendAt: dateStringSchema.optional(),
  sendEmail: z.coerce.boolean().optional(),
  sendSms: z.coerce.boolean().optional(),
  customMessage: z.string().max(500).optional(),
  timezone: z.string().min(1).max(64).optional(),
});

const updateAutomationSchema = z.object({
  timingType: z.enum(reminderTimingTypeValues).optional(),
  relativeMinutesBefore: z.coerce.number().int().min(1).optional(),
  absoluteSendAt: dateStringSchema.optional(),
  sendEmail: z.coerce.boolean().optional(),
  sendSms: z.coerce.boolean().optional(),
  customMessage: z.string().max(500).optional(),
  timezone: z.string().min(1).max(64).optional(),
  isActive: z.coerce.boolean().optional(),
});

const syncAutomationsSchema = z.object({
  items: z.array(
    z.object({
      timingType: z.enum(reminderTimingTypeValues),
      relativeMinutesBefore: z.coerce.number().int().min(1).optional(),
      absoluteSendAt: dateStringSchema.optional(),
      sendEmail: z.coerce.boolean().optional(),
      sendSms: z.coerce.boolean().optional(),
      customMessage: z.string().max(500).optional(),
      timezone: z.string().min(1).max(64).optional(),
    })
  ),
});

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

  eventsV2Routes.get('/', validateQuery(listEventsQuerySchema), controller.getEvents);

  eventsV2Routes.get('/summary', controller.getSummary);
  eventsV2Routes.get('/:id', validateParams(eventIdParamsSchema), controller.getEvent);

  eventsV2Routes.post('/', validateBody(createEventSchema), controller.createEvent);

  eventsV2Routes.put('/:id', validateParams(eventIdParamsSchema), validateBody(updateEventSchema), controller.updateEvent);

  eventsV2Routes.delete('/:id', validateParams(eventIdParamsSchema), controller.deleteEvent);

  eventsV2Routes.get(
    '/:id/registrations',
    validateParams(eventIdParamsSchema),
    validateQuery(listEventRegistrationsQuerySchema),
    controller.listRegistrations
  );

  eventsV2Routes.get('/registrations', validateQuery(listRegistrationsQuerySchema), controller.listRegistrations);

  eventsV2Routes.post('/:id/register', validateParams(eventIdParamsSchema), validateBody(createRegistrationSchema), controller.register);

  eventsV2Routes.put('/registrations/:id', validateParams(eventIdParamsSchema), validateBody(updateRegistrationSchema), controller.updateRegistration);

  eventsV2Routes.post('/registrations/:id/check-in', validateParams(eventIdParamsSchema), controller.checkIn);
  eventsV2Routes.post('/registrations/:id/checkin', validateParams(eventIdParamsSchema), controller.checkIn);
  eventsV2Routes.delete('/registrations/:id', validateParams(eventIdParamsSchema), controller.cancelRegistration);

  eventsV2Routes.post('/:id/reminders/send', validateParams(eventIdParamsSchema), validateBody(sendRemindersSchema), controller.sendReminders);

  eventsV2Routes.get('/:id/reminder-automations', validateParams(eventIdParamsSchema), controller.listAutomations);

  eventsV2Routes.post(
    '/:id/reminder-automations',
    validateParams(eventIdParamsSchema),
    validateBody(createAutomationSchema),
    controller.createAutomation
  );

  eventsV2Routes.patch(
    '/:id/reminder-automations/:automationId',
    validateParams(eventAutomationParamsSchema),
    validateBody(updateAutomationSchema),
    controller.updateAutomation
  );

  eventsV2Routes.post(
    '/:id/reminder-automations/:automationId/cancel',
    validateParams(eventAutomationParamsSchema),
    controller.cancelAutomation
  );

  eventsV2Routes.put(
    '/:id/reminder-automations/sync',
    validateParams(eventIdParamsSchema),
    validateBody(syncAutomationsSchema),
    controller.syncAutomations
  );

  return eventsV2Routes;
};

export const eventsV2Routes = createEventsV2Routes();
