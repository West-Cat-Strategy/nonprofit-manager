import { Router } from 'express';
import {
  portalSignup,
  portalLogin,
  portalLogout,
  getPortalMe,
  validatePortalInvitation,
  acceptPortalInvitation,
} from '../controllers';
import { authenticatePortal } from '@middleware/domains/auth';
import { authLimiterMiddleware } from '@middleware/domains/platform';
import { validateBody, validateParams } from '@middleware/zodValidation';
import {
  acceptPortalInvitationSchema,
  portalInvitationTokenParamsSchema,
  portalLoginSchema,
  portalSignupSchema,
} from '@validations/portal';

const router = Router();

router.post('/signup', authLimiterMiddleware, validateBody(portalSignupSchema), portalSignup);
router.post('/login', authLimiterMiddleware, validateBody(portalLoginSchema), portalLogin);
router.post('/logout', portalLogout);
router.get('/me', authenticatePortal, getPortalMe);

router.get(
  '/invitations/validate/:token',
  validateParams(portalInvitationTokenParamsSchema),
  validatePortalInvitation
);

router.post(
  '/invitations/accept/:token',
  authLimiterMiddleware,
  validateParams(portalInvitationTokenParamsSchema),
  validateBody(acceptPortalInvitationSchema),
  acceptPortalInvitation
);

export default router;

export type ResponseMode = 'v2' | 'legacy';

export const createPortalAuthRoutes = (_mode: ResponseMode = 'v2') => router;

export const portalAuthV2Routes = createPortalAuthRoutes('v2');
