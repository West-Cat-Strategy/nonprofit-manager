import { z } from 'zod';
import { interactionOutcomeImpactItemSchema } from '@validations/outcomeImpact';
import {
  isoDateSchema,
  isoDateTimeSchema,
  optionalStrictBooleanSchema,
  strictBooleanSchema,
  uuidSchema,
} from '@validations/shared';

const casePrioritySchema = z.enum(['low', 'medium', 'high', 'urgent', 'critical']);
const caseOutcomeSchema = z.enum([
  'successful',
  'unsuccessful',
  'referred',
  'withdrawn',
  'attended_event',
  'additional_related_case',
  'other',
]);
const quickFilterSchema = z.enum(['active', 'overdue', 'due_soon', 'unassigned', 'urgent']);
const noteTypeSchema = z.enum([
  'note',
  'email',
  'call',
  'meeting',
  'update',
  'status_change',
  'case_note',
  'assignment',
  'system',
  'portal_message',
]);

const dateStringSchema = isoDateSchema;
const dateTimeStringSchema = isoDateTimeSchema;
const outcomesModeSchema = z.enum(['replace', 'merge']);

export const caseIdParamsSchema = z.object({
  id: uuidSchema,
});

export const caseReassessmentParamsSchema = z.object({
  id: uuidSchema,
  reassessmentId: uuidSchema,
});

const caseReassessmentStatusUpdateSchema = z.enum(['scheduled', 'in_progress']);

export const createCaseReassessmentSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().nullable().optional(),
    earliest_review_date: dateStringSchema.nullable().optional(),
    due_date: dateStringSchema,
    latest_review_date: dateStringSchema.nullable().optional(),
    owner_user_id: uuidSchema.nullable().optional(),
  })
  .strict();

export const updateCaseReassessmentSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    summary: z.string().trim().nullable().optional(),
    earliest_review_date: dateStringSchema.nullable().optional(),
    due_date: dateStringSchema.optional(),
    latest_review_date: dateStringSchema.nullable().optional(),
    owner_user_id: uuidSchema.nullable().optional(),
    status: caseReassessmentStatusUpdateSchema.optional(),
  })
  .strict();

export const completeCaseReassessmentSchema = z
  .object({
    completion_summary: z.string().trim().min(1),
    outcome_definition_ids: z.array(uuidSchema).optional(),
    outcome_visibility: optionalStrictBooleanSchema,
    next_due_date: dateStringSchema.optional(),
    next_title: z.string().trim().min(1).optional(),
    next_summary: z.string().trim().nullable().optional(),
    next_earliest_review_date: dateStringSchema.nullable().optional(),
    next_latest_review_date: dateStringSchema.nullable().optional(),
    next_owner_user_id: uuidSchema.nullable().optional(),
  })
  .strict();

export const cancelCaseReassessmentSchema = z
  .object({
    cancellation_reason: z.string().trim().min(1),
  })
  .strict();

export const milestoneIdParamsSchema = z.object({
  milestoneId: uuidSchema,
});

export const relationshipIdParamsSchema = z.object({
  relationshipId: uuidSchema,
});

export const serviceIdParamsSchema = z.object({
  serviceId: uuidSchema,
});

export const noteIdParamsSchema = z.object({
  noteId: uuidSchema,
});

export const outcomeIdParamsSchema = z.object({
  outcomeId: uuidSchema,
});

export const topicEventIdParamsSchema = z.object({
  topicEventId: uuidSchema,
});

export const documentIdParamsSchema = z.object({
  id: uuidSchema,
  documentId: uuidSchema,
});

export const queueViewParamsSchema = z.object({
  viewId: uuidSchema,
});

export const caseDocumentDownloadQuerySchema = z
  .object({
    disposition: z.enum(['inline', 'attachment']).optional(),
  })
  .strict();

export const caseTimelineQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    cursor: z.string().trim().max(512).optional(),
  })
  .strict();

