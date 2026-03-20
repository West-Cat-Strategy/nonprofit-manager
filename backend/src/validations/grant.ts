import { z } from 'zod';
import {
  GRANT_AWARD_STATUSES,
  GRANT_APPLICATION_STATUSES,
  GRANT_DISBURSEMENT_STATUSES,
  GRANT_FUNDING_FREQUENCIES,
  GRANT_JURISDICTIONS,
  GRANT_PROGRAM_STATUSES,
  GRANT_RECIPIENT_STATUSES,
  GRANT_REPORT_STATUSES,
} from '@app-types/grant';
import { emailSchema, isoDateSchema, optionalStrictBooleanSchema, uuidSchema } from './shared';

const emptyStringToUndefined = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const emptyStringToNull = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const optionalTextSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().optional()
);

const optionalNullableTextSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().nullable().optional()
);

const optionalNullableEmailSchema = z.preprocess(
  emptyStringToNull,
  emailSchema.nullable().optional()
);

const optionalNullableDateSchema = z.preprocess(
  emptyStringToNull,
  isoDateSchema.nullable().optional()
);

const optionalNumberSchema = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return value;
  },
  z.coerce.number().nonnegative().optional()
);

const requiredJurisdictionSchema = z.enum(GRANT_JURISDICTIONS);
const optionalJurisdictionSchema = z.enum(GRANT_JURISDICTIONS).optional();
const grantProgramStatusSchema = z.enum(GRANT_PROGRAM_STATUSES);
const grantRecipientStatusSchema = z.enum(GRANT_RECIPIENT_STATUSES);
const grantApplicationStatusSchema = z.enum(GRANT_APPLICATION_STATUSES);
const grantAwardStatusSchema = z.enum(GRANT_AWARD_STATUSES);
const grantDisbursementStatusSchema = z.enum(GRANT_DISBURSEMENT_STATUSES);
const grantReportStatusSchema = z.enum(GRANT_REPORT_STATUSES);
const grantReportingFrequencySchema = z.enum(GRANT_FUNDING_FREQUENCIES);

const grantListQuerySchemaBase = z
  .object({
    search: optionalTextSchema,
    status: optionalTextSchema,
    funder_id: uuidSchema.optional(),
    program_id: uuidSchema.optional(),
    recipient_organization_id: uuidSchema.optional(),
    funded_program_id: uuidSchema.optional(),
    jurisdiction: optionalJurisdictionSchema,
    fiscal_year: optionalTextSchema,
    due_before: isoDateSchema.optional(),
    due_after: isoDateSchema.optional(),
    min_amount: optionalNumberSchema,
    max_amount: optionalNumberSchema,
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort_by: optionalTextSchema,
    sort_order: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export const grantSummaryQuerySchema = z
  .object({
    jurisdiction: optionalJurisdictionSchema,
    fiscal_year: optionalTextSchema,
  })
  .strict();

export const grantCalendarQuerySchema = z
  .object({
    start_date: isoDateSchema.optional(),
    end_date: isoDateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const grantExportQuerySchema = grantListQuerySchemaBase.extend({
  format: z.enum(['csv', 'xlsx']).optional(),
});

export const grantListQuerySchema = grantListQuerySchemaBase;

export const grantIdParamsSchema = z.object({
  id: uuidSchema,
});

export const grantItemIdParamsSchema = z.object({
  id: uuidSchema,
  itemId: uuidSchema.optional(),
});

export const grantFunderCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    jurisdiction: requiredJurisdictionSchema,
    funder_type: optionalTextSchema,
    contact_name: optionalTextSchema,
    contact_email: optionalNullableEmailSchema,
    contact_phone: optionalTextSchema,
    website: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
    active: optionalStrictBooleanSchema,
  })
  .strict();

export const grantFunderUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    jurisdiction: requiredJurisdictionSchema.optional(),
    funder_type: optionalNullableTextSchema,
    contact_name: optionalNullableTextSchema,
    contact_email: optionalNullableEmailSchema,
    contact_phone: optionalNullableTextSchema,
    website: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
    active: optionalStrictBooleanSchema,
  })
  .strict();

