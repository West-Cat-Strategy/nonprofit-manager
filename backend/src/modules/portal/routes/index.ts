import { Router } from 'express';
import type { Pool } from 'pg';
import pool from '@config/database';
import { authenticatePortal } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  portalAppointmentParamsSchema,
  portalBookSlotSchema,
  portalChangePasswordSchema,
  portalEventParamsSchema,
  portalManualAppointmentRequestSchema,
  portalPointpersonQuerySchema,
  portalProfileUpdateSchema,
  portalRelationshipCreateSchema,
  portalRelationshipUpdateSchema,
  portalSlotParamsSchema,
  portalSlotQuerySchema,
  portalThreadCreateSchema,
  portalThreadMessageSchema,
  portalThreadParamsSchema,
  portalThreadUpdateSchema,
  portalUuidParamsSchema,
} from '@validations/portal';
import { createPortalAppointmentsAdapter } from '../adapters/portalAppointmentsAdapter';
import { createPortalMessagingAdapter } from '../adapters/portalMessagingAdapter';
import { createPortalAppointmentsController } from '../controllers/appointments.controller';
import { createPortalEventsController } from '../controllers/events.controller';
import { createPortalMessagingController } from '../controllers/messaging.controller';
import { createPortalProfileController } from '../controllers/profile.controller';
import { createPortalRelationshipsController } from '../controllers/relationships.controller';
import { createPortalResourcesController } from '../controllers/resources.controller';
import { PortalRepository } from '../repositories/portalRepository';
import { PortalAppointmentsUseCase } from '../usecases/appointmentsUseCase';
import { PortalEventsUseCase } from '../usecases/eventsUseCase';
import { PortalMessagingUseCase } from '../usecases/messagingUseCase';
import { PortalProfileUseCase } from '../usecases/profileUseCase';
import { PortalResourcesUseCase } from '../usecases/resourcesUseCase';
import { PortalRelationshipsUseCase } from '../usecases/relationshipsUseCase';
import type { PortalAppointmentsPort, PortalMessagingPort } from '../types/ports';

interface PortalRouteDependencies {
  pool?: Pool;
  messagingPort?: PortalMessagingPort;
  appointmentsPort?: PortalAppointmentsPort;
}

export const createPortalV2Routes = (deps: PortalRouteDependencies = {}): Router => {
  const repository = new PortalRepository(deps.pool ?? pool);
  const profileController = createPortalProfileController(new PortalProfileUseCase(repository));
  const messagingController = createPortalMessagingController(
    new PortalMessagingUseCase(deps.messagingPort ?? createPortalMessagingAdapter())
  );
  const appointmentsController = createPortalAppointmentsController(
    new PortalAppointmentsUseCase(deps.appointmentsPort ?? createPortalAppointmentsAdapter())
  );
  const eventsController = createPortalEventsController(new PortalEventsUseCase(repository));
  const resourcesController = createPortalResourcesController(new PortalResourcesUseCase(repository));
  const relationshipsController = createPortalRelationshipsController(
    new PortalRelationshipsUseCase(repository)
  );
  const portalV2Routes = Router();

  portalV2Routes.use(authenticatePortal);

  portalV2Routes.get('/profile', profileController.getProfile);
  portalV2Routes.patch('/profile', validateBody(portalProfileUpdateSchema), profileController.updateProfile);
  portalV2Routes.post('/change-password', validateBody(portalChangePasswordSchema), profileController.changePassword);

  portalV2Routes.get(
    '/pointperson/context',
    validateQuery(portalPointpersonQuerySchema),
    relationshipsController.getPointpersonContext
  );

  portalV2Routes.get('/relationships', relationshipsController.getRelationships);
  portalV2Routes.post(
    '/relationships',
    validateBody(portalRelationshipCreateSchema),
    relationshipsController.createRelationship
  );
  portalV2Routes.put(
    '/relationships/:id',
    validateParams(portalUuidParamsSchema),
    validateBody(portalRelationshipUpdateSchema),
    relationshipsController.updateRelationship
  );
  portalV2Routes.delete(
    '/relationships/:id',
    validateParams(portalUuidParamsSchema),
    relationshipsController.deleteRelationship
  );

  portalV2Routes.get('/messages/threads', messagingController.getThreads);
  portalV2Routes.post('/messages/threads', validateBody(portalThreadCreateSchema), messagingController.createThread);
  portalV2Routes.get('/messages/threads/:threadId', validateParams(portalThreadParamsSchema), messagingController.getThread);
  portalV2Routes.post(
    '/messages/threads/:threadId/messages',
    validateParams(portalThreadParamsSchema),
    validateBody(portalThreadMessageSchema),
    messagingController.reply
  );
  portalV2Routes.post('/messages/threads/:threadId/read', validateParams(portalThreadParamsSchema), messagingController.markRead);
  portalV2Routes.patch(
    '/messages/threads/:threadId',
    validateParams(portalThreadParamsSchema),
    validateBody(portalThreadUpdateSchema),
    messagingController.updateThread
  );

  portalV2Routes.get('/events', eventsController.getEvents);
  portalV2Routes.post('/events/:eventId/register', validateParams(portalEventParamsSchema), eventsController.register);
  portalV2Routes.delete('/events/:eventId/register', validateParams(portalEventParamsSchema), eventsController.cancel);

  portalV2Routes.get('/appointments', appointmentsController.getAppointments);
  portalV2Routes.get('/appointments/slots', validateQuery(portalSlotQuerySchema), appointmentsController.getSlots);
  portalV2Routes.post(
    '/appointments/slots/:slotId/book',
    validateParams(portalSlotParamsSchema),
    validateBody(portalBookSlotSchema),
    appointmentsController.bookSlot
  );
  portalV2Routes.post('/appointments/requests', validateBody(portalManualAppointmentRequestSchema), appointmentsController.createRequest);
  portalV2Routes.patch('/appointments/:id/cancel', validateParams(portalAppointmentParamsSchema), appointmentsController.cancelAppointment);

  portalV2Routes.get('/documents', resourcesController.getDocuments);
  portalV2Routes.get('/documents/:id/download', validateParams(portalUuidParamsSchema), resourcesController.downloadDocument);
  portalV2Routes.get('/forms', resourcesController.getForms);
  portalV2Routes.get('/notes', resourcesController.getNotes);
  portalV2Routes.get('/reminders', resourcesController.getReminders);

  return portalV2Routes;
};

export const portalV2Routes = createPortalV2Routes();
