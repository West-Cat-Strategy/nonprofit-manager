import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticatePortal } from '../middleware/portalAuth';
import {
  getPortalProfile,
  updatePortalProfile,
  getPortalRelationships,
  createPortalRelationship,
  updatePortalRelationship,
  deletePortalRelationship,
  getPortalEvents,
  registerPortalEvent,
  cancelPortalEventRegistration,
  getPortalAppointments,
  createPortalAppointment,
  cancelPortalAppointment,
  getPortalDocuments,
  downloadPortalDocument,
  getPortalNotes,
  getPortalForms,
  getPortalReminders,
} from '../controllers/portalController';

const router = Router();

router.use(authenticatePortal);

router.get('/profile', getPortalProfile);

router.patch('/profile', updatePortalProfile);

router.get('/relationships', getPortalRelationships);

router.post(
  '/relationships',
  [
    body('relationship_type').isString(),
    body('relationship_label').optional().isString(),
    body('notes').optional().isString(),
    body('related_contact_id').optional().isUUID(),
  ],
  createPortalRelationship
);

router.put(
  '/relationships/:id',
  [param('id').isUUID()],
  updatePortalRelationship
);

router.delete('/relationships/:id', [param('id').isUUID()], deletePortalRelationship);

router.get('/events', getPortalEvents);

router.post('/events/:eventId/register', [param('eventId').isUUID()], registerPortalEvent);

router.delete('/events/:eventId/register', [param('eventId').isUUID()], cancelPortalEventRegistration);

router.get('/appointments', getPortalAppointments);

router.post(
  '/appointments',
  [
    body('title').isString().notEmpty(),
    body('start_time').isISO8601(),
    body('end_time').optional().isISO8601(),
    body('description').optional().isString(),
    body('location').optional().isString(),
  ],
  createPortalAppointment
);

router.delete('/appointments/:id', [param('id').isUUID()], cancelPortalAppointment);

router.get('/documents', getPortalDocuments);

router.get('/documents/:id/download', [param('id').isUUID()], downloadPortalDocument);

router.get('/notes', getPortalNotes);

router.get('/forms', getPortalForms);

router.get('/reminders', getPortalReminders);

export default router;