export const grantProgramCreateSchema = z
  .object({
    funder_id: uuidSchema,
    name: z.string().trim().min(1),
    program_code: optionalTextSchema,
    fiscal_year: optionalTextSchema,
    jurisdiction: requiredJurisdictionSchema,
    status: grantProgramStatusSchema.optional(),
    application_open_at: optionalNullableDateSchema,
    application_due_at: optionalNullableDateSchema,
    award_date: optionalNullableDateSchema,
    expiry_date: optionalNullableDateSchema,
    total_budget: optionalNumberSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantProgramUpdateSchema = z
  .object({
    funder_id: uuidSchema.optional(),
    name: z.string().trim().min(1).optional(),
    program_code: optionalNullableTextSchema,
    fiscal_year: optionalNullableTextSchema,
    jurisdiction: requiredJurisdictionSchema.optional(),
    status: grantProgramStatusSchema.optional(),
    application_open_at: optionalNullableDateSchema,
    application_due_at: optionalNullableDateSchema,
    award_date: optionalNullableDateSchema,
    expiry_date: optionalNullableDateSchema,
    total_budget: optionalNumberSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const recipientOrganizationCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    legal_name: optionalNullableTextSchema,
    jurisdiction: optionalJurisdictionSchema,
    province: optionalNullableTextSchema,
    city: optionalNullableTextSchema,
    contact_name: optionalTextSchema,
    contact_email: optionalNullableEmailSchema,
    contact_phone: optionalTextSchema,
    website: optionalNullableTextSchema,
    status: grantRecipientStatusSchema.optional(),
    notes: optionalNullableTextSchema,
    active: optionalStrictBooleanSchema,
  })
  .strict();

export const recipientOrganizationUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    legal_name: optionalNullableTextSchema,
    jurisdiction: optionalJurisdictionSchema,
    province: optionalNullableTextSchema,
    city: optionalNullableTextSchema,
    contact_name: optionalNullableTextSchema,
    contact_email: optionalNullableEmailSchema,
    contact_phone: optionalNullableTextSchema,
    website: optionalNullableTextSchema,
    status: grantRecipientStatusSchema.optional(),
    notes: optionalNullableTextSchema,
    active: optionalStrictBooleanSchema,
  })
  .strict();

