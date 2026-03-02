import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
import { opportunitiesController } from '../controllers/opportunities.controller';

const statusSchema = z.enum(['open', 'won', 'lost']);

const opportunityIdParamSchema = z.object({
  id: uuidSchema,
});

const stageIdParamSchema = z.object({
  stageId: uuidSchema,
});

const listOpportunitiesQuerySchema = z.object({
  stage_id: uuidSchema.optional(),
  status: statusSchema.optional(),
  assigned_to: uuidSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createStageSchema = z.object({
  name: z.string().trim().min(1),
  stage_order: z.coerce.number().int().min(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  is_closed: z.coerce.boolean().optional(),
  is_won: z.coerce.boolean().optional(),
  is_active: z.coerce.boolean().optional(),
});

const updateStageSchema = z.object({
  name: z.string().trim().min(1).optional(),
  stage_order: z.coerce.number().int().min(0).optional(),
  probability: z.union([z.coerce.number().int().min(0).max(100), z.null()]).optional(),
  is_closed: z.coerce.boolean().optional(),
  is_won: z.coerce.boolean().optional(),
  is_active: z.coerce.boolean().optional(),
});

const reorderStagesSchema = z.object({
  stage_ids: z.array(uuidSchema).min(1),
});

const createOpportunitySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  stage_id: uuidSchema.optional(),
  account_id: uuidSchema.optional(),
  contact_id: uuidSchema.optional(),
  donation_id: uuidSchema.optional(),
  amount: z.coerce.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  expected_close_date: z.string().optional(),
  status: statusSchema.optional(),
  loss_reason: z.string().trim().optional(),
  source: z.string().trim().optional(),
  assigned_to: uuidSchema.optional(),
});

const updateOpportunitySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.union([z.string().trim(), z.null()]).optional(),
  stage_id: uuidSchema.optional(),
  account_id: z.union([uuidSchema, z.null()]).optional(),
  contact_id: z.union([uuidSchema, z.null()]).optional(),
  donation_id: z.union([uuidSchema, z.null()]).optional(),
  amount: z.union([z.coerce.number().min(0), z.null()]).optional(),
  currency: z.string().trim().length(3).optional(),
  expected_close_date: z.union([z.string(), z.null()]).optional(),
  actual_close_date: z.union([z.string(), z.null()]).optional(),
  status: statusSchema.optional(),
  loss_reason: z.union([z.string().trim(), z.null()]).optional(),
  source: z.union([z.string().trim(), z.null()]).optional(),
  assigned_to: z.union([uuidSchema, z.null()]).optional(),
});

const moveStageSchema = z.object({
  stage_id: uuidSchema,
  notes: z.string().trim().optional(),
});

export const createOpportunitiesRoutes = (): Router => {
  const router = Router();

  router.use(authenticate);
  router.use(requireActiveOrganizationContext);

  router.get('/stages', opportunitiesController.listStages);
  router.post('/stages', validateBody(createStageSchema), opportunitiesController.createStage);
  router.put('/stages/:stageId', validateParams(stageIdParamSchema), validateBody(updateStageSchema), opportunitiesController.updateStage);
  router.post('/stages/reorder', validateBody(reorderStagesSchema), opportunitiesController.reorderStages);

  router.get('/summary', opportunitiesController.getOpportunitySummary);
  router.get('/', validateQuery(listOpportunitiesQuerySchema), opportunitiesController.listOpportunities);
  router.get('/:id', validateParams(opportunityIdParamSchema), opportunitiesController.getOpportunityById);
  router.post('/', validateBody(createOpportunitySchema), opportunitiesController.createOpportunity);
  router.put('/:id', validateParams(opportunityIdParamSchema), validateBody(updateOpportunitySchema), opportunitiesController.updateOpportunity);
  router.post('/:id/move-stage', validateParams(opportunityIdParamSchema), validateBody(moveStageSchema), opportunitiesController.moveOpportunityStage);
  router.delete('/:id', validateParams(opportunityIdParamSchema), opportunitiesController.deleteOpportunity);

  return router;
};

export const opportunitiesV2Routes = createOpportunitiesRoutes();
export const opportunitiesApiRoutes = createOpportunitiesRoutes();
