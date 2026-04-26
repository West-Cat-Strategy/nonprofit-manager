import { Router } from 'express';
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
import { CaseReassessmentsRepository } from '../repositories/caseReassessmentsRepository';
import {
  bulkStatusUpdateSchema,
  cancelCaseReassessmentSchema,
  caseCatalogQuerySchema,
  caseDocumentDownloadQuerySchema,
  caseFormDefaultDetailParamsSchema,
  caseFormInstantiateParamsSchema,
  caseIdParamsSchema,
  caseReassessmentParamsSchema,
  caseTimelineQuerySchema,
  completeCaseReassessmentSchema,
  createCaseMilestoneSchema,
  createCaseNoteSchema,
  createCaseOutcomeSchema,
  createCaseReassessmentSchema,
  createCaseRelationshipSchema,
  createCaseSchema,
  createCaseServiceSchema,
  createTopicDefinitionSchema,
  createTopicEventSchema,
  documentIdParamsSchema,
  milestoneIdParamsSchema,
  noteIdParamsSchema,
  outcomeIdParamsSchema,
  queueViewParamsSchema,
  reassignCaseSchema,
  relationshipIdParamsSchema,
  resolveCasePortalConversationSchema,
  serviceIdParamsSchema,
  topicEventIdParamsSchema,
  updateCaseClientViewableSchema,
  updateCaseDocumentSchema,
  updateCaseMilestoneSchema,
  updateCaseNoteSchema,
  updateCaseOutcomeSchema,
  updateCaseReassessmentSchema,
  updateCaseSchema,
  updateCaseServiceSchema,
  updateCaseStatusSchema,
} from './caseRouteSchemas';

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
  const reassessmentsRepository = new CaseReassessmentsRepository();

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
    '/:id/reassessments',
    validateParams(caseIdParamsSchema),
    requirePermission(Permission.CASE_VIEW),
    async (req, res, next) => {
      try {
        const reassessments = await reassessmentsRepository.list(
          req.params.id,
          req.organizationId ?? ''
        );
        sendSuccess(res, reassessments);
      } catch (error) {
        next(error);
      }
    }
  );
  router.post(
    '/:id/reassessments',
    validateParams(caseIdParamsSchema),
    validateBody(createCaseReassessmentSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const reassessment = await reassessmentsRepository.create(
          req.params.id,
          req.organizationId ?? '',
          req.user?.id ?? '',
          req.validatedBody ?? req.body
        );
        sendSuccess(res, reassessment, 201);
      } catch (error) {
        next(error);
      }
    }
  );
  router.patch(
    '/:id/reassessments/:reassessmentId',
    validateParams(caseReassessmentParamsSchema),
    validateBody(updateCaseReassessmentSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const reassessment = await reassessmentsRepository.update(
          req.params.id,
          req.params.reassessmentId,
          req.organizationId ?? '',
          req.user?.id ?? '',
          req.validatedBody ?? req.body
        );
        sendSuccess(res, reassessment);
      } catch (error) {
        next(error);
      }
    }
  );
  router.post(
    '/:id/reassessments/:reassessmentId/complete',
    validateParams(caseReassessmentParamsSchema),
    validateBody(completeCaseReassessmentSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const result = await reassessmentsRepository.complete(
          req.params.id,
          req.params.reassessmentId,
          req.organizationId ?? '',
          req.user?.id ?? '',
          req.validatedBody ?? req.body
        );
        sendSuccess(res, result);
      } catch (error) {
        next(error);
      }
    }
  );
  router.post(
    '/:id/reassessments/:reassessmentId/cancel',
    validateParams(caseReassessmentParamsSchema),
    validateBody(cancelCaseReassessmentSchema),
    requirePermission(Permission.CASE_EDIT),
    async (req, res, next) => {
      try {
        const reassessment = await reassessmentsRepository.cancel(
          req.params.id,
          req.params.reassessmentId,
          req.organizationId ?? '',
          req.user?.id ?? '',
          (req.validatedBody ?? req.body).cancellation_reason
        );
        sendSuccess(res, reassessment);
      } catch (error) {
        next(error);
      }
    }
  );
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
