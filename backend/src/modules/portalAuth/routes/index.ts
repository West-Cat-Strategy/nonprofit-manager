import { Router } from 'express';
import {
  portalSignup,
  portalLogin,
  portalLogout,
  portalForgotPassword,
  portalResetPassword,
  getPortalBootstrap,
  getPortalMe,
  validatePortalResetToken,
  validatePortalInvitation,
  acceptPortalInvitation,
} from '../controllers';
import { authenticatePortal, checkAccountLockout } from '@middleware/domains/auth';
import { authLimiterMiddleware, passwordResetLimiterMiddleware } from '@middleware/domains/platform';
import { validateBody, validateParams } from '@middleware/zodValidation';
import {
  acceptPortalInvitationSchema,
  portalInvitationTokenParamsSchema,
  portalLoginSchema,
  portalPasswordResetConfirmSchema,
  portalPasswordResetRequestSchema,
  portalPasswordResetTokenParamsSchema,
  portalSignupSchema,
} from '@validations/portal';

const router = Router();

router.post('/signup', authLimiterMiddleware, validateBody(portalSignupSchema), portalSignup);
router.post(
  '/forgot-password',
  passwordResetLimiterMiddleware,
  validateBody(portalPasswordResetRequestSchema),
  portalForgotPassword
);
router.get(
  '/reset-password/:token',
  validateParams(portalPasswordResetTokenParamsSchema),
  validatePortalResetToken
);
router.post(
  '/reset-password',
  passwordResetLimiterMiddleware,
  validateBody(portalPasswordResetConfirmSchema),
  portalResetPassword
);
router.post(
  '/login',
  authLimiterMiddleware,
  checkAccountLockout,
  validateBody(portalLoginSchema),
  portalLogin
);
router.post('/logout', portalLogout);
router.get('/bootstrap', authenticatePortal, getPortalBootstrap);
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

export const createPortalAuthRoutes = () => router;

export const portalAuthV2Routes = createPortalAuthRoutes();
