import { Router } from 'express';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  listPortalSignupRequests,
  approvePortalSignupRequest,
  rejectPortalSignupRequest,
  createPortalInvitation,
  listPortalInvitations,
  listPortalUsers,
  updatePortalUserStatus,
  getPortalUserActivity,
  resetPortalUserPassword,
  listPortalAdminConversations,
  getPortalAdminConversation,
  replyPortalAdminConversation,
  updatePortalAdminConversation,
  listPortalAdminAppointmentSlots,
  createPortalAdminAppointmentSlot,
  updatePortalAdminAppointmentSlot,
  deletePortalAdminAppointmentSlot,
  updatePortalAdminAppointmentStatus,
  listPortalAdminAppointments,
  getPortalAdminAppointmentReminders,
  sendPortalAdminAppointmentReminders,
  checkInPortalAdminAppointment,
  streamPortalAdminRealtime,
} from '@controllers/domains/portal';
import {
  portalAdminAppointmentsQuerySchema,
  portalAdminAppointmentStatusSchema,
  portalAdminConversationQuerySchema,
  portalAdminCreateInvitationSchema,
  portalAdminReminderSendSchema,
  portalAdminRejectRequestSchema,
  portalAdminResetPasswordSchema,
  portalAdminSlotQuerySchema,
  portalAdminSlotCreateSchema,
  portalAdminSlotPatchSchema,
  portalAdminRealtimeStreamQuerySchema,
  portalAdminThreadMessageSchema,
  portalAdminUserActivityQuerySchema,
  portalAdminUserPatchSchema,
  portalAdminUsersQuerySchema,
  portalThreadParamsSchema,
  portalThreadUpdateSchema,
  portalUuidParamsSchema,
  portalSlotParamsSchema,
  portalAppointmentParamsSchema,
} from '@validations/portal';

const router = Router();

router.use(authenticate);
router.get('/stream', validateQuery(portalAdminRealtimeStreamQuerySchema), streamPortalAdminRealtime);

router.get('/requests', listPortalSignupRequests);
router.post('/requests/:id/approve', validateParams(portalUuidParamsSchema), approvePortalSignupRequest);
router.post(
  '/requests/:id/reject',
  validateParams(portalUuidParamsSchema),
  validateBody(portalAdminRejectRequestSchema),
  rejectPortalSignupRequest
);

router.get('/invitations', listPortalInvitations);
router.post('/invitations', validateBody(portalAdminCreateInvitationSchema), createPortalInvitation);

router.get('/users', validateQuery(portalAdminUsersQuerySchema), listPortalUsers);
router.patch('/users/:id', validateParams(portalUuidParamsSchema), validateBody(portalAdminUserPatchSchema), updatePortalUserStatus);
router.get(
  '/users/:id/activity',
  validateParams(portalUuidParamsSchema),
  validateQuery(portalAdminUserActivityQuerySchema),
  getPortalUserActivity
);
router.post('/reset-password', validateBody(portalAdminResetPasswordSchema), resetPortalUserPassword);

router.get('/conversations', validateQuery(portalAdminConversationQuerySchema), listPortalAdminConversations);
router.get('/conversations/:threadId', validateParams(portalThreadParamsSchema), getPortalAdminConversation);
router.post(
  '/conversations/:threadId/messages',
  validateParams(portalThreadParamsSchema),
  validateBody(portalAdminThreadMessageSchema),
  replyPortalAdminConversation
);
router.patch(
  '/conversations/:threadId',
  validateParams(portalThreadParamsSchema),
  validateBody(portalThreadUpdateSchema),
  updatePortalAdminConversation
);

router.get('/appointment-slots', validateQuery(portalAdminSlotQuerySchema), listPortalAdminAppointmentSlots);
router.post('/appointment-slots', validateBody(portalAdminSlotCreateSchema), createPortalAdminAppointmentSlot);
router.patch(
  '/appointment-slots/:slotId',
  validateParams(portalSlotParamsSchema),
  validateBody(portalAdminSlotPatchSchema),
  updatePortalAdminAppointmentSlot
);
router.delete('/appointment-slots/:slotId', validateParams(portalSlotParamsSchema), deletePortalAdminAppointmentSlot);

router.get('/appointments', validateQuery(portalAdminAppointmentsQuerySchema), listPortalAdminAppointments);
router.get('/appointments/:id/reminders', validateParams(portalAppointmentParamsSchema), getPortalAdminAppointmentReminders);
router.post(
  '/appointments/:id/reminders/send',
  validateParams(portalAppointmentParamsSchema),
  validateBody(portalAdminReminderSendSchema),
  sendPortalAdminAppointmentReminders
);
router.post('/appointments/:id/check-in', validateParams(portalAppointmentParamsSchema), checkInPortalAdminAppointment);
router.patch(
  '/appointments/:id/status',
  validateParams(portalAppointmentParamsSchema),
  validateBody(portalAdminAppointmentStatusSchema),
  updatePortalAdminAppointmentStatus
);

export default router;