export const caseCatalogQuerySchema = z
  .object({
    search: z.string().optional(),
    contact_id: uuidSchema.optional(),
    account_id: uuidSchema.optional(),
    case_type_id: uuidSchema.optional(),
    status_id: uuidSchema.optional(),
    priority: casePrioritySchema.optional(),
    assigned_to: uuidSchema.optional(),
    assigned_team: z.string().optional(),
    is_urgent: optionalStrictBooleanSchema,
    requires_followup: optionalStrictBooleanSchema,
    imported_only: optionalStrictBooleanSchema,
    intake_start_date: dateStringSchema.optional(),
    intake_end_date: dateStringSchema.optional(),
    due_date_start: dateStringSchema.optional(),
    due_date_end: dateStringSchema.optional(),
    quick_filter: quickFilterSchema.optional(),
    due_within_days: z.coerce.number().int().min(0).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export const createCaseSchema = z.object({
  contact_id: uuidSchema,
  account_id: uuidSchema.optional(),
  case_type_id: uuidSchema.optional(),
  case_type_ids: z.array(uuidSchema).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: casePrioritySchema.optional(),
  outcome: caseOutcomeSchema.optional(),
  source: z.string().optional(),
  referral_source: z.string().optional(),
  assigned_to: uuidSchema.optional(),
  assigned_team: z.string().optional(),
  due_date: dateStringSchema.optional(),
  intake_data: z.record(z.string(), z.unknown()).optional(),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  is_urgent: optionalStrictBooleanSchema,
  client_viewable: optionalStrictBooleanSchema,
  case_outcome_values: z.array(caseOutcomeSchema).optional(),
}).refine(
  (payload) => Boolean(payload.case_type_id || (payload.case_type_ids && payload.case_type_ids.length > 0)),
  {
    message: 'At least one case type is required',
    path: ['case_type_ids'],
  }
);

export const updateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: casePrioritySchema.optional(),
  case_type_id: uuidSchema.optional(),
  case_type_ids: z.array(uuidSchema).optional(),
  assigned_to: uuidSchema.optional(),
  assigned_team: z.string().optional(),
  due_date: dateStringSchema.optional(),
  outcome: caseOutcomeSchema.optional(),
  case_outcome_values: z.array(caseOutcomeSchema).optional(),
  outcome_notes: z.string().optional(),
  closure_reason: z.string().optional(),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  is_urgent: optionalStrictBooleanSchema,
  client_viewable: optionalStrictBooleanSchema,
  requires_followup: optionalStrictBooleanSchema,
  followup_date: dateStringSchema.optional(),
});

export const updateCaseStatusSchema = z.object({
  new_status_id: uuidSchema,
  reason: z.string().optional(),
  notes: z.string().trim().min(1),
  outcome_definition_ids: z.array(uuidSchema).optional(),
  outcome_visibility: optionalStrictBooleanSchema,
});

export const updateCaseClientViewableSchema = z.object({
  client_viewable: strictBooleanSchema,
});

export const reassignCaseSchema = z.object({
  assigned_to: z.union([uuidSchema, z.null()]),
  reason: z.string().optional(),
});

export const bulkStatusUpdateSchema = z.object({
  case_ids: z.array(uuidSchema).min(1),
  new_status_id: uuidSchema,
  notes: z.string().trim().min(1),
});

export const createCaseNoteSchema = z.object({
  case_id: uuidSchema,
  note_type: noteTypeSchema.optional().default('note'),
  subject: z.string().optional(),
  category: z.string().max(100).optional(),
  content: z.string().min(1),
  is_internal: optionalStrictBooleanSchema,
  visible_to_client: optionalStrictBooleanSchema,
  is_portal_visible: optionalStrictBooleanSchema,
  is_important: optionalStrictBooleanSchema,
  attachments: z.array(z.unknown()).optional(),
  outcome_impacts: z.array(interactionOutcomeImpactItemSchema).optional(),
  outcomes_mode: outcomesModeSchema.optional(),
});

