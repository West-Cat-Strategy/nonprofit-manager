import { Router } from 'express';
import { authenticatePortal } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  getPortalProfile,
  updatePortalProfile,
  changePortalPassword,
  getPortalRelationships,
  createPortalRelationship,
  updatePortalRelationship,
  deletePortalRelationship,
  getPortalEvents,
  registerPortalEvent,
  cancelPortalEventRegistration,
  getPortalAppointments,
  getPortalAppointmentSlots,
  bookPortalAppointmentSlot,
  createPortalAppointmentRequest,
  cancelPortalAppointment,
  getPortalDocuments,
  downloadPortalDocument,
  getPortalNotes,
  getPortalForms,
  getPortalReminders,
  getPortalPointpersonContext,
  getPortalThreads,
  createPortalThread,
  getPortalThread,
  replyPortalThread,
  markPortalThreadRead,
  updatePortalThread,
} from '@controllers/domains/portal';
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

const router = Router();

router.use(authenticatePortal);

router.get('/profile', getPortalProfile);
router.patch('/profile', validateBody(portalProfileUpdateSchema), updatePortalProfile);
router.post('/change-password', validateBody(portalChangePasswordSchema), changePortalPassword);

router.get('/pointperson/context', validateQuery(portalPointpersonQuerySchema), getPortalPointpersonContext);

router.get('/messages/threads', getPortalThreads);
router.post('/messages/threads', validateBody(portalThreadCreateSchema), createPortalThread);
router.get('/messages/threads/:threadId', validateParams(portalThreadParamsSchema), getPortalThread);
router.post(
  '/messages/threads/:threadId/messages',
  validateParams(portalThreadParamsSchema),
  validateBody(portalThreadMessageSchema),
  replyPortalThread
);
router.post('/messages/threads/:threadId/read', validateParams(portalThreadParamsSchema), markPortalThreadRead);
router.patch(
  '/messages/threads/:threadId',
  validateParams(portalThreadParamsSchema),
  validateBody(portalThreadUpdateSchema),
  updatePortalThread
);

router.get('/relationships', getPortalRelationships);
router.post('/relationships', validateBody(portalRelationshipCreateSchema), createPortalRelationship);
router.put(
  '/relationships/:id',
  validateParams(portalUuidParamsSchema),
  validateBody(portalRelationshipUpdateSchema),
  updatePortalRelationship
);
router.delete('/relationships/:id', validateParams(portalUuidParamsSchema), deletePortalRelationship);

router.get('/events', getPortalEvents);
router.post('/events/:eventId/register', validateParams(portalEventParamsSchema), registerPortalEvent);
router.delete('/events/:eventId/register', validateParams(portalEventParamsSchema), cancelPortalEventRegistration);

router.get('/appointments', getPortalAppointments);
router.get('/appointments/slots', validateQuery(portalSlotQuerySchema), getPortalAppointmentSlots);
router.post(
  '/appointments/slots/:slotId/book',
  validateParams(portalSlotParamsSchema),
  validateBody(portalBookSlotSchema),
  bookPortalAppointmentSlot
);
router.post('/appointments/requests', validateBody(portalManualAppointmentRequestSchema), createPortalAppointmentRequest);
// Backward-compatible alias during migration from legacy appointment create flow.
router.post('/appointments', validateBody(portalManualAppointmentRequestSchema), createPortalAppointmentRequest);
router.patch('/appointments/:id/cancel', validateParams(portalAppointmentParamsSchema), cancelPortalAppointment);
// Backward-compatible legacy route
router.delete('/appointments/:id', validateParams(portalAppointmentParamsSchema), cancelPortalAppointment);

router.get('/documents', getPortalDocuments);
router.get('/documents/:id/download', validateParams(portalUuidParamsSchema), downloadPortalDocument);

router.get('/notes', getPortalNotes);
router.get('/forms', getPortalForms);
router.get('/reminders', getPortalReminders);

export default router;
