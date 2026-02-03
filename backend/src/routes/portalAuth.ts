import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  portalSignup,
  portalLogin,
  getPortalMe,
  validatePortalInvitation,
  acceptPortalInvitation,
} from '../controllers/portalAuthController';
import { authenticatePortal } from '../middleware/portalAuth';

const router = Router();

router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').isString().notEmpty(),
    body('lastName').isString().notEmpty(),
    body('phone').optional().isString(),
  ],
  portalSignup
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isString()],
  portalLogin
);

router.get('/me', authenticatePortal, getPortalMe);

router.get(
  '/invitations/validate/:token',
  [param('token').isString().notEmpty()],
  validatePortalInvitation
);

router.post(
  '/invitations/accept/:token',
  [
    param('token').isString().notEmpty(),
    body('firstName').isString().notEmpty(),
    body('lastName').isString().notEmpty(),
    body('password').isLength({ min: 8 }),
  ],
  acceptPortalInvitation
);

export default router;
