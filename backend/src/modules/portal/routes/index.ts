import { Router } from 'express';
import type { Pool } from 'pg';
import pool from '@config/database';
import { authenticatePortal } from '@middleware/domains/auth';
import type { PortalAuthRequest } from '@middleware/portalAuth';
import { handleMulterError, documentUpload } from '@middleware/domains/platform';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  portalAppointmentParamsSchema,
  portalAppointmentsQuerySchema,
  portalBookSlotSchema,
  portalCaseDocumentUploadSchema,
  portalCaseEscalationSchema,
  portalCaseDocumentDownloadParamsSchema,
  portalCaseParamsSchema,
  portalCaseTimelineQuerySchema,
  portalChangePasswordSchema,
  portalDocumentsQuerySchema,
  portalEventParamsSchema,
  portalEventsQuerySchema,
  portalManualAppointmentRequestSchema,
  portalNotesQuerySchema,
  portalPointpersonQuerySchema,
  portalProfileUpdateSchema,
  portalRealtimeStreamQuerySchema,
  portalRemindersQuerySchema,
  portalRelationshipCreateSchema,
  portalRelationshipUpdateSchema,
  portalSlotParamsSchema,
  portalSlotQuerySchema,
  portalThreadsQuerySchema,
  portalThreadCreateSchema,
  portalThreadMessageSchema,
  portalThreadParamsSchema,
  portalThreadUpdateSchema,
  portalUuidParamsSchema,
} from '@validations/portal';
import { createPortalAppointmentsAdapter } from '../adapters/portalAppointmentsAdapter';
import { createPortalMessagingAdapter } from '../adapters/portalMessagingAdapter';
import { createPortalAppointmentsController } from '../controllers/appointments.controller';
import { createPortalCasesController } from '../controllers/cases.controller';
import { createPortalDashboardController } from '../controllers/dashboard.controller';
import { createPortalEventsController } from '../controllers/events.controller';
import { createPortalMessagingController } from '../controllers/messaging.controller';
import { createPortalProfileController } from '../controllers/profile.controller';
import { createPortalRealtimeController } from '../controllers/realtime.controller';
import { createPortalRelationshipsController } from '../controllers/relationships.controller';
import { createPortalResourcesController } from '../controllers/resources.controller';
import { PortalRepository } from '../repositories/portalRepository';
import { CaseFormsRepository } from '@modules/cases/repositories/caseFormsRepository';
import { PortalAppointmentsUseCase } from '../usecases/appointmentsUseCase';
import { PortalCasesUseCase } from '../usecases/casesUseCase';
import { PortalDashboardUseCase } from '../usecases/dashboardUseCase';
import { PortalEventsUseCase } from '../usecases/eventsUseCase';
import { PortalMessagingUseCase } from '../usecases/messagingUseCase';
import { PortalProfileUseCase } from '../usecases/profileUseCase';
import { PortalResourcesUseCase } from '../usecases/resourcesUseCase';
import { PortalRelationshipsUseCase } from '../usecases/relationshipsUseCase';
import { CaseFormsUseCase } from '@modules/cases/usecases/caseForms.usecase';
import type { PortalAppointmentsPort, PortalMessagingPort } from '../types/ports';
import { createPortalFormsController } from '../controllers/forms.controller';
import { ensureCaseIsPortalAccessible } from '@services/portalPointpersonService';
import { createPortalEscalation } from '@services/portalEscalationService';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import {
  caseFormAssetUploadSchema,
  caseFormDraftSchema,
  caseFormListQuerySchema,
  caseFormPortalParamsSchema,
  caseFormSubmitSchema,
} from '@validations/caseForms';

interface PortalRouteDependencies {
  pool?: Pool;
  messagingPort?: PortalMessagingPort;
  appointmentsPort?: PortalAppointmentsPort;
}

