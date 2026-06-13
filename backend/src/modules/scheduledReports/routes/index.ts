import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requirePermission } from '@middleware/permissions';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { emailSchema, optionalStrictBooleanSchema, uuidSchema } from '@validations/shared';
import { Permission } from '@utils/permissions';
import { createScheduledReportsController } from '../controllers/scheduledReports.controller';

const frequencySchema = z.enum(['daily', 'weekly', 'monthly']);
const formatSchema = z.enum(['csv', 'xlsx']);
const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }, 'Invalid timezone');

const reportIdParamSchema = z.object({
  id: uuidSchema,
});

const createScheduledReportSchema = z.object({
  saved_report_id: uuidSchema,
  name: z.string().trim().min(1).optional(),
  recipients: z.array(emailSchema).min(1),
  format: formatSchema.optional(),
  frequency: frequencySchema,
  timezone: timezoneSchema.optional(),
  hour: z.coerce.number().int().min(0).max(23).optional(),
  minute: z.coerce.number().int().min(0).max(59).optional(),
  day_of_week: z.coerce.number().int().min(0).max(6).optional(),
  day_of_month: z.coerce.number().int().min(1).max(28).optional(),
  is_active: optionalStrictBooleanSchema,
});

const updateScheduledReportSchema = z.object({
  name: z.string().trim().min(1).optional(),
  recipients: z.array(emailSchema).optional(),
  format: formatSchema.optional(),
  frequency: frequencySchema.optional(),
  timezone: timezoneSchema.optional(),
  hour: z.coerce.number().int().min(0).max(23).optional(),
  minute: z.coerce.number().int().min(0).max(59).optional(),
  day_of_week: z.union([z.coerce.number().int().min(0).max(6), z.null()]).optional(),
  day_of_month: z.union([z.coerce.number().int().min(1).max(28), z.null()]).optional(),
  is_active: optionalStrictBooleanSchema,
});

const toggleScheduledReportSchema = z.object({
  is_active: optionalStrictBooleanSchema,
});

const runsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const createScheduledReportsRoutes = (): Router => {
  const router = Router();
  const controller = createScheduledReportsController();

  router.use(authenticate);
  router.use(requireActiveOrganizationContext);

  router.get('/', requirePermission(Permission.SCHEDULED_REPORT_VIEW), controller.listScheduledReports);
  router.get(
    '/:id',
    requirePermission(Permission.SCHEDULED_REPORT_VIEW),
    validateParams(reportIdParamSchema),
    controller.getScheduledReport
  );
  router.post(
    '/',
    requirePermission(Permission.SCHEDULED_REPORT_MANAGE),
    validateBody(createScheduledReportSchema),
    controller.createScheduledReport
  );
  router.put(
    '/:id',
    requirePermission(Permission.SCHEDULED_REPORT_MANAGE),
    validateParams(reportIdParamSchema),
    validateBody(updateScheduledReportSchema),
    controller.updateScheduledReport
  );
  router.post(
    '/:id/toggle',
    requirePermission(Permission.SCHEDULED_REPORT_MANAGE),
    validateParams(reportIdParamSchema),
    validateBody(toggleScheduledReportSchema),
    controller.toggleScheduledReport
  );
  router.post(
    '/:id/run-now',
    requirePermission(Permission.SCHEDULED_REPORT_MANAGE),
    requirePermission(Permission.REPORT_EXPORT),
    validateParams(reportIdParamSchema),
    controller.runScheduledReportNow
  );
  router.delete(
    '/:id',
    requirePermission(Permission.SCHEDULED_REPORT_MANAGE),
    validateParams(reportIdParamSchema),
    controller.deleteScheduledReport
  );
  router.get(
    '/:id/runs',
    requirePermission(Permission.SCHEDULED_REPORT_VIEW),
    validateParams(reportIdParamSchema),
    validateQuery(runsQuerySchema),
    controller.listScheduledReportRuns
  );

  return router;
};

export const scheduledReportsV2Routes = createScheduledReportsRoutes();
