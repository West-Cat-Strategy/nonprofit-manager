import { z } from 'zod';
import {
  emailSchema,
  optionalNullablePhnSchema,
  passwordSchema,
  phoneSchema,
  uuidSchema,
  optionalStrictBooleanSchema,
} from './shared';

const portalPasswordSchema = passwordSchema;
const portalResetTokenRegex = /^([a-fA-F0-9]{64}|[0-9a-fA-F-]{36}\.[a-fA-F0-9]{64})$/;
const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().max(max).optional()
  );

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

export const portalPasswordResetRequestSchema = z.object({
  email: emailSchema,
});

export const portalPasswordResetConfirmSchema = z
  .object({
    token: z.string().trim().regex(portalResetTokenRegex, 'Invalid reset token format'),
    password: portalPasswordSchema,
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  });

export const portalPasswordResetTokenParamsSchema = z.object({
  token: z.string().trim().regex(portalResetTokenRegex, 'Invalid reset token format'),
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
    phn: optionalNullablePhnSchema,
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
export const portalCaseTimelineQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    cursor: z.string().trim().max(512).optional(),
  })
  .strict();
export const portalCaseDocumentUploadSchema = z
  .object({
    document_type: optionalTrimmedString(100),
    document_name: optionalTrimmedString(255),
    description: optionalTrimmedString(2000),
  })
  .strict();
export const portalCaseEscalationSchema = z
  .object({
    category: z.string().trim().min(1).max(80).optional(),
    reason: z.string().trim().min(1).max(5000),
    severity: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    sensitivity: z.enum(['standard', 'sensitive']).optional(),
  })
  .strict();
export const portalEventParamsSchema = z.object({ eventId: uuidSchema });
export const portalAppointmentParamsSchema = z.object({ id: uuidSchema });
export const portalThreadParamsSchema = z.object({ threadId: uuidSchema });
export const portalSlotParamsSchema = z.object({ slotId: uuidSchema });

const portalPaginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .strict();

const portalListOrderSchema = z.enum(['asc', 'desc']);

const portalListQueryBaseSchema = portalPaginationQuerySchema
  .extend({
    search: z.string().trim().max(255).optional(),
    order: portalListOrderSchema.optional(),
  })
  .strict();

