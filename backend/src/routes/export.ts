/**
 * Export Routes
 * API routes for exporting analytics data
 */

import { Router } from 'express';
import { body } from 'express-validator';
import {
  exportAnalyticsSummary,
  exportDonations,
  exportVolunteerHours,
  exportEvents,
  exportComprehensive,
} from '../controllers/exportController';
import { authenticate } from '../middleware/auth';
import { requireExportPermission } from '../middleware/analyticsAuth';

const router = Router();

// All routes require authentication and export permissions
router.use(authenticate);
router.use(requireExportPermission);

/**
 * POST /api/export/analytics-summary
 * Export analytics summary
 */
router.post(
  '/analytics-summary',
  [
    body('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format'),
    body('filename').optional().isString(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('donor_type').optional().isString(),
    body('payment_method').optional().isString(),
  ],
  exportAnalyticsSummary
);

/**
 * POST /api/export/donations
 * Export donation data
 */
router.post(
  '/donations',
  [
    body('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format'),
    body('filename').optional().isString(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('donor_id').optional().isUUID(),
    body('payment_method').optional().isString(),
    body('min_amount').optional().isNumeric(),
    body('max_amount').optional().isNumeric(),
  ],
  exportDonations
);

/**
 * POST /api/export/volunteer-hours
 * Export volunteer hours data
 */
router.post(
  '/volunteer-hours',
  [
    body('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format'),
    body('filename').optional().isString(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('volunteer_id').optional().isUUID(),
    body('activity_type').optional().isString(),
  ],
  exportVolunteerHours
);

/**
 * POST /api/export/events
 * Export event attendance data
 */
router.post(
  '/events',
  [
    body('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format'),
    body('filename').optional().isString(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('event_type').optional().isString(),
    body('status').optional().isString(),
  ],
  exportEvents
);

/**
 * POST /api/export/comprehensive
 * Export comprehensive report with multiple sheets
 */
router.post(
  '/comprehensive',
  [
    body('format').optional().isIn(['csv', 'excel']).withMessage('Invalid format (Excel recommended)'),
    body('filename').optional().isString(),
    body('start_date').isISO8601().withMessage('Start date is required'),
    body('end_date').isISO8601().withMessage('End date is required'),
  ],
  exportComprehensive
);

export default router;
