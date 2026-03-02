import express from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
import * as externalServiceProviderController from '@controllers/domains/engagement';

const router = express.Router();
router.use(authenticate);
router.use(requireActiveOrganizationContext);

const externalServiceProviderIdParamsSchema = z.object({
  id: uuidSchema,
});

const externalServiceProviderQuerySchema = z.object({
  search: z.string().trim().optional(),
  provider_type: z.string().trim().min(1).max(100).optional(),
  include_inactive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const createExternalServiceProviderSchema = z.object({
  provider_name: z.string().trim().min(1).max(255),
  provider_type: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().max(5000).optional(),
  is_active: z.coerce.boolean().optional(),
});

const updateExternalServiceProviderSchema = z
  .object({
    provider_name: z.string().trim().min(1).max(255).optional(),
    provider_type: z.string().trim().min(1).max(100).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    is_active: z.coerce.boolean().optional(),
  })
  .refine(
    (value) =>
      value.provider_name !== undefined ||
      value.provider_type !== undefined ||
      value.notes !== undefined ||
      value.is_active !== undefined,
    {
      message: 'At least one field must be provided',
      path: ['body'],
    }
  );

router.get(
  '/',
  validateQuery(externalServiceProviderQuerySchema),
  externalServiceProviderController.getExternalServiceProviders
);
router.post(
  '/',
  validateBody(createExternalServiceProviderSchema),
  externalServiceProviderController.createExternalServiceProvider
);
router.put(
  '/:id',
  validateParams(externalServiceProviderIdParamsSchema),
  validateBody(updateExternalServiceProviderSchema),
  externalServiceProviderController.updateExternalServiceProvider
);
router.delete(
  '/:id',
  validateParams(externalServiceProviderIdParamsSchema),
  externalServiceProviderController.deleteExternalServiceProvider
);

export default router;
