import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { requirePermission } from '@middleware/permissions';
import { documentUpload, handleMulterError } from '@middleware/domains/platform';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  getCasePortalConversations,
  replyCasePortalConversation,
  resolvePortalConversation,
} from '../controllers/portalConversations.controller';
import {
  caseOutcomeDefinitionsQuerySchema,
  interactionOutcomeImpactItemSchema,
  interactionOutcomeParamsSchema,
  updateInteractionOutcomeImpactsSchema,
} from '@validations/outcomeImpact';
import {
  casePortalConversationMessageParamsSchema,
  casePortalConversationMessageSchema,
  casePortalConversationParamsSchema,
  portalCaseEscalationUpdateSchema,
  portalEscalationParamsSchema,
  scopedQueueViewDefinitionSchema,
} from '@validations/portal';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  archiveQueueViewDefinition,
  listQueueViewDefinitions,
  upsertQueueViewDefinition,
} from '@services/queueViewDefinitionService';
import {
  listPortalEscalationsForCase,
  updatePortalEscalationForCase,
} from '@services/portalEscalationService';
import {
  isoDateSchema,
  isoDateTimeSchema,
  optionalStrictBooleanSchema,
  strictBooleanSchema,
  uuidSchema,
} from '@validations/shared';
import { followUpController as followUpsController } from '@modules/followUps/controllers/followUps.handlers';
import { createCaseCatalogController } from '../controllers/catalog.controller';
import { createCaseLifecycleController } from '../controllers/lifecycle.controller';
import { createCaseNotesController } from '../controllers/notes.controller';
import { createCaseMilestonesController } from '../controllers/milestones.controller';
import { createCaseRelationshipsController } from '../controllers/relationships.controller';
import { createCaseServicesController } from '../controllers/services.controller';
import { createCaseOutcomesController } from '../controllers/outcomes.controller';
import { createCaseDocumentsController } from '../controllers/documents.controller';
import { createCaseFormsController } from '../controllers/forms.controller';
import { CaseRepository } from '../repositories/caseRepository';
import { CaseNotesRepository } from '../repositories/caseNotesRepository';
import { CaseMilestonesRepository } from '../repositories/caseMilestonesRepository';
import { CaseRelationshipsRepository } from '../repositories/caseRelationshipsRepository';
import { CaseServicesRepository } from '../repositories/caseServicesRepository';
import { CaseOutcomesRepository } from '../repositories/caseOutcomesRepository';
import { CaseDocumentsRepository } from '../repositories/caseDocumentsRepository';
import { CaseFormsRepository } from '../repositories/caseFormsRepository';
import { CaseCatalogUseCase } from '../usecases/caseCatalog.usecase';
import { CaseLifecycleUseCase } from '../usecases/caseLifecycle.usecase';
import { CaseNotesUseCase } from '../usecases/caseNotes.usecase';
import { CaseMilestonesUseCase } from '../usecases/caseMilestones.usecase';
import { CaseRelationshipsUseCase } from '../usecases/caseRelationships.usecase';
import { CaseServicesUseCase } from '../usecases/caseServices.usecase';
import { CaseOutcomesUseCase } from '../usecases/caseOutcomes.usecase';
import { CaseDocumentsUseCase } from '../usecases/caseDocuments.usecase';
import { CaseFormsUseCase } from '../usecases/caseForms.usecase';
import { Permission } from '@utils/permissions';
import {
  caseFormAssetParamsSchema,
  caseFormAssetUploadSchema,
  caseFormAssignmentParamsSchema,
  caseFormCaseParamsSchema,
  caseFormCaseTypeParamsSchema,
  caseFormDraftSchema,
  caseFormListQuerySchema,
  caseFormReviewDecisionSchema,
  caseFormSendSchema,
  caseFormSubmitSchema,
  createCaseFormAssignmentSchema,
  createCaseFormDefaultSchema,
  updateCaseFormAssignmentSchema,
  updateCaseFormDefaultSchema,
} from '@validations/caseForms';

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

const caseIdParamsSchema = z.object({
  id: uuidSchema,
});

const milestoneIdParamsSchema = z.object({
  milestoneId: uuidSchema,
});

