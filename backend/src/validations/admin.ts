import { z } from 'zod';
import { emailSchema, phoneSchema, uuidSchema, optionalStrictBooleanSchema } from './shared';

const nullableString = (maxLength = 255) =>
  z.union([z.string().trim().max(maxLength), z.null()]).optional();

const nullableEmailSetting = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}, emailSchema.nullable().optional());

export const adminPendingRegistrationParamsSchema = z.object({
  id: uuidSchema,
});

export const updateRegistrationSettingsSchema = z.object({
  registrationMode: z.enum(['disabled', 'approval_required']).optional(),
  defaultRole: z.enum(['admin', 'manager', 'user', 'readonly']).optional(),
});

export const rejectPendingRegistrationSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const adminAuditLogsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).max(5000).optional(),
  })
  .strict();

export const adminPendingRegistrationsQuerySchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
  })
  .strict();

export const updateEmailSettingsSchema = z.object({
  smtpHost: nullableString(255),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: optionalStrictBooleanSchema,
  smtpUser: nullableString(255),
  smtpPass: z.string().max(255).optional(),
  smtpFromAddress: nullableEmailSetting,
  smtpFromName: nullableString(255),
  imapHost: nullableString(255),
  imapPort: z.coerce.number().int().min(1).max(65535).optional(),
  imapSecure: optionalStrictBooleanSchema,
  imapUser: nullableString(255),
  imapPass: z.string().max(255).optional(),
});

export const updateTwilioSettingsSchema = z.object({
  accountSid: nullableString(255),
  authToken: z.string().max(255).optional(),
  messagingServiceSid: nullableString(255),
  fromPhoneNumber: z.union([phoneSchema, z.null()]).optional(),
});

export type AdminPendingRegistrationParamsInput = z.infer<
  typeof adminPendingRegistrationParamsSchema
>;
export type UpdateRegistrationSettingsInput = z.infer<typeof updateRegistrationSettingsSchema>;
export type RejectPendingRegistrationInput = z.infer<typeof rejectPendingRegistrationSchema>;
export type AdminAuditLogsQueryInput = z.infer<typeof adminAuditLogsQuerySchema>;
export type AdminPendingRegistrationsQueryInput = z.infer<
  typeof adminPendingRegistrationsQuerySchema
>;
export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>;
export type UpdateTwilioSettingsInput = z.infer<typeof updateTwilioSettingsSchema>;
