/**
 * Authentication Validation Schemas
 * Schemas for login, registration, password reset, etc.
 */

import { z } from 'zod';
import { emailSchema, passwordSchema, weakPasswordSchema, nameSchema, uuidSchema } from './shared';

// Login request
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// TODO(P4-T9A): Remove snake_case aliases after July 1, 2026 once
// docs/security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md telemetry gates are met.
const registrationNamesSchema = z
  .object({
    firstName: nameSchema.optional(),
    first_name: nameSchema.optional(),
    lastName: nameSchema.optional(),
    last_name: nameSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!(data.firstName || data.first_name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['firstName'],
        message: 'First name is required',
      });
    }
    if (!(data.lastName || data.last_name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lastName'],
        message: 'Last name is required',
      });
    }
  });

const registrationPasswordsSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: z.string().optional(),
    password_confirm: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const confirmation = data.passwordConfirm ?? data.password_confirm;
    if (!confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['passwordConfirm'],
        message: 'Password confirmation is required',
      });
      return;
    }
    if (data.password !== confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['passwordConfirm'],
        message: 'Passwords do not match',
      });
    }
  });

// Registration request
export const registerSchema = z
  .object({
    email: emailSchema,
  })
  .and(registrationPasswordsSchema)
  .and(registrationNamesSchema)
  .transform((data) => ({
    email: data.email,
    password: data.password,
    passwordConfirm: data.passwordConfirm ?? data.password_confirm ?? '',
    firstName: data.firstName ?? data.first_name ?? '',
    lastName: data.lastName ?? data.last_name ?? '',
  }));

export type RegisterInput = z.infer<typeof registerSchema>;

// Password reset request
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

// Password reset confirm
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  password_confirm: z.string(),
}).refine(
  (data) => data.password === data.password_confirm,
  {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  }
);

export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

export const passwordResetTokenParamsSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(
      /^([a-fA-F0-9]{64}|[0-9a-fA-F-]{36}\.[a-fA-F0-9]{64})$/,
      'Invalid reset token format'
    ),
});

export type PasswordResetTokenParamsInput = z.infer<typeof passwordResetTokenParamsSchema>;

export const adminRegistrationReviewTokenParamsSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
      'Invalid review token format'
    ),
});

export type AdminRegistrationReviewTokenParamsInput = z.infer<
  typeof adminRegistrationReviewTokenParamsSchema
>;

// Change password
// TODO(P4-T9A): Remove snake_case aliases after July 1, 2026 once
// docs/security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md telemetry gates are met.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').optional(),
    current_password: z.string().min(1, 'Current password is required').optional(),
    newPassword: weakPasswordSchema.optional(),
    new_password: weakPasswordSchema.optional(),
    newPasswordConfirm: z.string().optional(),
    new_password_confirm: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const currentPassword = data.currentPassword ?? data.current_password;
    const newPassword = data.newPassword ?? data.new_password;
    const newPasswordConfirm = data.newPasswordConfirm ?? data.new_password_confirm;

    if (!currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentPassword'],
        message: 'Current password is required',
      });
    }
    if (!newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'New password is required',
      });
      return;
    }
    if (!newPasswordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPasswordConfirm'],
        message: 'Password confirmation does not match',
      });
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPasswordConfirm'],
        message: 'Password confirmation does not match',
      });
    }
  })
  .transform((data) => ({
    currentPassword: data.currentPassword ?? data.current_password ?? '',
    newPassword: data.newPassword ?? data.new_password ?? '',
    newPasswordConfirm: data.newPasswordConfirm ?? data.new_password_confirm ?? '',
  }));

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// 2FA Setup
export const twoFactorSetupSchema = z.object({
  token: z.string().min(6, 'Token must be 6 digits').max(6),
});

export type TwoFactorSetupInput = z.infer<typeof twoFactorSetupSchema>;

// 2FA Verify
export const twoFactorVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFA token is required'),
  code: z.string().trim().min(6, 'Token must be 6 digits').max(6).optional(),
  token: z.string().trim().min(6, 'Token must be 6 digits').max(6).optional(),
}).refine(
  (data) => Boolean(data.code || data.token),
  {
    message: 'Authentication code is required',
    path: ['code'],
  }
);

