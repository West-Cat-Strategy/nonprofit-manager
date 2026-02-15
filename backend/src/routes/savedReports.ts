/**
 * Saved Report Routes
 * API routes for saved report management
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getSavedReports,
  getSavedReportById,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
} from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { validateRequest } from '@middleware/domains/security';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/saved-reports
 * Get all saved reports for current user
 */
router.get('/', getSavedReports);

/**
 * GET /api/saved-reports/:id
 * Get a specific saved report by ID
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid report ID'),
    validateRequest,
  ],
  getSavedReportById
);

/**
 * POST /api/saved-reports
 * Create a new saved report
 */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('description').optional().trim(),
    body('entity')
      .isIn(['accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks'])
      .withMessage('Invalid entity type'),
    body('report_definition').isObject().withMessage('Report definition must be an object'),
    body('is_public').optional().isBoolean().withMessage('is_public must be a boolean'),
    validateRequest,
  ],
  createSavedReport
);

/**
 * PUT /api/saved-reports/:id
 * Update an existing saved report
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid report ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
    body('description').optional().trim(),
    body('report_definition').optional().isObject().withMessage('Report definition must be an object'),
    body('is_public').optional().isBoolean().withMessage('is_public must be a boolean'),
    validateRequest,
  ],
  updateSavedReport
);

/**
 * DELETE /api/saved-reports/:id
 * Delete a saved report
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid report ID'),
    validateRequest,
  ],
  deleteSavedReport
);

/**
 * Sharing Routes
 */
import * as sharingController from '@controllers/reportSharingController';

/**
 * POST /api/saved-reports/:id/share
 * Share report with users or roles
 */
router.post(
  '/:id/share',
  [
    param('id').isUUID().withMessage('Invalid report ID'),
    body('user_ids').optional().isArray(),
    body('role_names').optional().isArray(),
    body('share_settings').optional().isObject(),
    validateRequest,
  ],
  sharingController.shareReport
);

/**
 * DELETE /api/saved-reports/:id/share
 * Remove share access
 */
router.delete(
  '/:id/share',
  [
    param('id').isUUID().withMessage('Invalid report ID'),
    body('user_ids').optional().isArray(),
    body('role_names').optional().isArray(),
    validateRequest,
  ],
  sharingController.removeShare
);

/**
 * POST /api/saved-reports/:id/public-link
 * Generate public shareable link
 */
router.post(
  '/:id/public-link',
  [
    param('id').isUUID().withMessage('Invalid report ID'),
    body('expires_at').optional().isISO8601(),
    validateRequest,
  ],
  sharingController.generatePublicLink
);

/**
 * DELETE /api/saved-reports/:id/public-link
 * Revoke public link
 */
router.delete(
  '/:id/public-link',
  [param('id').isUUID().withMessage('Invalid report ID'), validateRequest],
  sharingController.revokePublicLink
);

export default router;
