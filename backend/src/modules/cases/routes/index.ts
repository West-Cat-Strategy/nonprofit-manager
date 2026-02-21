import { Router } from 'express';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import * as documentController from '@controllers/domains/engagement';
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
import { createCaseCatalogController } from '../controllers/catalog.controller';
import { createCaseLifecycleController } from '../controllers/lifecycle.controller';
import { createCaseNotesController } from '../controllers/notes.controller';
import { createCaseMilestonesController } from '../controllers/milestones.controller';
import { createCaseRelationshipsController } from '../controllers/relationships.controller';
import { createCaseServicesController } from '../controllers/services.controller';
import { createCaseOutcomesController } from '../controllers/outcomes.controller';
import { ResponseMode } from '../mappers/responseMode';
import { CaseRepository } from '../repositories/caseRepository';
import { CaseNotesRepository } from '../repositories/caseNotesRepository';
import { CaseMilestonesRepository } from '../repositories/caseMilestonesRepository';
import { CaseRelationshipsRepository } from '../repositories/caseRelationshipsRepository';
import { CaseServicesRepository } from '../repositories/caseServicesRepository';
import { CaseOutcomesRepository } from '../repositories/caseOutcomesRepository';
import { CaseCatalogUseCase } from '../usecases/caseCatalog.usecase';
import { CaseLifecycleUseCase } from '../usecases/caseLifecycle.usecase';
import { CaseNotesUseCase } from '../usecases/caseNotes.usecase';
import { CaseMilestonesUseCase } from '../usecases/caseMilestones.usecase';
import { CaseRelationshipsUseCase } from '../usecases/caseRelationships.usecase';
import { CaseServicesUseCase } from '../usecases/caseServices.usecase';
import { CaseOutcomesUseCase } from '../usecases/caseOutcomes.usecase';

export const createCasesRoutes = (mode: ResponseMode = 'v2'): Router => {
  const router = Router();

  const caseRepository = new CaseRepository();
  const notesRepository = new CaseNotesRepository();
  const milestonesRepository = new CaseMilestonesRepository();
  const relationshipsRepository = new CaseRelationshipsRepository();
  const servicesRepository = new CaseServicesRepository();
  const outcomesRepository = new CaseOutcomesRepository();

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

  router.use(authenticate);

  router.get(
    '/outcomes/definitions',
    validateQuery(caseOutcomeDefinitionsQuerySchema),
    outcomesController.getCaseOutcomeDefinitions
  );

  router.get('/summary', catalogController.getCaseSummary);
  router.get('/types', catalogController.getCaseTypes);
  router.get('/statuses', catalogController.getCaseStatuses);

  router.post('/bulk-status', lifecycleController.bulkUpdateCaseStatus);
  router.post('/', lifecycleController.createCase);
  router.get('/', catalogController.getCases);
  router.get('/:id', catalogController.getCaseById);
  router.put('/:id', lifecycleController.updateCase);
  router.delete('/:id', lifecycleController.deleteCase);
  router.put('/:id/status', lifecycleController.updateCaseStatus);
  router.put('/:id/reassign', lifecycleController.reassignCase);

  router.get('/:id/notes', notesController.getCaseNotes);
  router.post('/notes', notesController.createCaseNote);

  router.get('/:id/documents', documentController.getCaseDocuments);

  router.get('/:id/milestones', milestonesController.getCaseMilestones);
  router.post('/:id/milestones', milestonesController.createCaseMilestone);
  router.put('/milestones/:milestoneId', milestonesController.updateCaseMilestone);
  router.delete('/milestones/:milestoneId', milestonesController.deleteCaseMilestone);

  router.get('/:id/relationships', relationshipsController.getCaseRelationships);
  router.post('/:id/relationships', relationshipsController.createCaseRelationship);
  router.delete('/relationships/:relationshipId', relationshipsController.deleteCaseRelationship);

  router.get('/:id/services', servicesController.getCaseServices);
  router.post('/:id/services', servicesController.createCaseService);
  router.put('/services/:serviceId', servicesController.updateCaseService);
  router.delete('/services/:serviceId', servicesController.deleteCaseService);

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