export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;

// 2FA Disable
export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  token: z.string().min(6, 'Token must be 6 digits').max(6),
});

export type TwoFactorDisableInput = z.infer<typeof twoFactorDisableSchema>;

// Recovery codes backup
export const backupCodesSchema = z.object({
  codes: z.array(z.string()).min(1, 'At least one backup code is required'),
});

export type BackupCodesInput = z.infer<typeof backupCodesSchema>;

// Passkey Registration Verification
export const passkeyRegistrationVerifySchema = z.object({
  challengeId: z.string().min(1, 'Challenge ID is required'),
  credential: z.unknown().refine((val) => val !== null && val !== undefined, 'Credential is required'),
});

export type PasskeyRegistrationVerifyInput = z.infer<typeof passkeyRegistrationVerifySchema>;

export const pendingPasskeyRegistrationOptionsSchema = z.object({
  registrationToken: z.string().trim().min(1, 'Registration token is required'),
  email: emailSchema,
});

export type PendingPasskeyRegistrationOptionsInput = z.infer<
  typeof pendingPasskeyRegistrationOptionsSchema
>;

export const pendingPasskeyRegistrationVerifySchema = z.object({
  registrationToken: z.string().trim().min(1, 'Registration token is required'),
  challengeId: z.string().min(1, 'Challenge ID is required'),
  credential: z.unknown().refine((val) => val !== null && val !== undefined, 'Credential is required'),
  name: z.string().trim().max(100).nullable().optional(),
});

export type PendingPasskeyRegistrationVerifyInput = z.infer<
  typeof pendingPasskeyRegistrationVerifySchema
>;

// Passkey Login Options
export const passkeyLoginOptionsSchema = z.object({
  email: emailSchema,
});

export type PasskeyLoginOptionsInput = z.infer<typeof passkeyLoginOptionsSchema>;

// Passkey Login Verification
export const passkeyLoginVerifySchema = z.object({
  email: emailSchema,
  challengeId: z.string().min(1, 'Challenge ID is required'),
  credential: z.unknown().refine((val) => val !== null && val !== undefined, 'Credential is required'),
});

export type PasskeyLoginVerifyInput = z.infer<typeof passkeyLoginVerifySchema>;

export const updatePreferencesSchema = z.object({
  preferences: z.record(z.string(), z.unknown()),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const updatePreferenceValueSchema = z.object({
  value: z.unknown(),
});

export type UpdatePreferenceValueInput = z.infer<typeof updatePreferenceValueSchema>;

export const passkeyIdParamsSchema = z.object({
  id: uuidSchema,
});

export type PasskeyIdParamsInput = z.infer<typeof passkeyIdParamsSchema>;

export const preferenceKeyParamsSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Preference key is required')
    .max(128, 'Preference key is too long')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid preference key format'),
});

export type PreferenceKeyParamsInput = z.infer<typeof preferenceKeyParamsSchema>;

// First User Setup (during initial system setup)
// TODO(P4-T9A): Remove snake_case aliases after July 1, 2026 once
// docs/security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md telemetry gates are met.
export const setupFirstUserSchema = z
  .object({
    email: emailSchema,
    organizationName: z.string().min(1, 'Organization name is required').max(255).optional(),
    organization_name: z.string().min(1, 'Organization name is required').max(255).optional(),
  })
  .and(registrationPasswordsSchema)
  .and(registrationNamesSchema)
  .superRefine((data, ctx) => {
    if (!(data.organizationName || data.organization_name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['organizationName'],
        message: 'Organization name is required',
      });
    }
  })
  .transform((data) => ({
    email: data.email,
    password: data.password,
    passwordConfirm: data.passwordConfirm ?? data.password_confirm ?? '',
    firstName: data.firstName ?? data.first_name ?? '',
    lastName: data.lastName ?? data.last_name ?? '',
    organizationName: data.organizationName ?? data.organization_name ?? '',
  }));

export type SetupFirstUserInput = z.infer<typeof setupFirstUserSchema>;
