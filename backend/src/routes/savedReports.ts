/**
 * Saved Report Routes
 * API routes for saved report management
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  getSavedReports,
  getSavedReportById,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
} from '@controllers/domains/engagement';
import * as sharingController from '@controllers/reportSharingController';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';

const router = Router();

const reportEntitySchema = z.enum(['accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks']);
const reportIdParamsSchema = z.object({
  id: uuidSchema,
});

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO8601 date');

const createSavedReportSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  entity: reportEntitySchema,
  report_definition: z.record(z.string(), z.unknown()),
  is_public: z.coerce.boolean().optional(),
});

const updateSavedReportSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  report_definition: z.record(z.string(), z.unknown()).optional(),
  is_public: z.coerce.boolean().optional(),
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
router.get('/:id', validateParams(reportIdParamsSchema), getSavedReportById);

/**
 * POST /api/saved-reports
 * Create a new saved report
 */
router.post('/', validateBody(createSavedReportSchema), createSavedReport);

/**
 * PUT /api/saved-reports/:id
 * Update an existing saved report
 */
router.put('/:id', validateParams(reportIdParamsSchema), validateBody(updateSavedReportSchema), updateSavedReport);

/**
 * DELETE /api/saved-reports/:id
 * Delete a saved report
 */
router.delete('/:id', validateParams(reportIdParamsSchema), deleteSavedReport);

/**
 * POST /api/saved-reports/:id/share
 * Share report with users or roles
 */
router.post('/:id/share', validateParams(reportIdParamsSchema), validateBody(reportShareSchema), sharingController.shareReport);

/**
 * DELETE /api/saved-reports/:id/share
 * Remove share access
 */
router.delete(
  '/:id/share',
  validateParams(reportIdParamsSchema),
  validateBody(reportShareDeleteSchema),
  sharingController.removeShare
);

/**
 * POST /api/saved-reports/:id/public-link
 * Generate public shareable link
 */
router.post(
  '/:id/public-link',
  validateParams(reportIdParamsSchema),
  validateBody(reportPublicLinkSchema),
  sharingController.generatePublicLink
);

/**
 * DELETE /api/saved-reports/:id/public-link
 * Revoke public link
 */
router.delete('/:id/public-link', validateParams(reportIdParamsSchema), sharingController.revokePublicLink);

export default router;
