import { Router } from 'express';
import { z } from 'zod';
import * as reportController from '@controllers/reportController';
import * as outcomeReportController from '@controllers/outcomeReportController';
import * as templateController from '@controllers/reportTemplateController';
import { authenticate } from '@middleware/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { outcomesReportQuerySchema } from '@validations/outcomeImpact';

const router = Router();

const validEntities = [
  'accounts',
  'contacts',
  'donations',
  'events',
  'volunteers',
  'tasks',
  'expenses',
  'grants',
  'programs',
] as const;

const entitySchema = z.enum(validEntities);

const reportGenerateSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  entity: entitySchema,
  fields: z.array(z.unknown()).optional(),
  aggregations: z.array(z.unknown()).optional(),
  groupBy: z.array(z.unknown()).optional(),
  filters: z.array(z.unknown()).optional(),
  sort: z.array(z.unknown()).optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
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

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/reports/generate
 * Generate a custom report
 */
router.post('/generate', validateBody(reportGenerateSchema), reportController.generateReport);

/**
 * GET /api/reports/outcomes
 * Get outcomes report with totals and time series
 */
router.get('/outcomes', validateQuery(outcomesReportQuerySchema), outcomeReportController.getOutcomesReport);

/**
 * GET /api/reports/fields/:entity
 * Get available fields for an entity type
 */
router.get('/fields/:entity', validateParams(reportFieldsParamsSchema), reportController.getAvailableFields);

/**
 * POST /api/reports/export
 * Generate and export a report
 */
router.post('/export', validateBody(reportExportSchema), reportController.exportReport);

/**
 * GET /api/reports/templates
 * Get all report templates
 */
router.get('/templates', templateController.getTemplates);

/**
 * GET /api/reports/templates/:id
 * Get template by ID
 */
router.get('/templates/:id', templateController.getTemplateById);

/**
 * POST /api/reports/templates
 * Create custom template
 */
router.post('/templates', validateBody(reportTemplateCreateSchema), templateController.createTemplate);

/**
 * POST /api/reports/templates/:id/instantiate
 * Instantiate template with parameters
 */
router.post('/templates/:id/instantiate', templateController.instantiateTemplate);

/**
 * DELETE /api/reports/templates/:id
 * Delete custom template
 */
router.delete('/templates/:id', templateController.deleteTemplate);

export default router;