const relationshipIdParamsSchema = z.object({
  relationshipId: uuidSchema,
});

const serviceIdParamsSchema = z.object({
  serviceId: uuidSchema,
});

const noteIdParamsSchema = z.object({
  noteId: uuidSchema,
});

const outcomeIdParamsSchema = z.object({
  outcomeId: uuidSchema,
});

const topicEventIdParamsSchema = z.object({
  topicEventId: uuidSchema,
});

const documentIdParamsSchema = z.object({
  id: uuidSchema,
  documentId: uuidSchema,
});

const queueViewParamsSchema = z.object({
  viewId: uuidSchema,
});

const caseDocumentDownloadQuerySchema = z
  .object({
    disposition: z.enum(['inline', 'attachment']).optional(),
  })
  .strict();

const caseTimelineQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    cursor: z.string().trim().max(512).optional(),
  })
  .strict();

const caseCatalogQuerySchema = z
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

const createCaseSchema = z.object({
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

const updateCaseSchema = z.object({
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

const updateCaseStatusSchema = z.object({
  new_status_id: uuidSchema,
  reason: z.string().optional(),
  notes: z.string().trim().min(1),
  outcome_definition_ids: z.array(uuidSchema).optional(),
  outcome_visibility: optionalStrictBooleanSchema,
});

const updateCaseClientViewableSchema = z.object({
  client_viewable: strictBooleanSchema,
});

const reassignCaseSchema = z.object({
  assigned_to: z.union([uuidSchema, z.null()]),
  reason: z.string().optional(),
});

const bulkStatusUpdateSchema = z.object({
  case_ids: z.array(uuidSchema).min(1),
  new_status_id: uuidSchema,
  notes: z.string().trim().min(1),
});

const createCaseNoteSchema = z.object({
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

const updateCaseNoteSchema = z.object({
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

const createCaseOutcomeSchema = z.object({
  outcome_type: z.string().max(100).optional(),
  outcome_definition_id: uuidSchema.optional(),
  outcome_date: dateStringSchema.optional(),
  notes: z.string().optional(),
  visible_to_client: optionalStrictBooleanSchema,
  is_portal_visible: optionalStrictBooleanSchema,
});

const updateCaseOutcomeSchema = z
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

const createTopicDefinitionSchema = z.object({
  name: z.string().min(1).max(120),
});

const createTopicEventSchema = z.object({
  topic_definition_id: uuidSchema.optional(),
  topic_name: z.string().min(1).max(120).optional(),
  discussed_at: dateTimeStringSchema.optional(),
  notes: z.string().optional(),
});

const updateCaseDocumentSchema = z.object({
  document_name: z.string().max(255).optional(),
  document_type: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  visible_to_client: optionalStrictBooleanSchema,
  is_portal_visible: optionalStrictBooleanSchema,
  is_active: optionalStrictBooleanSchema,
});

const createCaseMilestoneSchema = z.object({
  milestone_name: z.string().min(1),
  description: z.string().optional(),
  due_date: dateStringSchema.optional(),
  sort_order: z.coerce.number().int().optional(),
});

const updateCaseMilestoneSchema = z.object({
  milestone_name: z.string().min(1).optional(),
  description: z.string().optional(),
  due_date: dateStringSchema.optional(),
  is_completed: optionalStrictBooleanSchema,
  sort_order: z.coerce.number().int().optional(),
});

const createCaseRelationshipSchema = z.object({
  related_case_id: uuidSchema,
  relationship_type: z.string().min(1),
  description: z.string().optional(),
});

const createCaseServiceSchema = z.object({
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

const updateCaseServiceSchema = createCaseServiceSchema.partial();

const resolveCasePortalConversationSchema = z.object({
  resolution_note: z.string().trim().min(1),
  outcome_definition_ids: z.array(uuidSchema).min(1),
  close_status: z.enum(['closed', 'archived']).default('closed'),
  visible_to_client: optionalStrictBooleanSchema,
});

const caseFormDefaultDetailParamsSchema = z
  .object({
    caseTypeId: uuidSchema,
    defaultId: uuidSchema,
  })
  .strict();

const caseFormInstantiateParamsSchema = z
  .object({
    id: uuidSchema,
    defaultId: uuidSchema,
  })
  .strict();

export const createCasesRoutes = (): Router => {
  const router = Router();

  const caseRepository = new CaseRepository();
  const notesRepository = new CaseNotesRepository();
  const milestonesRepository = new CaseMilestonesRepository();
  const relationshipsRepository = new CaseRelationshipsRepository();
  const servicesRepository = new CaseServicesRepository();
  const outcomesRepository = new CaseOutcomesRepository();
  const documentsRepository = new CaseDocumentsRepository();
  const caseFormsRepository = new CaseFormsRepository();

  const catalogController = createCaseCatalogController(new CaseCatalogUseCase(caseRepository));
  const lifecycleController = createCaseLifecycleController(new CaseLifecycleUseCase(caseRepository));
  const notesController = createCaseNotesController(new CaseNotesUseCase(notesRepository));
  const milestonesController = createCaseMilestonesController(
    new CaseMilestonesUseCase(milestonesRepository)
  );
  const relationshipsController = createCaseRelationshipsController(
    new CaseRelationshipsUseCase(relationshipsRepository)
  );
  const servicesController = createCaseServicesController(new CaseServicesUseCase(servicesRepository));
  const outcomesController = createCaseOutcomesController(
    new CaseOutcomesUseCase(outcomesRepository)
  );
  const documentsController = createCaseDocumentsController(
    new CaseDocumentsUseCase(documentsRepository)
  );
  const formsController = createCaseFormsController(new CaseFormsUseCase(caseFormsRepository));

  router.use(authenticate);
  router.use(requireActiveOrganizationContext);

  router.get(
    '/outcomes/definitions',
    validateQuery(caseOutcomeDefinitionsQuerySchema),
    outcomesController.getCaseOutcomeDefinitions
  );

  router.get('/summary', catalogController.getCaseSummary);
  router.get('/types', catalogController.getCaseTypes);
  router.get('/statuses', catalogController.getCaseStatuses);
  router.get(
    '/types/:caseTypeId/forms/defaults',
    validateParams(caseFormCaseTypeParamsSchema),
    formsController.listDefaults
  );
  router.post(
    '/types/:caseTypeId/forms/defaults',
    validateParams(caseFormCaseTypeParamsSchema),
    validateBody(createCaseFormDefaultSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.createDefault
  );
  router.put(
    '/types/:caseTypeId/forms/defaults/:defaultId',
    validateParams(caseFormDefaultDetailParamsSchema),
    validateBody(updateCaseFormDefaultSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.updateDefault
  );

  router.post(
    '/bulk-status',
    validateBody(bulkStatusUpdateSchema),
    requirePermission(Permission.CASE_EDIT),
    lifecycleController.bulkUpdateCaseStatus
  );
  router.post(
    '/',
    validateBody(createCaseSchema),
    requirePermission(Permission.CASE_CREATE),
    lifecycleController.createCase
  );
  router.get('/', validateQuery(caseCatalogQuerySchema), catalogController.getCases);
  router.get(
    '/queue-views',
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const views = await listQueueViewDefinitions('cases', req.user?.id ?? null, [
          'cases',
        ]);
        sendSuccess(res, views);
      } catch (error) {
        next(error);
      }
    }
  );
  router.post(
    '/queue-views',
    validateBody(scopedQueueViewDefinitionSchema),
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const view = await upsertQueueViewDefinition({
          ...(req.body as Parameters<typeof upsertQueueViewDefinition>[0]),
          surface: 'cases',
          ownerUserId: req.user?.id ?? null,
          permissionScope: ['cases'],
          userId: req.user?.id ?? null,
        });
        sendSuccess(res, view, 201);
      } catch (error) {
        next(error);
      }
    }
  );
  router.delete(
    '/queue-views/:viewId',
    validateParams(queueViewParamsSchema),
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const view = await archiveQueueViewDefinition({
          id: String(req.params.viewId),
          surface: 'cases',
          ownerUserId: req.user?.id ?? null,
          permissionScopes: ['cases'],
          userId: req.user?.id ?? null,
        });
        sendSuccess(res, view);
      } catch (error) {
        next(error);
      }
    }
  );
  router.get(
    '/:id/forms/recommended-defaults',
    validateParams(caseFormCaseParamsSchema),
    formsController.listRecommendedDefaults
  );
  router.get(
    '/:id/forms',
    validateParams(caseFormCaseParamsSchema),
    validateQuery(caseFormListQuerySchema),
    formsController.listAssignments
  );
  router.post(
    '/:id/forms',
    validateParams(caseFormCaseParamsSchema),
    validateBody(createCaseFormAssignmentSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.createAssignment
  );
  router.post(
    '/:id/forms/defaults/:defaultId/instantiate',
    validateParams(caseFormInstantiateParamsSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.instantiateDefault
  );
  router.get(
    '/:id/forms/:assignmentId',
    validateParams(caseFormAssignmentParamsSchema),
    formsController.getAssignmentDetail
  );
  router.put(
    '/:id/forms/:assignmentId',
    validateParams(caseFormAssignmentParamsSchema),
    validateBody(updateCaseFormAssignmentSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.updateAssignment
  );
  router.post(
    '/:id/forms/:assignmentId/assets',
    validateParams(caseFormAssignmentParamsSchema),
    documentUpload.single('file'),
    handleMulterError,
    validateBody(caseFormAssetUploadSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.uploadAsset
  );
  router.post(
    '/:id/forms/:assignmentId/draft',
    validateParams(caseFormAssignmentParamsSchema),
    validateBody(caseFormDraftSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.saveDraft
  );
  router.post(
    '/:id/forms/:assignmentId/staff-submit',
    validateParams(caseFormAssignmentParamsSchema),
    validateBody(caseFormSubmitSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.submit
  );
  router.post(
    '/:id/forms/:assignmentId/send',
    validateParams(caseFormAssignmentParamsSchema),
    validateBody(caseFormSendSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.sendAssignment
  );
  router.post(
    '/:id/forms/:assignmentId/review',
    validateParams(caseFormAssignmentParamsSchema),
    validateBody(caseFormReviewDecisionSchema),
    requirePermission(Permission.CASE_EDIT),
    formsController.reviewAssignment
  );
  router.get(
    '/:id/forms/:assignmentId/response-packet',
    validateParams(caseFormAssignmentParamsSchema),
    formsController.downloadResponsePacket
  );
  router.get(
    '/:id/forms/:assignmentId/assets/:assetId/download',
    validateParams(caseFormAssetParamsSchema),
    formsController.downloadAsset
  );
  router.get('/:id', validateParams(caseIdParamsSchema), catalogController.getCaseById);
  router.get(
    '/:id/portal/escalations',
    validateParams(caseIdParamsSchema),
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const escalations = await listPortalEscalationsForCase(
          req.params.id,
          req.organizationId ?? null
        );
        sendSuccess(res, escalations);
      } catch (error) {
        next(error);
      }
    }
  );
  router.patch(
    '/:id/portal/escalations/:escalationId',
    validateParams(portalEscalationParamsSchema),
    validateBody(portalCaseEscalationUpdateSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const body = req.body as {
          status?: Parameters<typeof updatePortalEscalationForCase>[0]['status'];
          resolution_summary?: string | null;
          assignee_user_id?: string | null;
          sla_due_at?: string | null;
        };
        const updateInput: Parameters<typeof updatePortalEscalationForCase>[0] = {
          id: req.params.escalationId,
          caseId: req.params.id,
          accountId: req.organizationId ?? null,
          updatedBy: req.user?.id ?? null,
        };

        if ('status' in body) {
          updateInput.status = body.status;
        }
        if ('resolution_summary' in body) {
          updateInput.resolutionSummary = body.resolution_summary ?? null;
        }
        if ('assignee_user_id' in body) {
          updateInput.assigneeUserId = body.assignee_user_id ?? null;
        }
        if ('sla_due_at' in body) {
          updateInput.slaDueAt = body.sla_due_at ? new Date(body.sla_due_at) : null;
        }

        const escalation = await updatePortalEscalationForCase(updateInput);
        sendSuccess(res, escalation);
      } catch (error) {
        next(error);
      }
    }
  );
  router.get(
    '/:id/follow-ups',
    validateParams(caseIdParamsSchema),
    followUpsController.getCaseFollowUps
  );
  router.get(
    '/:id/timeline',
    validateParams(caseIdParamsSchema),
    validateQuery(caseTimelineQuerySchema),
    catalogController.getCaseTimeline
  );
  router.put(
    '/:id',
    validateParams(caseIdParamsSchema),
    validateBody(updateCaseSchema),
    requirePermission(Permission.CASE_EDIT),
    lifecycleController.updateCase
  );
  router.put(
    '/:id/client-viewable',
    validateParams(caseIdParamsSchema),
    validateBody(updateCaseClientViewableSchema),
    requirePermission(Permission.CASE_EDIT),
    lifecycleController.updateCase
  );
  router.delete(
    '/:id',
    validateParams(caseIdParamsSchema),
    requirePermission(Permission.CASE_DELETE),
    lifecycleController.deleteCase
  );
  router.put(
    '/:id/status',
    validateParams(caseIdParamsSchema),
    validateBody(updateCaseStatusSchema),
    requirePermission(Permission.CASE_EDIT),
    lifecycleController.updateCaseStatus
  );
  router.put(
    '/:id/reassign',
    validateParams(caseIdParamsSchema),
    validateBody(reassignCaseSchema),
    requirePermission(Permission.CASE_EDIT),
    lifecycleController.reassignCase
  );

  router.get('/:id/notes', validateParams(caseIdParamsSchema), notesController.getCaseNotes);
  router.post(
    '/notes',
    validateBody(createCaseNoteSchema),
    requirePermission(Permission.CASE_EDIT),
    notesController.createCaseNote
  );
  router.put(
    '/notes/:noteId',
    validateParams(noteIdParamsSchema),
    validateBody(updateCaseNoteSchema),
    requirePermission(Permission.CASE_EDIT),
    notesController.updateCaseNote
  );
  router.delete(
    '/notes/:noteId',
    validateParams(noteIdParamsSchema),
    requirePermission(Permission.CASE_EDIT),
    notesController.deleteCaseNote
  );

  router.get(
    '/:id/outcomes',
    validateParams(caseIdParamsSchema),
    outcomesController.getCaseOutcomes
  );
  router.post(
    '/:id/outcomes',
    validateParams(caseIdParamsSchema),
    validateBody(createCaseOutcomeSchema),
    requirePermission(Permission.CASE_EDIT),
    outcomesController.createCaseOutcome
  );
  router.put(
    '/outcomes/:outcomeId',
    validateParams(outcomeIdParamsSchema),
    validateBody(updateCaseOutcomeSchema),
    requirePermission(Permission.CASE_EDIT),
    outcomesController.updateCaseOutcome
  );
  router.delete(
    '/outcomes/:outcomeId',
    validateParams(outcomeIdParamsSchema),
    requirePermission(Permission.CASE_EDIT),
    outcomesController.deleteCaseOutcome
  );

  router.get(
    '/:id/topics/definitions',
    validateParams(caseIdParamsSchema),
    outcomesController.getCaseTopicDefinitions
  );
  router.post(
    '/:id/topics/definitions',
    validateParams(caseIdParamsSchema),
    validateBody(createTopicDefinitionSchema),
    requirePermission(Permission.CASE_EDIT),
    outcomesController.createCaseTopicDefinition
  );
  router.get(
    '/:id/topics',
    validateParams(caseIdParamsSchema),
    outcomesController.getCaseTopicEvents
  );
  router.post(
    '/:id/topics',
    validateParams(caseIdParamsSchema),
    validateBody(createTopicEventSchema),
    requirePermission(Permission.CASE_EDIT),
    outcomesController.createCaseTopicEvent
  );
  router.delete(
    '/topics/:topicEventId',
    validateParams(topicEventIdParamsSchema),
    requirePermission(Permission.CASE_EDIT),
    outcomesController.deleteCaseTopicEvent
  );

  router.get(
    '/:id/documents',
    validateParams(caseIdParamsSchema),
    documentsController.getCaseDocuments
  );
  router.post(
    '/:id/documents',
    validateParams(caseIdParamsSchema),
    documentUpload.single('file'),
    handleMulterError,
    requirePermission(Permission.CASE_EDIT),
    documentsController.uploadCaseDocument
  );
  router.get(
    '/:id/documents/:documentId/download',
    validateParams(documentIdParamsSchema),
    validateQuery(caseDocumentDownloadQuerySchema),
    documentsController.downloadCaseDocument
  );
  router.put(
    '/:id/documents/:documentId',
    validateParams(documentIdParamsSchema),
    validateBody(updateCaseDocumentSchema),
    requirePermission(Permission.CASE_EDIT),
    documentsController.updateCaseDocument
  );
  router.delete(
    '/:id/documents/:documentId',
    validateParams(documentIdParamsSchema),
    requirePermission(Permission.CASE_EDIT),
    documentsController.deleteCaseDocument
  );

  router.get(
    '/:id/milestones',
    validateParams(caseIdParamsSchema),
    milestonesController.getCaseMilestones
  );
  router.post(
    '/:id/milestones',
    validateParams(caseIdParamsSchema),
    validateBody(createCaseMilestoneSchema),
    requirePermission(Permission.CASE_EDIT),
    milestonesController.createCaseMilestone
  );
  router.put(
    '/milestones/:milestoneId',
    validateParams(milestoneIdParamsSchema),
    validateBody(updateCaseMilestoneSchema),
    requirePermission(Permission.CASE_EDIT),
    milestonesController.updateCaseMilestone
  );
  router.delete(
    '/milestones/:milestoneId',
    validateParams(milestoneIdParamsSchema),
    requirePermission(Permission.CASE_EDIT),
    milestonesController.deleteCaseMilestone
  );

  router.get(
    '/:id/relationships',
    validateParams(caseIdParamsSchema),
    relationshipsController.getCaseRelationships
  );
  router.post(
    '/:id/relationships',
    validateParams(caseIdParamsSchema),
    validateBody(createCaseRelationshipSchema),
    requirePermission(Permission.CASE_EDIT),
    relationshipsController.createCaseRelationship
  );
  router.delete(
    '/relationships/:relationshipId',
    validateParams(relationshipIdParamsSchema),
    requirePermission(Permission.CASE_EDIT),
    relationshipsController.deleteCaseRelationship
  );

  router.get(
    '/:id/services',
    validateParams(caseIdParamsSchema),
    servicesController.getCaseServices
  );
  router.post(
    '/:id/services',
    validateParams(caseIdParamsSchema),
    validateBody(createCaseServiceSchema),
    requirePermission(Permission.CASE_EDIT),
    servicesController.createCaseService
  );
  router.put(
    '/services/:serviceId',
    validateParams(serviceIdParamsSchema),
    validateBody(updateCaseServiceSchema),
    requirePermission(Permission.CASE_EDIT),
    servicesController.updateCaseService
  );
  router.delete(
    '/services/:serviceId',
    validateParams(serviceIdParamsSchema),
    requirePermission(Permission.CASE_EDIT),
    servicesController.deleteCaseService
  );

  router.get(
    '/:id/portal/conversations',
    validateParams(casePortalConversationParamsSchema),
    getCasePortalConversations
  );

  router.post(
    '/:id/portal/conversations/:threadId/messages',
    validateParams(casePortalConversationMessageParamsSchema),
    validateBody(casePortalConversationMessageSchema),
    requirePermission(Permission.CASE_EDIT),
    replyCasePortalConversation
  );

  router.post(
    '/:id/portal/conversations/:threadId/resolve',
    validateParams(casePortalConversationMessageParamsSchema),
    validateBody(resolveCasePortalConversationSchema),
    requirePermission(Permission.CASE_EDIT),
    resolvePortalConversation
  );

  router.get(
    '/:caseId/interactions/:interactionId/outcomes',
    validateParams(interactionOutcomeParamsSchema),
    outcomesController.getInteractionOutcomes
  );

  router.put(
    '/:caseId/interactions/:interactionId/outcomes',
    validateParams(interactionOutcomeParamsSchema),
    validateBody(updateInteractionOutcomeImpactsSchema),
    requirePermission(Permission.CASE_EDIT),
    outcomesController.putInteractionOutcomes
  );

  return router;
};

export const casesV2Routes = createCasesRoutes();
