import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  login,
  register,
  logout,
  getCurrentUser,
  checkSetupStatus,
  setupFirstUser,
  getPreferences,
  updatePreferences,
  updatePreferenceKey,
  getProfile,
  updateProfile,
  changePassword,
} from '../controllers/authController';
import { getCsrfToken } from '../middleware/csrf';
import {
  completeTotpLogin,
  disableTotp,
  enableTotp,
  enrollTotp,
  getSecurityOverview,
} from '../controllers/mfaController';
import {
  deletePasskey,
  listPasskeys,
  loginOptions as passkeyLoginOptions,
  loginVerify as passkeyLoginVerify,
  registrationOptions as passkeyRegistrationOptions,
  registrationVerify as passkeyRegistrationVerify,
} from '../controllers/passkeyController';
import { authenticate } from '../middleware/auth';
import { authLimiterMiddleware, registrationLimiterMiddleware } from '../middleware/rateLimiter';
import { checkAccountLockout } from '../middleware/accountLockout';

const router = Router();

router.post(
  '/register',
  registrationLimiterMiddleware,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    validateRequest,
  ],
  register
);

router.post(
  '/login',
  authLimiterMiddleware,
  checkAccountLockout,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest,
  ],
  login
);

router.post(
  '/login/2fa',
  authLimiterMiddleware,
  checkAccountLockout,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('mfaToken').notEmpty().withMessage('MFA token is required'),
    body('code')
      .trim()
      .matches(/^[0-9]{6}$/)
      .withMessage('Authentication code must be 6 digits'),
    validateRequest,
  ],
  completeTotpLogin
);

router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

// CSRF token endpoint
router.get('/csrf-token', getCsrfToken);

// Security (MFA / passkeys) overview
router.get('/security', authenticate, getSecurityOverview);

// User preferences routes
router.get('/preferences', authenticate, getPreferences);
router.put('/preferences', authenticate, updatePreferences);
router.patch('/preferences/:key', authenticate, updatePreferenceKey);

// User profile routes
router.get('/profile', authenticate, getProfile);
router.put(
  '/profile',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    validateRequest,
  ],
  updateProfile
);

// Password change route
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    validateRequest,
  ],
  changePassword
);

// TOTP 2FA management
router.post('/2fa/totp/enroll', authenticate, enrollTotp);
router.post(
  '/2fa/totp/enable',
  authenticate,
  [body('code').trim().matches(/^[0-9]{6}$/).withMessage('Authentication code must be 6 digits'), validateRequest],
  enableTotp
);
router.post(
  '/2fa/totp/disable',
  authenticate,
  [
    body('password').notEmpty().withMessage('Password is required'),
    body('code')
      .trim()
      .matches(/^[0-9]{6}$/)
      .withMessage('Authentication code must be 6 digits'),
    validateRequest,
  ],
  disableTotp
);

// Passkeys (WebAuthn)
router.get('/passkeys', authenticate, listPasskeys);
router.delete('/passkeys/:id', authenticate, deletePasskey);
router.post('/passkeys/register/options', authenticate, passkeyRegistrationOptions);
router.post(
  '/passkeys/register/verify',
  authenticate,
  [body('challengeId').notEmpty().withMessage('challengeId is required'), body('credential').notEmpty(), validateRequest],
  passkeyRegistrationVerify
);
router.post(
  '/passkeys/login/options',
  authLimiterMiddleware,
  checkAccountLockout,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required'), validateRequest],
  passkeyLoginOptions
);
router.post(
  '/passkeys/login/verify',
  authLimiterMiddleware,
  checkAccountLockout,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('challengeId').notEmpty().withMessage('challengeId is required'),
    body('credential').notEmpty(),
    validateRequest,
  ],
  passkeyLoginVerify
);

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
    body('organizationName').trim().notEmpty().withMessage('Organization name is required'),
    validateRequest,
  ],
  setupFirstUser
);

export default router;
