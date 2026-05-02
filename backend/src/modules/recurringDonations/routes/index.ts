import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
import { createRecurringDonationsController } from '../controllers';

const recurringDonationPlanStatusSchema = z.enum([
  'checkout_pending',
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'paused',
]);

const planIdParamSchema = z.object({
  id: uuidSchema,
});

const sessionIdParamSchema = z.object({
  sessionId: z.string().trim().min(1).max(255),
});

const tokenParamSchema = z.object({
  token: z.string().trim().min(16).max(255),
});

const plansQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(255).optional(),
    status: recurringDonationPlanStatusSchema.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const checkoutResultQuerySchema = z
  .object({
    plan_id: uuidSchema,
    return_to: z.string().url().optional(),
  })
  .strict();

const updatePlanSchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    campaign_name: z.union([z.string().trim().max(255), z.null()]).optional(),
    designation_id: z.union([uuidSchema, z.null()]).optional(),
    designation: z.union([z.string().trim().max(255), z.null()]).optional(),
    notes: z.union([z.string().trim().max(2000), z.null()]).optional(),
  })
  .strict();

export const createRecurringDonationsRoutes = (): Router => {
  const router = Router();
  const controller = createRecurringDonationsController();

  router.get(
    '/checkout-result/:sessionId',
    validateParams(sessionIdParamSchema),
    validateQuery(checkoutResultQuerySchema),
    controller.getCheckoutResult
  );

  router.get(
    '/manage/:token/portal',
    validateParams(tokenParamSchema),
    controller.redirectToManagementPortal
  );

  router.use(authenticate);
  router.use(requireActiveOrganizationContext);

  router.get('/', validateQuery(plansQuerySchema), controller.listPlans);
  router.get('/:id', validateParams(planIdParamSchema), controller.getPlan);
  router.put(
    '/:id',
    validateParams(planIdParamSchema),
    validateBody(updatePlanSchema),
    controller.updatePlan
  );
  router.post('/:id/cancel', validateParams(planIdParamSchema), controller.cancelPlan);
  router.post('/:id/reactivate', validateParams(planIdParamSchema), controller.reactivatePlan);
  router.post(
    '/:id/management-link',
    validateParams(planIdParamSchema),
    controller.generateManagementLink
  );

  return router;
};

export const recurringDonationsV2Routes = createRecurringDonationsRoutes();
