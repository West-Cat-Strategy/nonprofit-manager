import { Router } from 'express';
import { services } from '@container/services';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  createAutomationSchema,
  createEventSchema,
  createRegistrationSchema,
  eventAutomationParamsSchema,
  eventCheckInScanSchema,
  eventMutationScopeQuerySchema,
  eventOccurrenceParamsSchema,
  eventWalkInCheckInSchema,
  eventIdParamsSchema,
  globalEventCheckInScanSchema,
  listOccurrencesQuerySchema,
  listEventRegistrationsQuerySchema,
  listEventsQuerySchema,
  listRegistrationsQuerySchema,
  sendRemindersSchema,
  syncAutomationsSchema,
  updateOccurrenceSchema,
  updateEventCheckInSettingsSchema,
  updateAutomationSchema,
  updateEventSchema,
  updateRegistrationSchema,
} from '@validations/event';
import { createEventsController } from '../controllers/events.controller';
import { EventRepository } from '../repositories/eventRepository';
import { EventCatalogUseCase } from '../usecases/eventCatalog.usecase';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import { EventRemindersUseCase } from '../usecases/reminders.usecase';

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
  eventsV2Routes.get('/occurrences', validateQuery(listOccurrencesQuerySchema), controller.getOccurrences);
  eventsV2Routes.get(
    '/occurrences/:occurrenceId',
    validateParams(eventOccurrenceParamsSchema),
    controller.getOccurrence
  );
  eventsV2Routes.patch(
    '/occurrences/:occurrenceId',
    validateParams(eventOccurrenceParamsSchema),
    validateQuery(eventMutationScopeQuerySchema),
    validateBody(updateOccurrenceSchema),
    controller.updateOccurrence
  );

  eventsV2Routes.get('/summary', controller.getSummary);
  eventsV2Routes.get('/registrations', validateQuery(listRegistrationsQuerySchema), controller.listRegistrations);
  eventsV2Routes.post('/check-in/scan', validateBody(globalEventCheckInScanSchema), controller.scanCheckInGlobal);

  eventsV2Routes.post('/', validateBody(createEventSchema), controller.createEvent);

  eventsV2Routes.post('/registrations/:id/check-in', validateParams(eventIdParamsSchema), controller.checkIn);
  eventsV2Routes.post('/registrations/:id/checkin', validateParams(eventIdParamsSchema), controller.checkIn);
  eventsV2Routes.post(
    '/registrations/:id/confirmation-email/send',
    validateParams(eventIdParamsSchema),
    controller.sendConfirmationEmail
  );
  eventsV2Routes.put(
    '/registrations/:id',
    validateParams(eventIdParamsSchema),
    validateBody(updateRegistrationSchema),
    controller.updateRegistration
  );
  eventsV2Routes.post(
    '/:id/check-in/scan',
    validateParams(eventIdParamsSchema),
    validateBody(eventCheckInScanSchema),
    controller.scanCheckIn
  );
  eventsV2Routes.delete('/registrations/:id', validateParams(eventIdParamsSchema), controller.cancelRegistration);

  eventsV2Routes.get('/:id/check-in/settings', validateParams(eventIdParamsSchema), controller.getCheckInSettings);
  eventsV2Routes.patch(
    '/:id/check-in/settings',
    validateParams(eventIdParamsSchema),
    validateBody(updateEventCheckInSettingsSchema),
    controller.updateCheckInSettings
  );
  eventsV2Routes.post('/:id/check-in/pin/rotate', validateParams(eventIdParamsSchema), controller.rotateCheckInPin);
  eventsV2Routes.post(
    '/:id/walk-ins',
    validateParams(eventIdParamsSchema),
    validateBody(eventWalkInCheckInSchema),
    controller.walkInCheckIn
  );

  eventsV2Routes.get('/:id', validateParams(eventIdParamsSchema), controller.getEvent);
  eventsV2Routes.get('/:id/calendar.ics', validateParams(eventIdParamsSchema), controller.downloadCalendarIcs);

  eventsV2Routes.put('/:id', validateParams(eventIdParamsSchema), validateBody(updateEventSchema), controller.updateEvent);

  eventsV2Routes.delete('/:id', validateParams(eventIdParamsSchema), controller.deleteEvent);

  eventsV2Routes.get(
    '/:id/registrations',
    validateParams(eventIdParamsSchema),
    validateQuery(listEventRegistrationsQuerySchema),
    controller.listRegistrations
  );

  eventsV2Routes.post(
    '/:id/register',
    validateParams(eventIdParamsSchema),
    validateBody(createRegistrationSchema),
    controller.register
  );

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
export * from './public';
