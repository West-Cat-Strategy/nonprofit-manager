import { Router } from 'express';
import { authenticate } from '@middleware/domains/auth';
import type { AuthRequest } from '@middleware/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  archiveQueueViewDefinition,
  listQueueViewDefinitions,
  upsertQueueViewDefinition,
} from '@services/queueViewDefinitionService';
import { ensurePortalAdmin, getPortalAdminQuery } from '../controllers/portalAdminController.shared';
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
} from '../controllers';
import {
  portalAdminAppointmentsQuerySchema,
  portalAdminAppointmentStatusSchema,
  portalAdminApproveRequestSchema,
  portalAdminConversationQuerySchema,
  portalAdminCreateInvitationSchema,
  portalAdminQueueViewQuerySchema,
  portalAdminQueueViewSchema,
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
  portalAdminAppointmentCheckInSchema,
} from '@validations/portal';

const router = Router();

router.use(authenticate);
router.get('/stream', validateQuery(portalAdminRealtimeStreamQuerySchema), streamPortalAdminRealtime);

router.get(
  '/queue-views',
  validateQuery(portalAdminQueueViewQuerySchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!ensurePortalAdmin(req, res)) {
        return;
      }
      const query = getPortalAdminQuery<{ surface: Parameters<typeof listQueueViewDefinitions>[0] }>(req);
      const views = await listQueueViewDefinitions(query.surface, req.user?.id ?? null, [
        'portal_admin',
      ]);
      sendSuccess(res, views);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/queue-views',
  validateBody(portalAdminQueueViewSchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!ensurePortalAdmin(req, res)) {
        return;
      }
      const body = req.body as Parameters<typeof upsertQueueViewDefinition>[0];
      const view = await upsertQueueViewDefinition({
        ...body,
        ownerUserId: req.user?.id ?? null,
        permissionScope:
          Array.isArray(body.permissionScope) && body.permissionScope.length > 0
            ? body.permissionScope
            : ['portal_admin'],
        userId: req.user?.id ?? null,
      });
      sendSuccess(res, view, 201);
    } catch (error) {
      next(error);
    }
  }
);
router.delete(
  '/queue-views/:id',
  validateParams(portalUuidParamsSchema),
  validateQuery(portalAdminQueueViewQuerySchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!ensurePortalAdmin(req, res)) {
        return;
      }
      const query = getPortalAdminQuery<{ surface: Parameters<typeof listQueueViewDefinitions>[0] }>(req);
      const view = await archiveQueueViewDefinition({
        id: String(req.params.id),
        surface: query.surface,
        ownerUserId: req.user?.id ?? null,
        permissionScopes: ['portal_admin'],
        userId: req.user?.id ?? null,
      });
      sendSuccess(res, view);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/requests', listPortalSignupRequests);
router.post(
  '/requests/:id/approve',
  validateParams(portalUuidParamsSchema),
  validateBody(portalAdminApproveRequestSchema),
  approvePortalSignupRequest
);
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
router.post(
  '/appointments/:id/check-in',
  validateParams(portalAppointmentParamsSchema),
  validateBody(portalAdminAppointmentCheckInSchema),
  checkInPortalAdminAppointment
);
router.patch(
  '/appointments/:id/status',
  validateParams(portalAppointmentParamsSchema),
  validateBody(portalAdminAppointmentStatusSchema),
  updatePortalAdminAppointmentStatus
);

export default router;

export const createPortalAdminRoutes = () => router;

export const portalAdminV2Routes = createPortalAdminRoutes();
