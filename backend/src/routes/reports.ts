/**
 * Report Routes
 * API routes for custom report generation
 */

import { Router } from 'express';
import { param, body } from 'express-validator';
import { generateReport, getAvailableFields } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/reports/generate
 * Generate a custom report
 */
router.post(
  '/generate',
  [
    body('name').notEmpty().withMessage('Report name is required'),
    body('entity')
      .isIn(['accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks'])
      .withMessage('Invalid entity type'),
    body('fields').isArray({ min: 1 }).withMessage('At least one field must be selected'),
    body('filters').optional().isArray(),
    body('sort').optional().isArray(),
    body('limit').optional().isInt({ min: 1, max: 10000 }),
    validateRequest,
  ],
  generateReport
);

/**
 * GET /api/reports/fields/:entity
 * Get available fields for an entity type
 */
router.get(
  '/fields/:entity',
  [
    param('entity')
      .isIn(['accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks'])
      .withMessage('Invalid entity type'),
    validateRequest,
  ],
  getAvailableFields
);

export default router;
