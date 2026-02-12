/**
 * Alert Routes
 * API routes for alert configuration and management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getAlertConfigs,
  getAlertConfig,
  createAlertConfig,
  updateAlertConfig,
  deleteAlertConfig,
  toggleAlertConfig,
  testAlertConfig,
  getAlertInstances,
  acknowledgeAlert,
  resolveAlert,
  getAlertStats,
} from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { validateRequest } from '@middleware/domains/security';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/alerts/configs
 * Get all alert configurations for current user
 */
router.get('/configs', getAlertConfigs);

/**
 * GET /api/alerts/configs/:id
 * Get a specific alert configuration
 */
router.get('/configs/:id', [param('id').isUUID(), validateRequest], getAlertConfig);

/**
 * POST /api/alerts/configs
 * Create a new alert configuration
 */
router.post(
  '/configs',
  [
    body('name').isString().trim().notEmpty().withMessage('Alert name is required'),
    body('metric_type')
      .isString()
      .isIn(['donations', 'donation_amount', 'volunteer_hours', 'event_attendance', 'case_volume', 'engagement_score'])
      .withMessage('Invalid metric type'),
    body('condition')
      .isString()
      .isIn(['exceeds', 'drops_below', 'changes_by', 'anomaly_detected', 'trend_reversal'])
      .withMessage('Invalid condition'),
    body('threshold').optional().isNumeric(),
    body('percentage_change').optional().isNumeric(),
    body('sensitivity').optional().isFloat({ min: 1.0, max: 4.0 }),
    body('frequency')
      .isString()
      .isIn(['real_time', 'daily', 'weekly', 'monthly'])
      .withMessage('Invalid frequency'),
    body('channels').isArray().withMessage('Channels must be an array'),
    body('severity')
      .isString()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid severity'),
    body('enabled').isBoolean().optional(),
    body('recipients').optional().isArray(),
    body('filters').optional().isObject(),
    validateRequest,
  ],
  createAlertConfig
);

/**
 * PUT /api/alerts/configs/:id
 * Update alert configuration
 */
router.put(
  '/configs/:id',
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('metric_type').optional().isString(),
    body('condition').optional().isString(),
    body('threshold').optional().isNumeric(),
    body('percentage_change').optional().isNumeric(),
    body('sensitivity').optional().isFloat({ min: 1.0, max: 4.0 }),
    body('frequency').optional().isString(),
    body('channels').optional().isArray(),
    body('severity').optional().isString(),
    body('enabled').optional().isBoolean(),
    body('recipients').optional().isArray(),
    body('filters').optional().isObject(),
    validateRequest,
  ],
  updateAlertConfig
);

/**
 * DELETE /api/alerts/configs/:id
 * Delete alert configuration
 */
router.delete('/configs/:id', [param('id').isUUID(), validateRequest], deleteAlertConfig);

/**
 * PATCH /api/alerts/configs/:id/toggle
 * Toggle alert enabled status
 */
router.patch('/configs/:id/toggle', [param('id').isUUID(), validateRequest], toggleAlertConfig);

/**
 * POST /api/alerts/test
 * Test alert configuration without saving
 */
router.post(
  '/test',
  [
    body('metric_type').isString().notEmpty(),
    body('condition').isString().notEmpty(),
    body('threshold').optional().isNumeric(),
    body('percentage_change').optional().isNumeric(),
    body('sensitivity').optional().isFloat({ min: 1.0, max: 4.0 }),
    validateRequest,
  ],
  testAlertConfig
);

/**
 * GET /api/alerts/instances
 * Get alert instances (triggered alerts)
 */
router.get(
  '/instances',
  [
    query('status').optional().isString(),
    query('severity').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validateRequest,
  ],
  getAlertInstances
);

/**
 * PATCH /api/alerts/instances/:id/acknowledge
 * Acknowledge an alert instance
 */
router.patch('/instances/:id/acknowledge', [param('id').isUUID(), validateRequest], acknowledgeAlert);

/**
 * PATCH /api/alerts/instances/:id/resolve
 * Resolve an alert instance
 */
router.patch('/instances/:id/resolve', [param('id').isUUID(), validateRequest], resolveAlert);

/**
 * GET /api/alerts/stats
 * Get alert statistics for current user
 */
router.get('/stats', getAlertStats);

export default router;
