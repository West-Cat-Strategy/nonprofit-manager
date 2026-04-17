import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
import {
  discoverFacebookPages,
  getFacebookPageSnapshots,
  getFacebookSettings,
  listFacebookPages,
  syncFacebookPage,
  testFacebookSettings,
  updateFacebookSettings,
} from '../controllers/socialMediaController';

const router = Router();

const withAdminOrgContext = [
  authenticate,
  requireActiveOrganizationContext,
  authorize('admin'),
] as const;

const nullableSecretSchema = z.union([z.string().trim().max(4000), z.literal(''), z.null()]);

const updateFacebookSettingsSchema = z
  .object({
    appId: z.union([z.string().trim().max(255), z.literal(''), z.null()]).optional(),
    appSecret: nullableSecretSchema.optional(),
    accessToken: nullableSecretSchema.optional(),
  })
  .refine(
    (value) =>
      value.appId !== undefined || value.appSecret !== undefined || value.accessToken !== undefined,
    {
      message: 'At least one Facebook settings field must be provided',
      path: ['body'],
    }
  );

const pageParamsSchema = z.object({
  pageId: uuidSchema,
});

const pageSnapshotsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(90).optional(),
  })
  .strict();

router.get('/facebook/settings', ...withAdminOrgContext, getFacebookSettings);
router.put(
  '/facebook/settings',
  ...withAdminOrgContext,
  validateBody(updateFacebookSettingsSchema),
  updateFacebookSettings
);
router.post('/facebook/settings/test', ...withAdminOrgContext, testFacebookSettings);
router.post('/facebook/pages/discover', ...withAdminOrgContext, discoverFacebookPages);
router.get('/facebook/pages', ...withAdminOrgContext, listFacebookPages);
router.get(
  '/facebook/pages/:pageId/snapshots',
  ...withAdminOrgContext,
  validateParams(pageParamsSchema),
  validateQuery(pageSnapshotsQuerySchema),
  getFacebookPageSnapshots
);
router.post(
  '/facebook/pages/:pageId/sync',
  ...withAdminOrgContext,
  validateParams(pageParamsSchema),
  syncFacebookPage
);

export const createSocialMediaRoutes = () => router;

export const socialMediaV2Routes = createSocialMediaRoutes();
