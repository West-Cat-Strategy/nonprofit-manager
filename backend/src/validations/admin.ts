import { z } from 'zod';
import { emailSchema, phoneSchema, uuidSchema, optionalStrictBooleanSchema } from './shared';
import { WORKSPACE_MODULE_KEYS } from '@app-types/workspaceModules';
import { userRoleSchema } from './user';

const nullableString = (maxLength = 255) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }, z.union([z.string().max(maxLength), z.null()]).optional());

const nullableTwilioSid = (prefix: 'AC' | 'MG', errorMessage: string) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }, z.string().regex(new RegExp(`^${prefix}[0-9a-fA-F]{32}$`), errorMessage).nullable().optional());

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
  defaultRole: userRoleSchema.optional(),
});

export const adminRoleParamsSchema = z.object({
  id: uuidSchema,
});

export const adminRoleCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    permissions: z.array(z.string().trim().min(1).max(255)).optional(),
  })
  .strict();

export const adminRoleUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    permissions: z.array(z.string().trim().min(1).max(255)).optional(),
  })
  .strict();

export const adminUserAuditLogsParamsSchema = z.object({
  id: uuidSchema,
});

export const rejectPendingRegistrationSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const adminAuditLogsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).max(5000).default(0),
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
  accountSid: nullableTwilioSid('AC', 'Invalid Twilio Account SID format'),
  authToken: z.string().max(255).optional(),
  messagingServiceSid: nullableTwilioSid(
    'MG',
    'Invalid Twilio Messaging Service SID format'
  ),
  fromPhoneNumber: z.preprocess((value) => {
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }, z.union([phoneSchema, z.null()]).optional()),
});

const settingsAddressSchema = z.object({
  line1: z.string().trim().max(255),
  line2: z.string().trim().max(255),
  city: z.string().trim().max(100),
  province: z.string().trim().max(100),
  postalCode: z.string().trim().max(20),
  country: z.string().trim().max(100),
});

const optionalEmailOrBlankSchema = z.union([emailSchema, z.literal('')]);

const workspaceModuleSettingsSchema = z
  .object(
    Object.fromEntries(
      WORKSPACE_MODULE_KEYS.map((key) => [key, z.boolean().optional()])
    ) as Record<(typeof WORKSPACE_MODULE_KEYS)[number], z.ZodOptional<z.ZodBoolean>>
  )
  .strict();

export const organizationTaxReceiptSettingsSchema = z
  .object({
    legalName: z.string().trim().max(255),
    charitableRegistrationNumber: z.string().trim().max(50),
    receiptingAddress: settingsAddressSchema,
    receiptIssueLocation: z.string().trim().max(255),
    authorizedSignerName: z.string().trim().max(255),
    authorizedSignerTitle: z.string().trim().max(255),
    contactEmail: optionalEmailOrBlankSchema,
    contactPhone: z.string().trim().max(50),
    advantageAmount: z.coerce.number().min(0).max(999999999).default(0),
  })
  .strict();

export const organizationSettingsConfigSchema = z
  .object({
    name: z.string().trim().max(255),
    email: optionalEmailOrBlankSchema,
    phone: z.string().trim().max(50),
    website: z.string().trim().max(255),
    address: settingsAddressSchema,
    timezone: z.string().trim().max(100),
    dateFormat: z.string().trim().max(50),
    currency: z.string().trim().length(3),
    fiscalYearStart: z.string().trim().regex(/^(0[1-9]|1[0-2])$/),
    measurementSystem: z.enum(['metric', 'imperial']),
    phoneFormat: z.enum(['canadian', 'us', 'international']),
    taxReceipt: organizationTaxReceiptSettingsSchema,
    workspaceModules: workspaceModuleSettingsSchema.optional(),
  })
  .strict();

export const updateOrganizationSettingsSchema = z
  .object({
    config: organizationSettingsConfigSchema,
  })
  .strict();

export type AdminPendingRegistrationParamsInput = z.infer<
  typeof adminPendingRegistrationParamsSchema
>;
export type UpdateRegistrationSettingsInput = z.infer<typeof updateRegistrationSettingsSchema>;
export type AdminRoleParamsInput = z.infer<typeof adminRoleParamsSchema>;
export type AdminRoleCreateInput = z.infer<typeof adminRoleCreateSchema>;
export type AdminRoleUpdateInput = z.infer<typeof adminRoleUpdateSchema>;
export type AdminUserAuditLogsParamsInput = z.infer<typeof adminUserAuditLogsParamsSchema>;
export type RejectPendingRegistrationInput = z.infer<typeof rejectPendingRegistrationSchema>;
export type AdminAuditLogsQueryInput = z.infer<typeof adminAuditLogsQuerySchema>;
export type AdminPendingRegistrationsQueryInput = z.infer<
  typeof adminPendingRegistrationsQuerySchema
>;
export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>;
export type UpdateTwilioSettingsInput = z.infer<typeof updateTwilioSettingsSchema>;
export type OrganizationSettingsConfigInput = z.infer<typeof organizationSettingsConfigSchema>;
export type OrganizationTaxReceiptSettingsInput = z.infer<
  typeof organizationTaxReceiptSettingsSchema
>;
export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;
