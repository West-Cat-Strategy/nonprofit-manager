import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requirePermission } from '@middleware/permissions';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { isoDateTimeSchema, optionalStrictBooleanSchema, uuidSchema } from '@validations/shared';
import { REPORT_ENTITIES } from '@app-types/report';
import { Permission } from '@utils/permissions';
import { createSavedReportsController } from '../controllers/savedReports.controller';

const reportEntitySchema = z.enum(REPORT_ENTITIES);
const reportIdParamsSchema = z.object({
  id: uuidSchema,
});
const savedReportListQuerySchema = z
  .object({
    entity: reportEntitySchema.optional(),
    page: z.coerce.number().int().min(1).max(10_000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    summary: optionalStrictBooleanSchema,
  })
  .strict();

const sharePrincipalsQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

const dateStringSchema = isoDateTimeSchema;

const createSavedReportSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  entity: reportEntitySchema,
  report_definition: z.record(z.string(), z.unknown()),
  is_public: optionalStrictBooleanSchema,
});

const updateSavedReportSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  report_definition: z.record(z.string(), z.unknown()).optional(),
  is_public: optionalStrictBooleanSchema,
});

const reportShareSchema = z.object({
  user_ids: z.array(z.string()).optional(),
  role_names: z.array(z.string()).optional(),
  share_settings: z.record(z.string(), z.unknown()).optional(),
});

const reportShareDeleteSchema = z.object({
  user_ids: z.array(z.string()).optional(),
  role_names: z.array(z.string()).optional(),
});

const reportPublicLinkSchema = z.object({
  expires_at: dateStringSchema.optional(),
});

export const createSavedReportsRoutes = (): Router => {
  const router = Router();
  const controller = createSavedReportsController();

  router.use(authenticate);

  router.get(
    '/',
    requirePermission(Permission.REPORT_VIEW),
    validateQuery(savedReportListQuerySchema),
    controller.getSavedReports
  );

  router.get(
    '/share/principals',
    requirePermission(Permission.REPORT_CREATE),
    validateQuery(sharePrincipalsQuerySchema),
    controller.getSharePrincipals
  );

  router.get(
    '/:id',
    requirePermission(Permission.REPORT_VIEW),
    validateParams(reportIdParamsSchema),
    controller.getSavedReportById
  );

  router.post(
    '/',
    requirePermission(Permission.REPORT_CREATE),
    validateBody(createSavedReportSchema),
    controller.createSavedReport
  );

  router.put(
    '/:id',
    requirePermission(Permission.REPORT_CREATE),
    validateParams(reportIdParamsSchema),
    validateBody(updateSavedReportSchema),
    controller.updateSavedReport
  );

  router.delete(
    '/:id',
    requirePermission(Permission.REPORT_CREATE),
    validateParams(reportIdParamsSchema),
    controller.deleteSavedReport
  );

  router.post(
    '/:id/share',
    requirePermission(Permission.REPORT_CREATE),
    validateParams(reportIdParamsSchema),
    validateBody(reportShareSchema),
    controller.shareReport
  );

  router.delete(
    '/:id/share',
    requirePermission(Permission.REPORT_CREATE),
    validateParams(reportIdParamsSchema),
    validateBody(reportShareDeleteSchema),
    controller.removeShare
  );

  router.post(
    '/:id/public-link',
    requirePermission(Permission.REPORT_CREATE),
    validateParams(reportIdParamsSchema),
    validateBody(reportPublicLinkSchema),
    controller.generatePublicLink
  );

  router.delete(
    '/:id/public-link',
    requirePermission(Permission.REPORT_CREATE),
    validateParams(reportIdParamsSchema),
    controller.revokePublicLink
  );

  return router;
};

export const savedReportsV2Routes = createSavedReportsRoutes();
