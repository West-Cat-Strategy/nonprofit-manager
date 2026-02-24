/**
 * Alert Routes
 * API routes for alert configuration and management
 */

import { Router } from 'express';
import { z } from 'zod';
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
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';

const router = Router();

const alertMetricTypeSchema = z.enum([
  'donations',
  'donation_amount',
  'volunteer_hours',
  'event_attendance',
  'case_volume',
  'engagement_score',
]);

const alertConditionSchema = z.enum([
  'exceeds',
  'drops_below',
  'changes_by',
  'anomaly_detected',
  'trend_reversal',
]);

const alertFrequencySchema = z.enum(['real_time', 'daily', 'weekly', 'monthly']);
const alertSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

const alertIdParamsSchema = z.object({
  id: uuidSchema,
});

const createAlertConfigSchema = z.object({
  name: z.string().trim().min(1, 'Alert name is required'),
  metric_type: alertMetricTypeSchema,
  condition: alertConditionSchema,
  threshold: z.coerce.number().optional(),
  percentage_change: z.coerce.number().optional(),
  sensitivity: z.coerce.number().min(1).max(4).optional(),
  frequency: alertFrequencySchema,
  channels: z.array(z.unknown()),
  severity: alertSeveritySchema,
  enabled: z.coerce.boolean().optional(),
  recipients: z.array(z.unknown()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

const updateAlertConfigSchema = z.object({
  name: z.string().trim().min(1).optional(),
  metric_type: z.string().optional(),
  condition: z.string().optional(),
  threshold: z.coerce.number().optional(),
  percentage_change: z.coerce.number().optional(),
  sensitivity: z.coerce.number().min(1).max(4).optional(),
  frequency: z.string().optional(),
  channels: z.array(z.unknown()).optional(),
  severity: z.string().optional(),
  enabled: z.coerce.boolean().optional(),
  recipients: z.array(z.unknown()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

const testAlertConfigSchema = z.object({
  metric_type: z.string().min(1),
  condition: z.string().min(1),
  threshold: z.coerce.number().optional(),
  percentage_change: z.coerce.number().optional(),
  sensitivity: z.coerce.number().min(1).max(4).optional(),
});

const alertInstancesQuerySchema = z.object({
  status: z.string().optional(),
  severity: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

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
router.get('/configs/:id', validateParams(alertIdParamsSchema), getAlertConfig);

/**
 * POST /api/alerts/configs
 * Create a new alert configuration
 */
router.post('/configs', validateBody(createAlertConfigSchema), createAlertConfig);

/**
 * PUT /api/alerts/configs/:id
 * Update alert configuration
 */
router.put('/configs/:id', validateParams(alertIdParamsSchema), validateBody(updateAlertConfigSchema), updateAlertConfig);

/**
 * DELETE /api/alerts/configs/:id
 * Delete alert configuration
 */
router.delete('/configs/:id', validateParams(alertIdParamsSchema), deleteAlertConfig);

/**
 * PATCH /api/alerts/configs/:id/toggle
 * Toggle alert enabled status
 */
router.patch('/configs/:id/toggle', validateParams(alertIdParamsSchema), toggleAlertConfig);

/**
 * POST /api/alerts/test
 * Test alert configuration without saving
 */
router.post('/test', validateBody(testAlertConfigSchema), testAlertConfig);

/**
 * GET /api/alerts/instances
 * Get alert instances (triggered alerts)
 */
router.get('/instances', validateQuery(alertInstancesQuerySchema), getAlertInstances);

/**
 * PATCH /api/alerts/instances/:id/acknowledge
 * Acknowledge an alert instance
 */
router.patch('/instances/:id/acknowledge', validateParams(alertIdParamsSchema), acknowledgeAlert);

/**
 * PATCH /api/alerts/instances/:id/resolve
 * Resolve an alert instance
 */
router.patch('/instances/:id/resolve', validateParams(alertIdParamsSchema), resolveAlert);

/**
 * GET /api/alerts/stats
 * Get alert statistics for current user
 */
router.get('/stats', getAlertStats);

export default router;
