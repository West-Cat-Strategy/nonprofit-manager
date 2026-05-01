import { z } from 'zod';
import type { CaseFormAssignmentStatusBucket } from '@app-types/caseForms';
import { isoDateTimeSchema, optionalStrictBooleanSchema, uuidSchema } from './shared';

export const caseFormQuestionTypeSchema = z.enum([
  'text',
  'textarea',
  'email',
  'phone',
  'number',
  'date',
  'select',
  'radio',
  'checkbox',
  'file',
  'signature',
]);

export const caseFormLogicOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'answered',
  'not_answered',
  'truthy',
  'falsy',
]);

export const caseFormAssignmentStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'in_progress',
  'submitted',
  'revision_requested',
  'reviewed',
  'closed',
  'expired',
  'cancelled',
]);

export const caseFormAssignmentStatusBucketSchema: z.ZodType<CaseFormAssignmentStatusBucket> = z.enum([
  'active',
  'completed',
]);

export const caseFormAssetKindSchema = z.enum(['upload', 'signature']);
export const caseFormDeliveryTargetSchema = z.enum(['portal', 'email', 'portal_and_email']);
export const caseFormDeliveryChannelSchema = z.enum(['portal', 'email', 'sms']);
export const caseFormTemplateStatusSchema = z.enum(['draft', 'published', 'archived']);

export const caseFormLogicRuleSchema = z
  .object({
    question_key: z.string().trim().min(1).max(120),
    operator: caseFormLogicOperatorSchema,
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]).optional(),
  })
  .strict();

export const caseFormMappingTargetSchema = z
  .object({
    entity: z.enum(['contact', 'case']),
    field: z.string().trim().min(1).max(120).optional(),
    container: z.enum(['intake_data', 'custom_data']).optional(),
    key: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const caseFormQuestionOptionSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    value: z.string().trim().min(1).max(200),
  })
  .strict();

export const caseFormQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    key: z.string().trim().min(1).max(120),
    type: caseFormQuestionTypeSchema,
    label: z.string().trim().min(1).max(255),
    helper_text: z.string().trim().max(1000).nullable().optional(),
    placeholder: z.string().trim().max(255).nullable().optional(),
    required: optionalStrictBooleanSchema,
    multiple: optionalStrictBooleanSchema,
    options: z.array(caseFormQuestionOptionSchema).max(100).optional(),
    visible_when: z.array(caseFormLogicRuleSchema).max(20).optional(),
    mapping_target: caseFormMappingTargetSchema.nullable().optional(),
    upload_config: z
      .object({
        max_files: z.coerce.number().int().min(1).max(20).optional(),
        accept: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

export const caseFormSectionSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).nullable().optional(),
    questions: z.array(caseFormQuestionSchema).min(1).max(100),
  })
  .strict();

export const caseFormSchemaSchema = z
  .object({
    version: z.coerce.number().int().min(1).default(1),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).nullable().optional(),
    sections: z.array(caseFormSectionSchema).min(1).max(50),
  })
  .strict();

export const createCaseFormDefaultSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).optional(),
    schema: caseFormSchemaSchema,
    is_active: optionalStrictBooleanSchema,
    case_type_id: uuidSchema.nullable().optional(),
    template_status: caseFormTemplateStatusSchema.optional(),
    saved_from_assignment_id: uuidSchema.nullable().optional(),
  })
  .strict();

export const updateCaseFormDefaultSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    schema: caseFormSchemaSchema.optional(),
    is_active: optionalStrictBooleanSchema,
    case_type_id: uuidSchema.nullable().optional(),
    template_status: caseFormTemplateStatusSchema.optional(),
    autosave: optionalStrictBooleanSchema,
  })
  .strict()
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export const createCaseFormAssignmentSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).optional(),
    schema: caseFormSchemaSchema,
    case_type_id: uuidSchema.optional(),
    due_at: isoDateTimeSchema.optional(),
    recipient_email: z.string().trim().email().optional(),
    recipient_phone: z.string().trim().min(7).max(50).optional(),
    source_default_id: uuidSchema.optional(),
  })
  .strict();

export const updateCaseFormAssignmentSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    schema: caseFormSchemaSchema.optional(),
    due_at: isoDateTimeSchema.nullable().optional(),
    recipient_email: z.string().trim().email().nullable().optional(),
    recipient_phone: z.string().trim().min(7).max(50).nullable().optional(),
    status: caseFormAssignmentStatusSchema.optional(),
    autosave: optionalStrictBooleanSchema,
  })
  .strict()
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export const caseFormDraftSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
  })
  .strict();

export const caseFormSubmitSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
    client_submission_id: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const caseFormSendSchema = z
  .object({
    delivery_target: caseFormDeliveryTargetSchema.optional(),
    delivery_channels: z.array(caseFormDeliveryChannelSchema).min(1).max(3).optional(),
    recipient_email: z.string().trim().email().optional(),
    recipient_phone: z.string().trim().min(7).max(50).optional(),
    expires_in_days: z.coerce.number().int().min(1).max(30).optional(),
  })
  .strict()
  .refine((payload) => payload.delivery_target !== undefined || payload.delivery_channels !== undefined, {
    message: 'At least one delivery channel is required',
    path: ['delivery_channels'],
  });

export const caseFormReviewDecisionSchema = z
  .object({
    decision: z.enum(['revision_requested', 'reviewed', 'closed', 'cancelled']),
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.decision === 'revision_requested' && !payload.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notes'],
        message: 'Revision notes are required when requesting changes.',
      });
    }
  });

export const caseFormAssetUploadSchema = z
  .object({
    question_key: z.string().trim().min(1).max(120),
    asset_kind: caseFormAssetKindSchema,
  })
  .strict();

export const caseFormCaseTypeParamsSchema = z
  .object({
    caseTypeId: uuidSchema,
  })
  .strict();

export const caseFormDefaultParamsSchema = z
  .object({
    defaultId: uuidSchema,
  })
  .strict();

export const caseFormTemplateListQuerySchema = z
  .object({
    status: caseFormTemplateStatusSchema.optional(),
    case_type_id: uuidSchema.optional(),
  })
  .strict();

export const caseFormCaseParamsSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const caseFormAssignmentParamsSchema = z
  .object({
    id: uuidSchema,
    assignmentId: uuidSchema,
  })
  .strict();

export const caseFormAssetParamsSchema = z
  .object({
    id: uuidSchema.optional(),
    assignmentId: uuidSchema,
    assetId: uuidSchema,
  })
  .strict();

export const caseFormPortalParamsSchema = z
  .object({
    assignmentId: uuidSchema,
  })
  .strict();

export const caseFormTokenParamsSchema = z
  .object({
    token: z.string().trim().min(32).max(255),
  })
  .strict();

export const caseFormListQuerySchema = z
  .object({
    status: z.union([caseFormAssignmentStatusSchema, caseFormAssignmentStatusBucketSchema]).optional(),
  })
  .strict();
