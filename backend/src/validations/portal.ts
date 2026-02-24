import { z } from 'zod';
import { emailSchema, phoneSchema, uuidSchema } from './shared';

const portalPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[@$!%*?&]/, 'Password must contain at least one special character');

export const portalSignupSchema = z.object({
  email: emailSchema,
  password: portalPasswordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: phoneSchema,
});

export const portalLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const portalInvitationTokenParamsSchema = z.object({
  token: z.string().min(1),
});

export const acceptPortalInvitationSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: portalPasswordSchema,
});

export const portalChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: portalPasswordSchema,
});

export const portalProfileUpdateSchema = z
  .object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    email: emailSchema.optional(),
    phone: phoneSchema,
    mobile_phone: phoneSchema,
    address_line1: z.string().max(255).optional().nullable(),
    address_line2: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state_province: z.string().max(100).optional().nullable(),
    postal_code: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    preferred_contact_method: z.string().max(50).optional().nullable(),
    pronouns: z.string().max(50).optional().nullable(),
    gender: z.string().max(50).optional().nullable(),
    profile_picture: z.string().max(8_000_000).optional().nullable(),
  })
  .strict();

export const portalRelationshipCreateSchema = z.object({
  relationship_type: z.string().min(1).max(50),
  relationship_label: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  related_contact_id: uuidSchema.optional(),
  related_contact: z
    .object({
      first_name: z.string().min(1).max(100),
      last_name: z.string().min(1).max(100),
      email: emailSchema.optional(),
      phone: phoneSchema,
    })
    .optional(),
});

export const portalRelationshipUpdateSchema = z
  .object({
    relationship_type: z.string().min(1).max(50).optional(),
    relationship_label: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .strict();

export const portalUuidParamsSchema = z.object({ id: uuidSchema });
export const portalCaseParamsSchema = z.object({ id: uuidSchema });
export const portalCaseDocumentDownloadParamsSchema = z.object({
  id: uuidSchema,
  documentId: uuidSchema,
});
export const portalEventParamsSchema = z.object({ eventId: uuidSchema });
export const portalAppointmentParamsSchema = z.object({ id: uuidSchema });
export const portalThreadParamsSchema = z.object({ threadId: uuidSchema });
export const portalSlotParamsSchema = z.object({ slotId: uuidSchema });

export const portalThreadCreateSchema = z.object({
  case_id: uuidSchema.optional(),
  subject: z.string().max(255).optional().nullable(),
  message: z.string().trim().min(1).max(5000),
});

export const portalThreadMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export const portalThreadUpdateSchema = z
  .object({
    status: z.enum(['open', 'closed', 'archived']).optional(),
    pointperson_user_id: uuidSchema.optional().nullable(),
    case_id: uuidSchema.optional().nullable(),
    subject: z.string().max(255).optional().nullable(),
  })
  .strict();

export const portalPointpersonQuerySchema = z.object({
  case_id: uuidSchema.optional(),
});

export const portalSlotQuerySchema = z.object({
  case_id: uuidSchema.optional(),
});

export const portalBookSlotSchema = z.object({
  case_id: uuidSchema.optional(),
  title: z.string().max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const portalManualAppointmentRequestSchema = z.object({
  case_id: uuidSchema.optional(),
  title: z.string().trim().min(1).max(255),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
});

export const portalAdminUserPatchSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const portalAdminRejectRequestSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const portalAdminCreateInvitationSchema = z.object({
  email: emailSchema,
  contact_id: uuidSchema.optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

export const portalAdminResetPasswordSchema = z.object({
  portalUserId: uuidSchema,
  password: portalPasswordSchema,
});

export const portalAdminConversationQuerySchema = z.object({
  status: z.enum(['open', 'closed', 'archived']).optional(),
  case_id: uuidSchema.optional(),
  pointperson_user_id: uuidSchema.optional(),
});

export const portalAdminSlotQuerySchema = z.object({
  status: z.enum(['open', 'closed', 'cancelled']).optional(),
  case_id: uuidSchema.optional(),
  pointperson_user_id: uuidSchema.optional(),
});

export const portalAdminThreadMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  is_internal: z.boolean().optional(),
});

export const portalAdminAppointmentStatusSchema = z.object({
  status: z.enum(['requested', 'confirmed', 'cancelled', 'completed']),
});

export const portalAdminSlotCreateSchema = z.object({
  pointperson_user_id: uuidSchema,
  case_id: uuidSchema.optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  details: z.string().max(2000).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  capacity: z.number().int().min(1).max(200).optional(),
});

export const portalAdminSlotPatchSchema = z
  .object({
    pointperson_user_id: uuidSchema.optional(),
    case_id: uuidSchema.optional().nullable(),
    title: z.string().max(255).optional().nullable(),
    details: z.string().max(2000).optional().nullable(),
    location: z.string().max(255).optional().nullable(),
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
    capacity: z.number().int().min(1).max(200).optional(),
    status: z.enum(['open', 'closed', 'cancelled']).optional(),
  })
  .strict();

export const casePortalConversationParamsSchema = z.object({
  id: uuidSchema,
});

export const casePortalConversationMessageParamsSchema = z.object({
  id: uuidSchema,
  threadId: uuidSchema,
});

export const casePortalConversationMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  is_internal: z.boolean().optional(),
});