export const portalEventsQuerySchema = portalListQueryBaseSchema
  .extend({
    sort: z.enum(['start_date', 'name', 'created_at']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

export const portalDocumentsQuerySchema = portalListQueryBaseSchema
  .extend({
    sort: z.enum(['created_at', 'title', 'document_type', 'original_name']).optional(),
  })
  .strict();

export const portalFormsQuerySchema = portalListQueryBaseSchema
  .extend({
    sort: z.enum(['created_at', 'title', 'document_type', 'original_name']).optional(),
  })
  .strict();

export const portalNotesQuerySchema = portalListQueryBaseSchema
  .extend({
    sort: z.enum(['created_at', 'subject', 'note_type']).optional(),
  })
  .strict();

export const portalRemindersQuerySchema = portalListQueryBaseSchema
  .extend({
    sort: z.enum(['date', 'title', 'type']).optional(),
  })
  .strict();

export const portalThreadCreateSchema = z.object({
  case_id: uuidSchema.optional(),
  subject: z.string().max(255).optional().nullable(),
  message: z.string().trim().min(1).max(5000),
  client_message_id: uuidSchema.optional(),
});

export const portalThreadMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  client_message_id: uuidSchema.optional(),
});

export const portalThreadUpdateSchema = z
  .object({
    status: z.enum(['open', 'closed', 'archived']).optional(),
    pointperson_user_id: uuidSchema.optional().nullable(),
    case_id: uuidSchema.optional().nullable(),
    subject: z.string().max(255).optional().nullable(),
  })
  .strict();

export const portalPointpersonQuerySchema = z
  .object({
    case_id: uuidSchema.optional(),
  })
  .strict();

export const portalSlotQuerySchema = z
  .object({
    case_id: uuidSchema.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

export const portalThreadsQuerySchema = portalPaginationQuerySchema
  .extend({
    status: z.enum(['open', 'closed', 'archived']).optional(),
    case_id: uuidSchema.optional(),
    search: z.string().trim().max(255).optional(),
  })
  .strict();

export const portalAppointmentsQuerySchema = portalPaginationQuerySchema
  .extend({
    status: z.enum(['requested', 'confirmed', 'cancelled', 'completed']).optional(),
    case_id: uuidSchema.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    search: z.string().trim().max(255).optional(),
  })
  .strict();

export const portalRealtimeStreamQuerySchema = z
  .object({
    channels: z.string().trim().max(255).optional(),
  })
  .strict();

export const portalBookSlotSchema = z.object({
  case_id: uuidSchema.optional(),
  title: z.string().max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const portalManualAppointmentRequestSchema = z
  .object({
    case_id: uuidSchema.optional(),
    title: z.string().trim().min(1).max(255),
    start_time: z.string().datetime(),
    end_time: z.string().datetime().optional(),
    description: z.string().max(2000).optional().nullable(),
    location: z.string().max(255).optional().nullable(),
  })
  .strict()
  .refine(
    (data) =>
      !data.end_time || new Date(data.end_time).getTime() > new Date(data.start_time).getTime(),
    {
      message: 'end_time must be after start_time',
      path: ['end_time'],
    }
  );

export const portalAdminUserPatchSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const portalAdminUsersQuerySchema = z
  .object({
    search: z.string().trim().max(255).optional(),
  })
  .strict();

export const portalAdminUserActivityQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export const portalAdminRejectRequestSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const portalAdminApproveRequestSchema = z
  .object({
    contact_id: uuidSchema.optional(),
  })
  .strict();

export const portalAdminCreateInvitationSchema = z.object({
  email: emailSchema,
  contact_id: uuidSchema.optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

export const portalAdminResetPasswordSchema = z.object({
  portalUserId: uuidSchema,
  password: portalPasswordSchema,
});

export const portalAdminConversationQuerySchema = z
  .object({
    status: z.enum(['open', 'closed', 'archived']).optional(),
    case_id: uuidSchema.optional(),
    pointperson_user_id: uuidSchema.optional(),
    search: z.string().trim().max(255).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .strict();

export const queueViewSurfaceSchema = z.enum([
  'cases',
  'portal_appointments',
  'portal_conversations',
  'workbench',
]);

export const queueViewDefinitionQuerySchema = z
  .object({
    surface: queueViewSurfaceSchema,
  })
  .strict();

const queueViewRowActionSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(120),
    style: z.enum(['primary', 'secondary', 'danger']).optional(),
    permissionScope: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const queueViewDefinitionSchema = z
  .object({
    id: uuidSchema.optional(),
    surface: queueViewSurfaceSchema,
    name: z.string().trim().min(1).max(255),
    filters: z.record(z.string(), z.unknown()).optional(),
    columns: z.array(z.unknown()).optional(),
    sort: z.record(z.string(), z.unknown()).optional(),
    rowLimit: z.coerce.number().int().min(1).max(250).optional(),
    dashboardBehavior: z.record(z.string(), z.unknown()).optional(),
    rowActions: z.array(queueViewRowActionSchema).max(25).optional(),
    emptyState: z.record(z.string(), z.unknown()).optional(),
    permissionScope: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  })
  .strict();

export const scopedQueueViewDefinitionSchema = queueViewDefinitionSchema.omit({
  surface: true,
  permissionScope: true,
});

export const portalAdminQueueViewQuerySchema = queueViewDefinitionQuerySchema;
export const portalAdminQueueViewSchema = queueViewDefinitionSchema;

export const portalAdminSlotQuerySchema = z
  .object({
    status: z.enum(['open', 'closed', 'cancelled']).optional(),
    case_id: uuidSchema.optional(),
    pointperson_user_id: uuidSchema.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .strict();

export const portalAdminRealtimeStreamQuerySchema = z
  .object({
    channels: z.string().trim().max(255).optional(),
  })
  .strict();

export const portalAdminThreadMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  client_message_id: uuidSchema.optional(),
  is_internal: z.boolean().optional(),
});

export const portalAdminAppointmentStatusSchema = z.object({
  status: z.enum(['requested', 'confirmed', 'cancelled', 'completed']),
  resolution_note: z.string().trim().min(1).optional(),
  outcome_definition_ids: z.array(uuidSchema).optional(),
  outcome_visibility: optionalStrictBooleanSchema,
});

export const portalAdminAppointmentCheckInSchema = z
  .object({
    resolution_note: z.string().trim().min(1).optional(),
    outcome_definition_ids: z.array(uuidSchema).optional(),
    outcome_visibility: optionalStrictBooleanSchema,
  })
  .strict()
  .default({});

export const portalAdminAppointmentsQuerySchema = z
  .object({
    status: z.enum(['requested', 'confirmed', 'cancelled', 'completed']).optional(),
    request_type: z.enum(['manual_request', 'slot_booking']).optional(),
    case_id: uuidSchema.optional(),
    pointperson_user_id: uuidSchema.optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).max(10_000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const portalAdminReminderSendSchema = z
  .object({
    sendEmail: optionalStrictBooleanSchema,
    sendSms: optionalStrictBooleanSchema,
    customMessage: z.string().max(500).optional(),
  })
  .strict()
  .refine((data) => data.sendEmail !== false || data.sendSms !== false, {
    message: 'At least one reminder channel must be enabled',
    path: ['sendEmail'],
  });

export const portalAdminSlotCreateSchema = z
  .object({
    pointperson_user_id: uuidSchema,
    case_id: uuidSchema.optional().nullable(),
    title: z.string().max(255).optional().nullable(),
    details: z.string().max(2000).optional().nullable(),
    location: z.string().max(255).optional().nullable(),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    capacity: z.number().int().min(1).max(200).optional(),
  })
  .strict()
  .refine((data) => new Date(data.end_time).getTime() > new Date(data.start_time).getTime(), {
    message: 'end_time must be after start_time',
    path: ['end_time'],
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
  .strict()
  .refine(
    (data) =>
      !(data.start_time && data.end_time) ||
      new Date(data.end_time).getTime() > new Date(data.start_time).getTime(),
    {
      message: 'end_time must be after start_time',
      path: ['end_time'],
    }
  );

export const casePortalConversationParamsSchema = z.object({
  id: uuidSchema,
});

export const casePortalConversationMessageParamsSchema = z.object({
  id: uuidSchema,
  threadId: uuidSchema,
});

export const casePortalConversationMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  client_message_id: uuidSchema.optional(),
  is_internal: z.boolean().optional(),
});

export const portalEscalationParamsSchema = z.object({
  id: uuidSchema,
  escalationId: uuidSchema,
});

export const portalCaseEscalationUpdateSchema = z
  .object({
    status: z.enum(['open', 'in_review', 'resolved', 'referred']).optional(),
    resolution_summary: z.string().trim().max(5000).optional().nullable(),
    assignee_user_id: uuidSchema.optional().nullable(),
    sla_due_at: z.string().datetime().optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one escalation field is required',
  });
