import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@middleware/permissions';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
import { Permission } from '@utils/permissions';
import {
  createAppealCampaign,
  getAppealCampaign,
  listAppealCampaigns,
  updateAppealCampaign,
} from '../controllers/appealCampaignController';

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const appealCampaignKindSchema = z.enum(['appeal', 'campaign']);
const appealCampaignStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);
const appealCampaignProviderSchema = z.enum(['local_email', 'mailchimp', 'mautic']);

const providerLinkSchema = z
  .object({
    provider: appealCampaignProviderSchema,
    providerCampaignId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    providerAudienceId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    label: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const createAppealCampaignSchema = z
  .object({
    code: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().min(1).max(255),
    description: z.union([z.string().trim().max(5000), z.null()]).optional(),
    kind: appealCampaignKindSchema.optional(),
    status: appealCampaignStatusSchema.optional(),
    startDate: z.union([dateOnlySchema, z.null()]).optional(),
    endDate: z.union([dateOnlySchema, z.null()]).optional(),
    compatibilityLabels: z.array(z.string().trim().min(1).max(255)).max(50).optional(),
    providerLinks: z.array(providerLinkSchema).max(20).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const updateAppealCampaignSchema = createAppealCampaignSchema.partial().strict();

const appealCampaignIdParamSchema = z.object({
  id: uuidSchema,
});

const listAppealCampaignQuerySchema = z
  .object({
    status: appealCampaignStatusSchema.optional(),
  })
  .strict();

export const createAppealCampaignsRoutes = (): Router => {
  const router = Router();

  router.use(requireActiveOrganizationContext);

  router.get(
    '/',
    requirePermission(Permission.DONATION_VIEW),
    validateQuery(listAppealCampaignQuerySchema),
    listAppealCampaigns
  );
  router.post(
    '/',
    requirePermission(Permission.DONATION_CREATE),
    validateBody(createAppealCampaignSchema),
    createAppealCampaign
  );
  router.get(
    '/:id',
    requirePermission(Permission.DONATION_VIEW),
    validateParams(appealCampaignIdParamSchema),
    getAppealCampaign
  );
  router.patch(
    '/:id',
    requirePermission(Permission.DONATION_EDIT),
    validateParams(appealCampaignIdParamSchema),
    validateBody(updateAppealCampaignSchema),
    updateAppealCampaign
  );

  return router;
};

export const appealCampaignsV2Routes = createAppealCampaignsRoutes();
