import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { outcomesReportQuerySchema } from '@validations/outcomeImpact';
import { REPORT_ENTITIES } from '@app-types/report';
import { uuidSchema } from '@validations/shared';
import { createReportsController } from '../controllers/reports.controller';
import { type ResponseMode } from '../mappers/responseMode';
import { ReportsRepository } from '../repositories/reports.repository';
import { ReportsUseCase } from '../usecases/reports.usecase';

const entitySchema = z.enum(REPORT_ENTITIES);

const reportAggregationSchema = z.object({
  field: z.string().trim().min(1),
  function: z.enum(['sum', 'avg', 'count', 'min', 'max']),
  alias: z.string().trim().min(1).optional(),
});

const reportFilterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
]);

const reportFilterSchema = z.object({
  field: z.string().trim().min(1),
  operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'between']),
  value: reportFilterValueSchema,
});

const reportSortSchema = z.object({
  field: z.string().trim().min(1),
  direction: z.enum(['asc', 'desc']),
});

const reportGenerateSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  entity: entitySchema,
  fields: z.array(z.string().trim().min(1)).optional(),
  aggregations: z.array(reportAggregationSchema).optional(),
  groupBy: z.array(z.string().trim().min(1)).optional(),
  filters: z.array(reportFilterSchema).optional(),
  sort: z.array(reportSortSchema).optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
}).superRefine((value, ctx) => {
  const hasFields = (value.fields?.length || 0) > 0;
  const hasAggregations = (value.aggregations?.length || 0) > 0;
  if (!hasFields && !hasAggregations) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one field or aggregation must be selected',
      path: ['fields'],
    });
  }
});

const reportFieldsParamsSchema = z.object({
  entity: entitySchema,
});

const reportExportSchema = z.object({
  definition: z.record(z.string(), z.unknown()),
  format: z.enum(['csv', 'xlsx']),
});

const reportTemplateCreateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  entity: entitySchema,
  category: z.string().min(1, 'Category is required'),
  template_definition: z.record(z.string(), z.unknown()),
});

const reportTemplateIdParamsSchema = z.object({
  id: uuidSchema,
});

const reportTemplateListQuerySchema = z.object({
  category: z
    .enum(['fundraising', 'engagement', 'operations', 'finance', 'compliance', 'custom'])
    .optional(),
}).strict();

const instantiateTemplateSchema = z.object({
  parameter_values: z.record(z.string(), z.unknown()).optional(),
  save_as_name: z.string().trim().min(1).max(255).optional(),
});

export const createReportsRoutes = (mode: ResponseMode = 'v2'): Router => {
  const router = Router();
  const controller = createReportsController(
    new ReportsUseCase(new ReportsRepository()),
    mode
  );

  router.use(authenticate);
  router.use(requireActiveOrganizationContext);

  router.post('/generate', validateBody(reportGenerateSchema), controller.generateReport);

  router.get('/outcomes', validateQuery(outcomesReportQuerySchema), controller.getOutcomesReport);

  router.get('/fields/:entity', validateParams(reportFieldsParamsSchema), controller.getAvailableFields);

  router.post('/export', validateBody(reportExportSchema), controller.exportReport);

  router.get('/templates', validateQuery(reportTemplateListQuerySchema), controller.getTemplates);

  router.get('/templates/:id', validateParams(reportTemplateIdParamsSchema), controller.getTemplateById);

  router.post('/templates', validateBody(reportTemplateCreateSchema), controller.createTemplate);

  router.post(
    '/templates/:id/instantiate',
    validateParams(reportTemplateIdParamsSchema),
    validateBody(instantiateTemplateSchema),
    controller.instantiateTemplate
  );

  router.delete('/templates/:id', validateParams(reportTemplateIdParamsSchema), controller.deleteTemplate);

  return router;
};

export const reportsV2Routes = createReportsRoutes('v2');