export const createPortalV2Routes = (deps: PortalRouteDependencies = {}): Router => {
  const repository = new PortalRepository(deps.pool ?? pool);
  const dashboardController = createPortalDashboardController(new PortalDashboardUseCase(repository));
  const profileController = createPortalProfileController(new PortalProfileUseCase(repository));
  const casesController = createPortalCasesController(new PortalCasesUseCase(repository));
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
  const formsController = createPortalFormsController(
    new CaseFormsUseCase(new CaseFormsRepository(deps.pool ?? pool))
  );
  const realtimeController = createPortalRealtimeController();
  const portalV2Routes = Router();

  portalV2Routes.use(authenticatePortal);
  portalV2Routes.get('/stream', validateQuery(portalRealtimeStreamQuerySchema), realtimeController.stream);
  portalV2Routes.get('/dashboard', dashboardController.getDashboard);

  portalV2Routes.get('/profile', profileController.getProfile);
  portalV2Routes.patch('/profile', validateBody(portalProfileUpdateSchema), profileController.updateProfile);
  portalV2Routes.post('/change-password', validateBody(portalChangePasswordSchema), profileController.changePassword);

  portalV2Routes.get(
    '/pointperson/context',
    validateQuery(portalPointpersonQuerySchema),
    relationshipsController.getPointpersonContext
  );

  portalV2Routes.get('/cases', casesController.listCases);
  portalV2Routes.get('/cases/:id', validateParams(portalCaseParamsSchema), casesController.getCaseById);
  portalV2Routes.post(
    '/cases/:id/escalations',
    validateParams(portalCaseParamsSchema),
    validateBody(portalCaseEscalationSchema),
    async (req: PortalAuthRequest, res, next) => {
      try {
        const contactId = req.portalUser?.contactId;
        if (!contactId || !req.portalUser?.id) {
          sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
          return;
        }

        const portalCase = await ensureCaseIsPortalAccessible(contactId, req.params.id);
        if (!portalCase) {
          sendError(res, 'CASE_NOT_FOUND', 'Case not found', 404);
          return;
        }

        const body = req.body as {
          category?: string;
          reason: string;
          severity?: 'low' | 'normal' | 'high' | 'urgent';
          sensitivity?: 'standard' | 'sensitive';
        };
        const escalation = await createPortalEscalation({
          caseId: req.params.id,
          accountId: portalCase.account_id,
          contactId,
          portalUserId: req.portalUser.id,
          createdByPortalUserId: req.portalUser.id,
          category: body.category,
          reason: body.reason,
          severity: body.severity,
          sensitivity: body.sensitivity,
          assigneeUserId: portalCase.assigned_to,
          createdBy: null,
        });

        sendSuccess(res, escalation, 201);
      } catch (error) {
        next(error);
      }
    }
  );
  portalV2Routes.get(
    '/cases/:id/timeline',
    validateParams(portalCaseParamsSchema),
    validateQuery(portalCaseTimelineQuerySchema),
    casesController.getCaseTimeline
  );
  portalV2Routes.get('/cases/:id/documents', validateParams(portalCaseParamsSchema), casesController.getCaseDocuments);
  portalV2Routes.post(
    '/cases/:id/documents',
    validateParams(portalCaseParamsSchema),
    documentUpload.single('file'),
    handleMulterError,
    validateBody(portalCaseDocumentUploadSchema),
    casesController.uploadCaseDocument
  );
  portalV2Routes.get(
    '/cases/:id/documents/:documentId/download',
    validateParams(portalCaseDocumentDownloadParamsSchema),
    casesController.downloadCaseDocument
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

  portalV2Routes.get('/messages/threads', validateQuery(portalThreadsQuerySchema), messagingController.getThreads);
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

  portalV2Routes.get('/events', validateQuery(portalEventsQuerySchema), eventsController.getEvents);
  portalV2Routes.post('/events/:eventId/register', validateParams(portalEventParamsSchema), eventsController.register);
  portalV2Routes.delete('/events/:eventId/register', validateParams(portalEventParamsSchema), eventsController.cancel);

  portalV2Routes.get('/appointments', validateQuery(portalAppointmentsQuerySchema), appointmentsController.getAppointments);
  portalV2Routes.get('/appointments/slots', validateQuery(portalSlotQuerySchema), appointmentsController.getSlots);
  portalV2Routes.post(
    '/appointments/slots/:slotId/book',
    validateParams(portalSlotParamsSchema),
    validateBody(portalBookSlotSchema),
    appointmentsController.bookSlot
  );
  portalV2Routes.post('/appointments/requests', validateBody(portalManualAppointmentRequestSchema), appointmentsController.createRequest);
  portalV2Routes.patch('/appointments/:id/cancel', validateParams(portalAppointmentParamsSchema), appointmentsController.cancelAppointment);

  portalV2Routes.get('/documents', validateQuery(portalDocumentsQuerySchema), resourcesController.getDocuments);
  portalV2Routes.get('/documents/:id/download', validateParams(portalUuidParamsSchema), resourcesController.downloadDocument);
  portalV2Routes.get('/forms', validateQuery(portalDocumentsQuerySchema), resourcesController.getForms);
  portalV2Routes.get('/forms/assignments', validateQuery(caseFormListQuerySchema), formsController.listForms);
  portalV2Routes.get('/forms/assignments/:assignmentId', validateParams(caseFormPortalParamsSchema), formsController.getForm);
  portalV2Routes.post(
    '/forms/assignments/:assignmentId/assets',
    validateParams(caseFormPortalParamsSchema),
    documentUpload.single('file'),
    handleMulterError,
    validateBody(caseFormAssetUploadSchema),
    formsController.uploadAsset
  );
  portalV2Routes.post(
    '/forms/assignments/:assignmentId/draft',
    validateParams(caseFormPortalParamsSchema),
    validateBody(caseFormDraftSchema),
    formsController.saveDraft
  );
  portalV2Routes.post(
    '/forms/assignments/:assignmentId/submit',
    validateParams(caseFormPortalParamsSchema),
    validateBody(caseFormSubmitSchema),
    formsController.submit
  );
  portalV2Routes.get(
    '/forms/assignments/:assignmentId/response-packet',
    validateParams(caseFormPortalParamsSchema),
    formsController.downloadResponsePacket
  );
  portalV2Routes.get('/notes', validateQuery(portalNotesQuerySchema), resourcesController.getNotes);
  portalV2Routes.get('/reminders', validateQuery(portalRemindersQuerySchema), resourcesController.getReminders);

  return portalV2Routes;
};

export const portalV2Routes = createPortalV2Routes();
