import { Router } from 'express';
import { validateBody } from '@middleware/zodValidation';
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
} from '@controllers/domains/core';
import { getCsrfToken } from '@middleware/domains/security';
import {
  completeTotpLogin,
  disableTotp,
  enableTotp,
  enrollTotp,
  getSecurityOverview,
} from '@controllers/domains/core';
import {
  deletePasskey,
  listPasskeys,
  loginOptions as passkeyLoginOptions,
  loginVerify as passkeyLoginVerify,
  registrationOptions as passkeyRegistrationOptions,
  registrationVerify as passkeyRegistrationVerify,
} from '@controllers/domains/core';
import { authenticate } from '@middleware/domains/auth';
import { authLimiterMiddleware, registrationLimiterMiddleware } from '@middleware/domains/platform';
import { checkAccountLockout } from '@middleware/domains/auth';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  twoFactorVerifySchema,
  twoFactorSetupSchema,
  twoFactorDisableSchema,
  passkeyRegistrationVerifySchema,
  passkeyLoginOptionsSchema,
  passkeyLoginVerifySchema,
  setupFirstUserSchema,
} from '@validations/auth';
import { updateUserProfileSchema } from '@validations/user';

const router = Router();

router.post(
  '/register',
  registrationLimiterMiddleware,
  validateBody(registerSchema),
  register
);

router.post(
  '/login',
  authLimiterMiddleware,
  checkAccountLockout,
  validateBody(loginSchema),
  login
);

router.post(
  '/login/2fa',
  authLimiterMiddleware,
  checkAccountLockout,
  validateBody(twoFactorVerifySchema.extend({
    email: loginSchema.shape.email,
  })),
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
  validateBody(updateUserProfileSchema),
  updateProfile
);

// Password change route
router.put(
  '/password',
  authenticate,
  validateBody(changePasswordSchema),
  changePassword
);

// TOTP 2FA management
router.post('/2fa/totp/enroll', authenticate, enrollTotp);
router.post(
  '/2fa/totp/enable',
  authenticate,
  validateBody(twoFactorSetupSchema),
  enableTotp
);
router.post(
  '/2fa/totp/disable',
  authenticate,
  validateBody(twoFactorDisableSchema),
  disableTotp
);

// Passkeys (WebAuthn)
router.get('/passkeys', authenticate, listPasskeys);
router.delete('/passkeys/:id', authenticate, deletePasskey);
router.post('/passkeys/register/options', authenticate, passkeyRegistrationOptions);
router.post(
  '/passkeys/register/verify',
  authenticate,
  validateBody(passkeyRegistrationVerifySchema),
  passkeyRegistrationVerify
);
router.post(
  '/passkeys/login/options',
  authLimiterMiddleware,
  checkAccountLockout,
  validateBody(passkeyLoginOptionsSchema),
  passkeyLoginOptions
);
router.post(
  '/passkeys/login/verify',
  authLimiterMiddleware,
  checkAccountLockout,
  validateBody(passkeyLoginVerifySchema),
  passkeyLoginVerify
);

// Setup routes (no authentication required)
router.get('/setup-status', checkSetupStatus);

router.post(
  '/setup',
  registrationLimiterMiddleware,
  validateBody(setupFirstUserSchema),
  setupFirstUser
);

export default router;
