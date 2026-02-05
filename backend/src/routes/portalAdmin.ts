import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
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
} from '../controllers/portalAdminController';

const router = Router();

router.use(authenticate);

router.get('/requests', listPortalSignupRequests);

router.post(
  '/requests/:id/approve',
  [param('id').isUUID(), validateRequest],
  approvePortalSignupRequest
);

router.post(
  '/requests/:id/reject',
  [param('id').isUUID(), body('notes').optional().isString(), validateRequest],
  rejectPortalSignupRequest
);

router.get('/invitations', listPortalInvitations);

router.get('/users', listPortalUsers);

router.patch(
  '/users/:id',
  [param('id').isUUID(), validateRequest],
  updatePortalUserStatus
);

router.get(
  '/users/:id/activity',
  [param('id').isUUID(), validateRequest],
  getPortalUserActivity
);

router.post(
  '/invitations',
  [
    body('email').isEmail().normalizeEmail(),
    body('contact_id').optional().isUUID(),
    body('expiresInDays').optional().isInt({ min: 1, max: 90 }),
    validateRequest,
  ],
  createPortalInvitation
);

router.post(
  '/reset-password',
  [body('portalUserId').isUUID(), body('password').isLength({ min: 8 }), validateRequest],
  resetPortalUserPassword
);

export default router;