export const fundedProgramCreateSchema = z
  .object({
    recipient_organization_id: uuidSchema,
    name: z.string().trim().min(1),
    description: optionalNullableTextSchema,
    owner_user_id: uuidSchema.optional(),
    status: z.enum(['planned', 'active', 'paused', 'complete', 'archived']).optional(),
    start_date: optionalNullableDateSchema,
    end_date: optionalNullableDateSchema,
    budget: optionalNumberSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const fundedProgramUpdateSchema = z
  .object({
    recipient_organization_id: uuidSchema.optional(),
    name: z.string().trim().min(1).optional(),
    description: optionalNullableTextSchema,
    owner_user_id: uuidSchema.optional(),
    status: z.enum(['planned', 'active', 'paused', 'complete', 'archived']).optional(),
    start_date: optionalNullableDateSchema,
    end_date: optionalNullableDateSchema,
    budget: optionalNumberSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantApplicationCreateSchema = z
  .object({
    application_number: optionalTextSchema,
    title: z.string().trim().min(1),
    funder_id: uuidSchema,
    program_id: uuidSchema.optional(),
    recipient_organization_id: uuidSchema.optional(),
    funded_program_id: uuidSchema.optional(),
    status: grantApplicationStatusSchema.optional(),
    requested_amount: z.coerce.number().nonnegative(),
    approved_amount: optionalNumberSchema,
    currency: z.string().trim().length(3).optional(),
    submitted_at: optionalNullableDateSchema,
    reviewed_at: optionalNullableDateSchema,
    decision_at: optionalNullableDateSchema,
    due_at: optionalNullableDateSchema,
    outcome_reason: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantApplicationUpdateSchema = z
  .object({
    application_number: optionalNullableTextSchema,
    title: z.string().trim().min(1).optional(),
    funder_id: uuidSchema.optional(),
    program_id: uuidSchema.optional(),
    recipient_organization_id: uuidSchema.optional(),
    funded_program_id: uuidSchema.optional(),
    status: grantApplicationStatusSchema.optional(),
    requested_amount: optionalNumberSchema,
    approved_amount: optionalNumberSchema,
    currency: z.string().trim().length(3).optional(),
    submitted_at: optionalNullableDateSchema,
    reviewed_at: optionalNullableDateSchema,
    decision_at: optionalNullableDateSchema,
    due_at: optionalNullableDateSchema,
    outcome_reason: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantApplicationStatusUpdateSchema = z
  .object({
    status: grantApplicationStatusSchema,
    reviewed_at: optionalNullableDateSchema,
    decision_at: optionalNullableDateSchema,
    approved_amount: optionalNumberSchema,
    outcome_reason: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantAwardCreateSchema = z
  .object({
    grant_number: optionalTextSchema,
    title: z.string().trim().min(1),
    application_id: uuidSchema.optional(),
    funder_id: uuidSchema,
    program_id: uuidSchema.optional(),
    recipient_organization_id: uuidSchema.optional(),
    funded_program_id: uuidSchema.optional(),
    status: grantAwardStatusSchema.optional(),
    amount: z.coerce.number().nonnegative(),
    committed_amount: optionalNumberSchema,
    currency: z.string().trim().length(3).optional(),
    fiscal_year: optionalNullableTextSchema,
    jurisdiction: requiredJurisdictionSchema,
    award_date: optionalNullableDateSchema,
    reviewed_at: optionalNullableDateSchema,
    decision_at: optionalNullableDateSchema,
    start_date: optionalNullableDateSchema,
    end_date: optionalNullableDateSchema,
    expiry_date: optionalNullableDateSchema,
    reporting_frequency: grantReportingFrequencySchema.optional(),
    next_report_due_at: optionalNullableDateSchema,
    closeout_due_at: optionalNullableDateSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantAwardUpdateSchema = z
  .object({
    grant_number: optionalNullableTextSchema,
    title: z.string().trim().min(1).optional(),
    application_id: uuidSchema.optional(),
    funder_id: uuidSchema.optional(),
    program_id: uuidSchema.optional(),
    recipient_organization_id: uuidSchema.optional(),
    funded_program_id: uuidSchema.optional(),
    status: grantAwardStatusSchema.optional(),
    amount: optionalNumberSchema,
    committed_amount: optionalNumberSchema,
    disbursed_amount: optionalNumberSchema,
    currency: z.string().trim().length(3).optional(),
    fiscal_year: optionalNullableTextSchema,
    jurisdiction: requiredJurisdictionSchema.optional(),
    award_date: optionalNullableDateSchema,
    start_date: optionalNullableDateSchema,
    end_date: optionalNullableDateSchema,
    expiry_date: optionalNullableDateSchema,
    reporting_frequency: grantReportingFrequencySchema.optional(),
    next_report_due_at: optionalNullableDateSchema,
    closeout_due_at: optionalNullableDateSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantDisbursementCreateSchema = z
  .object({
    grant_id: uuidSchema,
    tranche_label: optionalNullableTextSchema,
    scheduled_date: optionalNullableDateSchema,
    paid_at: optionalNullableDateSchema,
    amount: z.coerce.number().nonnegative(),
    currency: z.string().trim().length(3).optional(),
    status: grantDisbursementStatusSchema.optional(),
    method: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantDisbursementUpdateSchema = z
  .object({
    grant_id: uuidSchema.optional(),
    tranche_label: optionalNullableTextSchema,
    scheduled_date: optionalNullableDateSchema,
    paid_at: optionalNullableDateSchema,
    amount: optionalNumberSchema,
    currency: z.string().trim().length(3).optional(),
    status: grantDisbursementStatusSchema.optional(),
    method: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantReportCreateSchema = z
  .object({
    grant_id: uuidSchema,
    report_type: optionalTextSchema,
    period_start: optionalNullableDateSchema,
    period_end: optionalNullableDateSchema,
    due_at: isoDateSchema,
    submitted_at: optionalNullableDateSchema,
    status: grantReportStatusSchema.optional(),
    summary: optionalNullableTextSchema,
    outstanding_items: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantReportUpdateSchema = z
  .object({
    grant_id: uuidSchema.optional(),
    report_type: optionalNullableTextSchema,
    period_start: optionalNullableDateSchema,
    period_end: optionalNullableDateSchema,
    due_at: isoDateSchema.optional(),
    submitted_at: optionalNullableDateSchema,
    status: grantReportStatusSchema.optional(),
    summary: optionalNullableTextSchema,
    outstanding_items: optionalNullableTextSchema,
    notes: optionalNullableTextSchema,
  })
  .strict();

export const grantDocumentCreateSchema = z
  .object({
    grant_id: uuidSchema.optional(),
    application_id: uuidSchema.optional(),
    report_id: uuidSchema.optional(),
    document_type: z.string().trim().min(1),
    file_name: z.string().trim().min(1),
    file_url: z.string().trim().min(1),
    mime_type: z.string().trim().min(1),
    file_size: z.coerce.number().int().nonnegative(),
    notes: optionalNullableTextSchema,
    uploaded_by: uuidSchema.optional(),
  })
  .strict();

export const grantDocumentUpdateSchema = z
  .object({
    grant_id: uuidSchema.optional(),
    application_id: uuidSchema.optional(),
    report_id: uuidSchema.optional(),
    document_type: z.string().trim().min(1).optional(),
    file_name: z.string().trim().min(1).optional(),
    file_url: z.string().trim().min(1).optional(),
    mime_type: z.string().trim().min(1).optional(),
    file_size: z.coerce.number().int().nonnegative().optional(),
    notes: optionalNullableTextSchema,
    uploaded_by: uuidSchema.optional(),
  })
  .strict();

export const grantActivityLogCreateSchema = z
  .object({
    grant_id: uuidSchema.optional(),
    entity_type: z.string().trim().min(1),
    entity_id: uuidSchema.optional(),
    action: z.string().trim().min(1),
    notes: optionalNullableTextSchema,
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type GrantListQueryInput = z.infer<typeof grantListQuerySchema>;
export type GrantSummaryQueryInput = z.infer<typeof grantSummaryQuerySchema>;
export type GrantCalendarQueryInput = z.infer<typeof grantCalendarQuerySchema>;
export type GrantExportQueryInput = z.infer<typeof grantExportQuerySchema>;
export type GrantFunderCreateInput = z.infer<typeof grantFunderCreateSchema>;
export type GrantFunderUpdateInput = z.infer<typeof grantFunderUpdateSchema>;
export type GrantProgramCreateInput = z.infer<typeof grantProgramCreateSchema>;
export type GrantProgramUpdateInput = z.infer<typeof grantProgramUpdateSchema>;
export type GrantRecipientCreateInput = z.infer<typeof recipientOrganizationCreateSchema>;
export type GrantRecipientUpdateInput = z.infer<typeof recipientOrganizationUpdateSchema>;
export type FundedProgramCreateInput = z.infer<typeof fundedProgramCreateSchema>;
export type FundedProgramUpdateInput = z.infer<typeof fundedProgramUpdateSchema>;
export type GrantApplicationCreateInput = z.infer<typeof grantApplicationCreateSchema>;
export type GrantApplicationUpdateInput = z.infer<typeof grantApplicationUpdateSchema>;
export type GrantApplicationStatusUpdateInput = z.infer<typeof grantApplicationStatusUpdateSchema>;
export type GrantAwardCreateInput = z.infer<typeof grantAwardCreateSchema>;
export type GrantAwardUpdateInput = z.infer<typeof grantAwardUpdateSchema>;
export type GrantDisbursementCreateInput = z.infer<typeof grantDisbursementCreateSchema>;
export type GrantDisbursementUpdateInput = z.infer<typeof grantDisbursementUpdateSchema>;
export type GrantReportCreateInput = z.infer<typeof grantReportCreateSchema>;
export type GrantReportUpdateInput = z.infer<typeof grantReportUpdateSchema>;
export type GrantDocumentCreateInput = z.infer<typeof grantDocumentCreateSchema>;
export type GrantDocumentUpdateInput = z.infer<typeof grantDocumentUpdateSchema>;
export type GrantActivityLogCreateInput = z.infer<typeof grantActivityLogCreateSchema>;