export const updateCaseNoteSchema = z.object({
  note_type: noteTypeSchema.optional(),
  subject: z.string().optional(),
  category: z.string().max(100).optional().nullable(),
  content: z.string().min(1).optional(),
  is_internal: optionalStrictBooleanSchema,
  visible_to_client: optionalStrictBooleanSchema,
  is_portal_visible: optionalStrictBooleanSchema,
  is_important: optionalStrictBooleanSchema,
  attachments: z.array(z.unknown()).optional().nullable(),
  outcome_impacts: z.array(interactionOutcomeImpactItemSchema).optional(),
  outcomes_mode: outcomesModeSchema.optional(),
});

export const createCaseOutcomeSchema = z.object({
  outcome_type: z.string().max(100).optional(),
  outcome_definition_id: uuidSchema.optional(),
  outcome_date: dateStringSchema.optional(),
  notes: z.string().optional(),
  visible_to_client: optionalStrictBooleanSchema,
  is_portal_visible: optionalStrictBooleanSchema,
});

export const updateCaseOutcomeSchema = z
  .object({
    outcome_type: z.string().max(100).optional().nullable(),
    outcome_definition_id: uuidSchema.optional(),
    outcome_date: dateStringSchema.optional(),
    notes: z.string().optional().nullable(),
    visible_to_client: optionalStrictBooleanSchema,
    is_portal_visible: optionalStrictBooleanSchema,
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export const createTopicDefinitionSchema = z.object({
  name: z.string().min(1).max(120),
});

export const createTopicEventSchema = z.object({
  topic_definition_id: uuidSchema.optional(),
  topic_name: z.string().min(1).max(120).optional(),
  discussed_at: dateTimeStringSchema.optional(),
  notes: z.string().optional(),
});

export const updateCaseDocumentSchema = z.object({
  document_name: z.string().max(255).optional(),
  document_type: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  visible_to_client: optionalStrictBooleanSchema,
  is_portal_visible: optionalStrictBooleanSchema,
  is_active: optionalStrictBooleanSchema,
});

export const createCaseMilestoneSchema = z.object({
  milestone_name: z.string().min(1),
  description: z.string().optional(),
  due_date: dateStringSchema.optional(),
  sort_order: z.coerce.number().int().optional(),
});

export const updateCaseMilestoneSchema = z.object({
  milestone_name: z.string().min(1).optional(),
  description: z.string().optional(),
  due_date: dateStringSchema.optional(),
  is_completed: optionalStrictBooleanSchema,
  sort_order: z.coerce.number().int().optional(),
});

export const createCaseRelationshipSchema = z.object({
  related_case_id: uuidSchema,
  relationship_type: z.string().min(1),
  description: z.string().optional(),
});

export const createCaseServiceSchema = z.object({
  service_name: z.string().min(1),
  service_type: z.string().optional(),
  service_provider: z.string().optional(),
  external_service_provider_id: uuidSchema.optional(),
  service_date: dateStringSchema,
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_minutes: z.coerce.number().int().optional(),
  status: z.string().optional(),
  outcome: z.string().optional(),
  cost: z.coerce.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCaseServiceSchema = createCaseServiceSchema.partial();

export const resolveCasePortalConversationSchema = z.object({
  resolution_note: z.string().trim().min(1),
  outcome_definition_ids: z.array(uuidSchema).min(1),
  close_status: z.enum(['closed', 'archived']).default('closed'),
  visible_to_client: optionalStrictBooleanSchema,
});

export const caseFormDefaultDetailParamsSchema = z
  .object({
    caseTypeId: uuidSchema,
    defaultId: uuidSchema,
  })
  .strict();

export const caseFormInstantiateParamsSchema = z
  .object({
    id: uuidSchema,
    defaultId: uuidSchema,
  })
  .strict();
