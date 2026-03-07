import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
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
  recipients: z.array(z.string().email()).min(1),
  format: formatSchema.optional(),
  frequency: frequencySchema,
  timezone: timezoneSchema.optional(),
  hour: z.coerce.number().int().min(0).max(23).optional(),
  minute: z.coerce.number().int().min(0).max(59).optional(),
  day_of_week: z.coerce.number().int().min(0).max(6).optional(),
  day_of_month: z.coerce.number().int().min(1).max(28).optional(),
  is_active: z.coerce.boolean().optional(),
});

const updateScheduledReportSchema = z.object({
  name: z.string().trim().min(1).optional(),
  recipients: z.array(z.string().email()).optional(),
  format: formatSchema.optional(),
  frequency: frequencySchema.optional(),
  timezone: timezoneSchema.optional(),
  hour: z.coerce.number().int().min(0).max(23).optional(),
  minute: z.coerce.number().int().min(0).max(59).optional(),
  day_of_week: z.union([z.coerce.number().int().min(0).max(6), z.null()]).optional(),
  day_of_month: z.union([z.coerce.number().int().min(1).max(28), z.null()]).optional(),
  is_active: z.coerce.boolean().optional(),
});

const toggleScheduledReportSchema = z.object({
  is_active: z.coerce.boolean().optional(),
});

const runsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

export const createScheduledReportsRoutes = (): Router => {
  const router = Router();
  const controller = createScheduledReportsController();

  router.use(authenticate);
  router.use(requireActiveOrganizationContext);

  router.get('/', controller.listScheduledReports);
  router.get('/:id', validateParams(reportIdParamSchema), controller.getScheduledReport);
  router.post('/', validateBody(createScheduledReportSchema), controller.createScheduledReport);
  router.put(
    '/:id',
    validateParams(reportIdParamSchema),
    validateBody(updateScheduledReportSchema),
    controller.updateScheduledReport
  );
  router.post(
    '/:id/toggle',
    validateParams(reportIdParamSchema),
    validateBody(toggleScheduledReportSchema),
    controller.toggleScheduledReport
  );
  router.post('/:id/run-now', validateParams(reportIdParamSchema), controller.runScheduledReportNow);
  router.delete('/:id', validateParams(reportIdParamSchema), controller.deleteScheduledReport);
  router.get(
    '/:id/runs',
    validateParams(reportIdParamSchema),
    validateQuery(runsQuerySchema),
    controller.listScheduledReportRuns
  );

  return router;
};

export const scheduledReportsV2Routes = createScheduledReportsRoutes();
