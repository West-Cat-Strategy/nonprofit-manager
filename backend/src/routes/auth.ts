import { Router } from 'express';
import { body } from 'express-validator';
import {
  login,
  register,
  getCurrentUser,
  checkSetupStatus,
  setupFirstUser,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter, registrationLimiter } from '../middleware/rateLimiter';
import { checkAccountLockout } from '../middleware/accountLockout';

const router = Router();

router.post(
  '/register',
  registrationLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
  ],
  register
);

router.post(
  '/login',
  authLimiter,
  checkAccountLockout,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.get('/me', authenticate, getCurrentUser);

// Setup routes (no authentication required)
router.get('/setup-status', checkSetupStatus);

router.post(
  '/setup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
  ],
  setupFirstUser
);

export default router;
