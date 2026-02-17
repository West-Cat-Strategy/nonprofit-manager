import { Router } from 'express';
import { param, body } from 'express-validator';
import * as reportController from '@controllers/reportController';
import { authenticate } from '@middleware/auth';
import { validateRequest } from '@middleware/validateRequest';

const router = Router();

// All routes require authentication
router.use(authenticate);

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
];

/**
 * POST /api/reports/generate
 * Generate a custom report
 */
router.post(
  '/generate',
  [
    body('name').notEmpty().withMessage('Report name is required'),
    body('entity').isIn(validEntities).withMessage('Invalid entity type'),
    body('fields').optional().isArray().withMessage('Fields must be an array'),
    body('aggregations').optional().isArray(),
    body('groupBy').optional().isArray(),
    body('filters').optional().isArray(),
    body('sort').optional().isArray(),
    body('limit').optional().isInt({ min: 1, max: 10000 }),
    validateRequest,
  ],
  reportController.generateReport
);

/**
 * GET /api/reports/fields/:entity
 * Get available fields for an entity type
 */
router.get(
  '/fields/:entity',
  [param('entity').isIn(validEntities).withMessage('Invalid entity type'), validateRequest],
  reportController.getAvailableFields
);

/**
 * POST /api/reports/export
 * Generate and export a report
 */
router.post(
  '/export',
  [
    body('definition').isObject().withMessage('Report definition is required'),
    body('format').isIn(['csv', 'xlsx']).withMessage('Invalid export format'),
    validateRequest,
  ],
  reportController.exportReport
);

/**
 * Template Routes
 */
import * as templateController from '@controllers/reportTemplateController';

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
router.post(
  '/templates',
  [
    body('name').notEmpty().withMessage('Template name is required'),
    body('entity').isIn(validEntities).withMessage('Invalid entity type'),
    body('category').notEmpty().withMessage('Category is required'),
    body('template_definition').isObject().withMessage('Template definition is required'),
    validateRequest,
  ],
  templateController.createTemplate
);

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
