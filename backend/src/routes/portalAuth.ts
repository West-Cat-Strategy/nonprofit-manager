import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  portalSignup,
  portalLogin,
  getPortalMe,
  validatePortalInvitation,
  acceptPortalInvitation,
} from '@controllers/domains/portal';
import { authenticatePortal } from '@middleware/domains/auth';
import { authLimiterMiddleware } from '@middleware/domains/platform';
import { validateRequest } from '@middleware/domains/security';

const router = Router();

router.post(
  '/signup',
  authLimiterMiddleware,
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('firstName').isString().notEmpty(),
    body('lastName').isString().notEmpty(),
    body('phone').optional().isString(),
    validateRequest,
  ],
  portalSignup
);

router.post(
  '/login',
  authLimiterMiddleware,
  [body('email').isEmail().normalizeEmail(), body('password').isString(), validateRequest],
  portalLogin
);

router.get('/me', authenticatePortal, getPortalMe);

router.get(
  '/invitations/validate/:token',
  [param('token').isString().notEmpty(), validateRequest],
  validatePortalInvitation
);

router.post(
  '/invitations/accept/:token',
  authLimiterMiddleware,
  [
    param('token').isString().notEmpty(),
    body('firstName').isString().notEmpty(),
    body('lastName').isString().notEmpty(),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    validateRequest,
  ],
  acceptPortalInvitation
);

export default router;
