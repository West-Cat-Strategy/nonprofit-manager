/**
 * Authentication Validation Schemas
 * Schemas for login, registration, password reset, etc.
 */

import { z } from 'zod';
import { emailSchema, passwordSchema, weakPasswordSchema, nameSchema } from './shared';

// Login request
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Registration request
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  password_confirm: z.string(),
  first_name: nameSchema,
  last_name: nameSchema,
}).refine(
  (data) => data.password === data.password_confirm,
  {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  }
);

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

// Change password
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: weakPasswordSchema,
  new_password_confirm: z.string(),
}).refine(
  (data) => data.new_password === data.new_password_confirm,
  {
    message: 'Password confirmation does not match',
    path: ['new_password_confirm'],
  }
);

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// 2FA Setup
export const twoFactorSetupSchema = z.object({
  token: z.string().min(6, 'Token must be 6 digits').max(6),
});

export type TwoFactorSetupInput = z.infer<typeof twoFactorSetupSchema>;

// 2FA Verify
export const twoFactorVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFA token is required'),
  token: z.string().min(6, 'Token must be 6 digits').max(6),
});

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

// First User Setup (during initial system setup)
export const setupFirstUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  password_confirm: z.string(),
  first_name: nameSchema,
  last_name: nameSchema,
  organization_name: z.string().min(1, 'Organization name is required').max(255),
}).refine(
  (data) => data.password === data.password_confirm,
  {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  }
);

export type SetupFirstUserInput = z.infer<typeof setupFirstUserSchema>;