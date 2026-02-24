import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { documentUpload, handleMulterError } from '@middleware/domains/platform';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  getCasePortalConversations,
  replyCasePortalConversation,
} from '@controllers/domains/portal';
import {
  caseOutcomeDefinitionsQuerySchema,
  interactionOutcomeParamsSchema,
  updateInteractionOutcomeImpactsSchema,
} from '@validations/outcomeImpact';
import {
  casePortalConversationMessageParamsSchema,
  casePortalConversationMessageSchema,
  casePortalConversationParamsSchema,
} from '@validations/portal';
import { uuidSchema } from '@validations/shared';
import { createCaseCatalogController } from '../controllers/catalog.controller';
import { createCaseLifecycleController } from '../controllers/lifecycle.controller';
import { createCaseNotesController } from '../controllers/notes.controller';
import { createCaseMilestonesController } from '../controllers/milestones.controller';
import { createCaseRelationshipsController } from '../controllers/relationships.controller';
import { createCaseServicesController } from '../controllers/services.controller';
import { createCaseOutcomesController } from '../controllers/outcomes.controller';
import { createCaseDocumentsController } from '../controllers/documents.controller';
import { ResponseMode } from '../mappers/responseMode';
import { CaseRepository } from '../repositories/caseRepository';
import { CaseNotesRepository } from '../repositories/caseNotesRepository';
import { CaseMilestonesRepository } from '../repositories/caseMilestonesRepository';
import { CaseRelationshipsRepository } from '../repositories/caseRelationshipsRepository';
import { CaseServicesRepository } from '../repositories/caseServicesRepository';
import { CaseOutcomesRepository } from '../repositories/caseOutcomesRepository';
import { CaseDocumentsRepository } from '../repositories/caseDocumentsRepository';
import { CaseCatalogUseCase } from '../usecases/caseCatalog.usecase';
import { CaseLifecycleUseCase } from '../usecases/caseLifecycle.usecase';
import { CaseNotesUseCase } from '../usecases/caseNotes.usecase';
import { CaseMilestonesUseCase } from '../usecases/caseMilestones.usecase';
import { CaseRelationshipsUseCase } from '../usecases/caseRelationships.usecase';
import { CaseServicesUseCase } from '../usecases/caseServices.usecase';
import { CaseOutcomesUseCase } from '../usecases/caseOutcomes.usecase';
import { CaseDocumentsUseCase } from '../usecases/caseDocuments.usecase';

const casePrioritySchema = z.enum(['low', 'medium', 'high', 'urgent', 'critical']);
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

const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO8601 date');

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

const caseCatalogQuerySchema = z.object({
  search: z.string().optional(),
  contact_id: uuidSchema.optional(),
  account_id: uuidSchema.optional(),
  case_type_id: uuidSchema.optional(),
  status_id: uuidSchema.optional(),
  priority: casePrioritySchema.optional(),
  assigned_to: uuidSchema.optional(),
  assigned_team: z.string().optional(),
  is_urgent: z.coerce.boolean().optional(),
  requires_followup: z.coerce.boolean().optional(),
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
});

const createCaseSchema = z.object({
  contact_id: uuidSchema,
  account_id: uuidSchema.optional(),
  case_type_id: uuidSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  priority: casePrioritySchema.optional(),
  source: z.string().optional(),
  referral_source: z.string().optional(),
  assigned_to: uuidSchema.optional(),
  assigned_team: z.string().optional(),
  due_date: dateStringSchema.optional(),
  intake_data: z.record(z.string(), z.unknown()).optional(),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  is_urgent: z.coerce.boolean().optional(),
  client_viewable: z.coerce.boolean().optional(),
});

const updateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: casePrioritySchema.optional(),
  assigned_to: uuidSchema.optional(),
  assigned_team: z.string().optional(),
  due_date: dateStringSchema.optional(),
  outcome: z.string().optional(),
  outcome_notes: z.string().optional(),
  closure_reason: z.string().optional(),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  is_urgent: z.coerce.boolean().optional(),
  client_viewable: z.coerce.boolean().optional(),
  requires_followup: z.coerce.boolean().optional(),
  followup_date: dateStringSchema.optional(),
});

