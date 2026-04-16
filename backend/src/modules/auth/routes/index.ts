import { Router } from 'express';
import { validateBody, validateParams } from '@middleware/zodValidation';
import { getCsrfToken } from '@middleware/domains/security';
import { authenticate } from '@middleware/domains/auth';
import {
  authLimiterMiddleware,
  passwordResetLimiterMiddleware,
  registrationLimiterMiddleware,
} from '@middleware/domains/platform';
import { checkAccountLockout } from '@middleware/domains/auth';
import {
  adminRegistrationReviewTokenParamsSchema,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  twoFactorVerifySchema,
  twoFactorSetupSchema,
  twoFactorDisableSchema,
  passkeyRegistrationVerifySchema,
  pendingPasskeyRegistrationOptionsSchema,
  pendingPasskeyRegistrationVerifySchema,
  passkeyLoginOptionsSchema,
  passkeyLoginVerifySchema,
  setupFirstUserSchema,
  updatePreferencesSchema,
  updatePreferenceValueSchema,
  passwordResetTokenParamsSchema,
  passkeyIdParamsSchema,
  preferenceKeyParamsSchema,
} from '@validations/auth';
import { updateUserProfileSchema } from '@validations/user';
import {
  checkSetupStatus,
  forgotPassword,
  getRegistrationStatus,
  register,
  resetPassword,
  setupFirstUser,
  validateResetToken,
} from '../controllers/registration.controller';
import {
  confirmAdminRegistrationReviewHandler,
  previewAdminRegistrationReviewHandler,
} from '../controllers/adminRegistrationReviewController';
import { getBootstrap } from '../controllers/bootstrap.controller';
import { checkAccess, getCurrentUser, login, logout } from '../controllers/session.controller';
import { getPreferences, updatePreferenceKey, updatePreferences } from '../controllers/preferences.controller';
import { changePassword, getProfile, updateProfile } from '../controllers/profile.controller';
import {
  completeTotpLogin,
  disableTotp,
  enableTotp,
  enrollTotp,
  getSecurityOverview,
} from '../controllers/mfa.controller';
import {
  deletePasskey,
  listPasskeys,
  loginOptions as passkeyLoginOptions,
  loginVerify as passkeyLoginVerify,
  pendingRegistrationOptions as pendingPasskeyRegistrationOptions,
  pendingRegistrationVerify as pendingPasskeyRegistrationVerify,
  registrationOptions as passkeyRegistrationOptions,
  registrationVerify as passkeyRegistrationVerify,
} from '../controllers/passkeys.controller';
import { aliasUsageTelemetry } from '../middleware/aliasUsageTelemetry';

export type ResponseMode = 'v2' | 'legacy';

export const createAuthRoutes = (_mode: ResponseMode = 'v2'): Router => {
  const router = Router();

  // Public: check if self-registration is enabled (no auth needed)
  router.get('/registration-status', getRegistrationStatus);

  router.post(
    '/register',
    registrationLimiterMiddleware,
    aliasUsageTelemetry({
      route: '/api/v2/auth/register',
      aliasFields: ['first_name', 'last_name', 'password_confirm'],
    }),
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
  router.get('/bootstrap', authenticate, getBootstrap);
  router.get('/check-access', authenticate, checkAccess);
  router.post('/logout', authenticate, logout);

  // CSRF token endpoint
  router.get('/csrf-token', getCsrfToken);

  // Security (MFA / passkeys) overview
  router.get('/security', authenticate, getSecurityOverview);

  // User preferences routes
  router.get('/preferences', authenticate, getPreferences);
  router.put('/preferences', authenticate, validateBody(updatePreferencesSchema), updatePreferences);
  router.patch(
    '/preferences/:key',
    authenticate,
    validateParams(preferenceKeyParamsSchema),
    validateBody(updatePreferenceValueSchema),
    updatePreferenceKey
  );

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
    aliasUsageTelemetry({
      route: '/api/v2/auth/password',
      aliasFields: ['current_password', 'new_password', 'new_password_confirm'],
    }),
    validateBody(changePasswordSchema),
    changePassword
  );

  // Forgot / Reset password (public, rate-limited)
  router.post(
    '/forgot-password',
    passwordResetLimiterMiddleware,
    validateBody(passwordResetRequestSchema),
    forgotPassword
  );
  router.get(
    '/reset-password/:token',
    validateParams(passwordResetTokenParamsSchema),
    validateResetToken
  );
  router.get(
    '/admin-registration-review/:token',
    validateParams(adminRegistrationReviewTokenParamsSchema),
    previewAdminRegistrationReviewHandler
  );
  router.post(
    '/admin-registration-review/:token/confirm',
    validateParams(adminRegistrationReviewTokenParamsSchema),
    confirmAdminRegistrationReviewHandler
  );
  router.post(
    '/reset-password',
    passwordResetLimiterMiddleware,
    validateBody(passwordResetConfirmSchema),
    resetPassword
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
  router.delete(
    '/passkeys/:id',
    authenticate,
    validateParams(passkeyIdParamsSchema),
    deletePasskey
  );
  router.post('/passkeys/register/options', authenticate, passkeyRegistrationOptions);
  router.post(
    '/passkeys/register/verify',
    authenticate,
    validateBody(passkeyRegistrationVerifySchema),
    passkeyRegistrationVerify
  );
  router.post(
    '/passkeys/pending/options',
    registrationLimiterMiddleware,
    validateBody(pendingPasskeyRegistrationOptionsSchema),
    pendingPasskeyRegistrationOptions
  );
  router.post(
    '/passkeys/pending/verify',
    registrationLimiterMiddleware,
    validateBody(pendingPasskeyRegistrationVerifySchema),
    pendingPasskeyRegistrationVerify
  );
  router.post(
    '/passkeys/login/options',
    authLimiterMiddleware,
    validateBody(passkeyLoginOptionsSchema),
    passkeyLoginOptions
  );
  router.post(
    '/passkeys/login/verify',
    authLimiterMiddleware,
    validateBody(passkeyLoginVerifySchema),
    passkeyLoginVerify
  );

  // Setup routes (no authentication required)
  router.get('/setup-status', checkSetupStatus);

  router.post(
    '/setup',
    registrationLimiterMiddleware,
    aliasUsageTelemetry({
      route: '/api/v2/auth/setup',
      aliasFields: ['first_name', 'last_name', 'password_confirm', 'organization_name'],
    }),
    validateBody(setupFirstUserSchema),
    setupFirstUser
  );

  return router;
};

export const authV2Routes = createAuthRoutes('v2');
