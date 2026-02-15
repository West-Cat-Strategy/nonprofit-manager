import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticatePortal } from '@middleware/domains/auth';
import { validateRequest } from '@middleware/domains/security';
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
  createPortalAppointment,
  cancelPortalAppointment,
  getPortalDocuments,
  downloadPortalDocument,
  getPortalNotes,
  getPortalForms,
  getPortalReminders,
} from '@controllers/domains/portal';

const router = Router();

router.use(authenticatePortal);

router.get('/profile', getPortalProfile);

router.patch('/profile', updatePortalProfile);

router.post(
  '/change-password',
  [
    body('currentPassword').isString().notEmpty(),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    validateRequest,
  ],
  changePortalPassword
);

router.get('/relationships', getPortalRelationships);

router.post(
  '/relationships',
  [
    body('relationship_type').isString(),
    body('relationship_label').optional().isString(),
    body('notes').optional().isString(),
    body('related_contact_id').optional().isUUID(),
    validateRequest,
  ],
  createPortalRelationship
);

router.put(
  '/relationships/:id',
  [param('id').isUUID(), validateRequest],
  updatePortalRelationship
);

router.delete('/relationships/:id', [param('id').isUUID(), validateRequest], deletePortalRelationship);

router.get('/events', getPortalEvents);

router.post('/events/:eventId/register', [param('eventId').isUUID(), validateRequest], registerPortalEvent);

router.delete('/events/:eventId/register', [param('eventId').isUUID(), validateRequest], cancelPortalEventRegistration);

router.get('/appointments', getPortalAppointments);

router.post(
  '/appointments',
  [
    body('title').isString().notEmpty(),
    body('start_time').isISO8601(),
    body('end_time').optional().isISO8601(),
    body('description').optional().isString(),
    body('location').optional().isString(),
    validateRequest,
  ],
  createPortalAppointment
);

router.delete('/appointments/:id', [param('id').isUUID(), validateRequest], cancelPortalAppointment);

router.get('/documents', getPortalDocuments);

router.get('/documents/:id/download', [param('id').isUUID(), validateRequest], downloadPortalDocument);

router.get('/notes', getPortalNotes);

router.get('/forms', getPortalForms);

router.get('/reminders', getPortalReminders);

export default router;