const updateCaseStatusSchema = z.object({
  new_status_id: uuidSchema,
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const updateCaseClientViewableSchema = z.object({
  client_viewable: z.coerce.boolean(),
});

const reassignCaseSchema = z.object({
  assigned_to: z.union([uuidSchema, z.null()]),
  reason: z.string().optional(),
});

const bulkStatusUpdateSchema = z.object({
  case_ids: z.array(uuidSchema).min(1),
  new_status_id: uuidSchema,
  notes: z.string().optional(),
});

const createCaseNoteSchema = z.object({
  case_id: uuidSchema,
  note_type: noteTypeSchema.optional().default('note'),
  subject: z.string().optional(),
  category: z.string().max(100).optional(),
  content: z.string().min(1),
  is_internal: z.coerce.boolean().optional(),
  visible_to_client: z.coerce.boolean().optional(),
  is_portal_visible: z.coerce.boolean().optional(),
  is_important: z.coerce.boolean().optional(),
  attachments: z.array(z.unknown()).optional(),
});

const updateCaseNoteSchema = z.object({
  note_type: noteTypeSchema.optional(),
  subject: z.string().optional(),
  category: z.string().max(100).optional().nullable(),
  content: z.string().min(1).optional(),
  is_internal: z.coerce.boolean().optional(),
  visible_to_client: z.coerce.boolean().optional(),
  is_portal_visible: z.coerce.boolean().optional(),
  is_important: z.coerce.boolean().optional(),
  attachments: z.array(z.unknown()).optional().nullable(),
});

const createCaseOutcomeSchema = z.object({
  outcome_type: z.string().max(100).optional(),
  outcome_date: dateStringSchema.optional(),
  notes: z.string().optional(),
  visible_to_client: z.coerce.boolean().optional(),
  is_portal_visible: z.coerce.boolean().optional(),
});

const updateCaseOutcomeSchema = z.object({
  outcome_type: z.string().max(100).optional().nullable(),
  outcome_date: dateStringSchema.optional(),
  notes: z.string().optional().nullable(),
  visible_to_client: z.coerce.boolean().optional(),
  is_portal_visible: z.coerce.boolean().optional(),
});

const createTopicDefinitionSchema = z.object({
  name: z.string().min(1).max(120),
});

const createTopicEventSchema = z.object({
  topic_definition_id: uuidSchema.optional(),
  topic_name: z.string().min(1).max(120).optional(),
  discussed_at: dateStringSchema.optional(),
  notes: z.string().optional(),
});

const updateCaseDocumentSchema = z.object({
  document_name: z.string().max(255).optional(),
  document_type: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  visible_to_client: z.coerce.boolean().optional(),
  is_portal_visible: z.coerce.boolean().optional(),
  is_active: z.coerce.boolean().optional(),
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
  is_completed: z.coerce.boolean().optional(),
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

export const createCasesRoutes = (mode: ResponseMode = 'v2'): Router => {
  const router = Router();

  const caseRepository = new CaseRepository();
  const notesRepository = new CaseNotesRepository();
  const milestonesRepository = new CaseMilestonesRepository();
  const relationshipsRepository = new CaseRelationshipsRepository();
  const servicesRepository = new CaseServicesRepository();
  const outcomesRepository = new CaseOutcomesRepository();
  const documentsRepository = new CaseDocumentsRepository();

  const catalogController = createCaseCatalogController(
    new CaseCatalogUseCase(caseRepository),
    mode
  );
  const lifecycleController = createCaseLifecycleController(
    new CaseLifecycleUseCase(caseRepository),
    mode
  );
  const notesController = createCaseNotesController(
    new CaseNotesUseCase(notesRepository),
    mode
  );
  const milestonesController = createCaseMilestonesController(
    new CaseMilestonesUseCase(milestonesRepository),
    mode
  );
  const relationshipsController = createCaseRelationshipsController(
    new CaseRelationshipsUseCase(relationshipsRepository),
    mode
  );
  const servicesController = createCaseServicesController(
    new CaseServicesUseCase(servicesRepository),
    mode
  );
  const outcomesController = createCaseOutcomesController(
    new CaseOutcomesUseCase(outcomesRepository),
    mode
  );
  const documentsController = createCaseDocumentsController(
    new CaseDocumentsUseCase(documentsRepository),
    mode
  );

  router.use(authenticate);

  router.get(
    '/outcomes/definitions',
    validateQuery(caseOutcomeDefinitionsQuerySchema),
    outcomesController.getCaseOutcomeDefinitions
  );

  router.get('/summary', catalogController.getCaseSummary);
  router.get('/types', catalogController.getCaseTypes);
  router.get('/statuses', catalogController.getCaseStatuses);

  router.post('/bulk-status', validateBody(bulkStatusUpdateSchema), lifecycleController.bulkUpdateCaseStatus);
  router.post('/', validateBody(createCaseSchema), lifecycleController.createCase);
  router.get('/', validateQuery(caseCatalogQuerySchema), catalogController.getCases);
  router.get('/:id', validateParams(caseIdParamsSchema), catalogController.getCaseById);
  router.get('/:id/timeline', validateParams(caseIdParamsSchema), catalogController.getCaseTimeline);
  router.put('/:id', validateParams(caseIdParamsSchema), validateBody(updateCaseSchema), lifecycleController.updateCase);
  router.put(
    '/:id/client-viewable',
    validateParams(caseIdParamsSchema),
    validateBody(updateCaseClientViewableSchema),
    lifecycleController.updateCase
  );
  router.delete('/:id', validateParams(caseIdParamsSchema), lifecycleController.deleteCase);
  router.put('/:id/status', validateParams(caseIdParamsSchema), validateBody(updateCaseStatusSchema), lifecycleController.updateCaseStatus);
  router.put('/:id/reassign', validateParams(caseIdParamsSchema), validateBody(reassignCaseSchema), lifecycleController.reassignCase);

  router.get('/:id/notes', validateParams(caseIdParamsSchema), notesController.getCaseNotes);
  router.post('/notes', validateBody(createCaseNoteSchema), notesController.createCaseNote);
  router.put('/notes/:noteId', validateParams(noteIdParamsSchema), validateBody(updateCaseNoteSchema), notesController.updateCaseNote);
  router.delete('/notes/:noteId', validateParams(noteIdParamsSchema), notesController.deleteCaseNote);

  router.get('/:id/outcomes', validateParams(caseIdParamsSchema), outcomesController.getCaseOutcomes);
  router.post('/:id/outcomes', validateParams(caseIdParamsSchema), validateBody(createCaseOutcomeSchema), outcomesController.createCaseOutcome);
  router.put('/outcomes/:outcomeId', validateParams(outcomeIdParamsSchema), validateBody(updateCaseOutcomeSchema), outcomesController.updateCaseOutcome);
  router.delete('/outcomes/:outcomeId', validateParams(outcomeIdParamsSchema), outcomesController.deleteCaseOutcome);

  router.get('/:id/topics/definitions', validateParams(caseIdParamsSchema), outcomesController.getCaseTopicDefinitions);
  router.post('/:id/topics/definitions', validateParams(caseIdParamsSchema), validateBody(createTopicDefinitionSchema), outcomesController.createCaseTopicDefinition);
  router.get('/:id/topics', validateParams(caseIdParamsSchema), outcomesController.getCaseTopicEvents);
  router.post('/:id/topics', validateParams(caseIdParamsSchema), validateBody(createTopicEventSchema), outcomesController.createCaseTopicEvent);
  router.delete('/topics/:topicEventId', validateParams(topicEventIdParamsSchema), outcomesController.deleteCaseTopicEvent);

  router.get('/:id/documents', validateParams(caseIdParamsSchema), documentsController.getCaseDocuments);
  router.post(
    '/:id/documents',
    validateParams(caseIdParamsSchema),
    documentUpload.single('file'),
    handleMulterError,
    documentsController.uploadCaseDocument
  );
  router.get('/:id/documents/:documentId/download', validateParams(documentIdParamsSchema), documentsController.downloadCaseDocument);
  router.put('/:id/documents/:documentId', validateParams(documentIdParamsSchema), validateBody(updateCaseDocumentSchema), documentsController.updateCaseDocument);
  router.delete('/:id/documents/:documentId', validateParams(documentIdParamsSchema), documentsController.deleteCaseDocument);

  router.get('/:id/milestones', validateParams(caseIdParamsSchema), milestonesController.getCaseMilestones);
  router.post('/:id/milestones', validateParams(caseIdParamsSchema), validateBody(createCaseMilestoneSchema), milestonesController.createCaseMilestone);
  router.put('/milestones/:milestoneId', validateParams(milestoneIdParamsSchema), validateBody(updateCaseMilestoneSchema), milestonesController.updateCaseMilestone);
  router.delete('/milestones/:milestoneId', validateParams(milestoneIdParamsSchema), milestonesController.deleteCaseMilestone);

  router.get('/:id/relationships', validateParams(caseIdParamsSchema), relationshipsController.getCaseRelationships);
  router.post('/:id/relationships', validateParams(caseIdParamsSchema), validateBody(createCaseRelationshipSchema), relationshipsController.createCaseRelationship);
  router.delete('/relationships/:relationshipId', validateParams(relationshipIdParamsSchema), relationshipsController.deleteCaseRelationship);

  router.get('/:id/services', validateParams(caseIdParamsSchema), servicesController.getCaseServices);
  router.post('/:id/services', validateParams(caseIdParamsSchema), validateBody(createCaseServiceSchema), servicesController.createCaseService);
  router.put('/services/:serviceId', validateParams(serviceIdParamsSchema), validateBody(updateCaseServiceSchema), servicesController.updateCaseService);
  router.delete('/services/:serviceId', validateParams(serviceIdParamsSchema), servicesController.deleteCaseService);

  router.get(
    '/:id/portal/conversations',
    validateParams(casePortalConversationParamsSchema),
    getCasePortalConversations
  );

  router.post(
    '/:id/portal/conversations/:threadId/messages',
    validateParams(casePortalConversationMessageParamsSchema),
    validateBody(casePortalConversationMessageSchema),
    replyCasePortalConversation
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
    outcomesController.putInteractionOutcomes
  );

  return router;
};

export const casesV2Routes = createCasesRoutes('v2');
