/**
 * Dashboard Routes
 * API routes for dashboard configuration
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  getDashboards,
  getDashboard,
  getDefaultDashboard,
  createDashboard,
  updateDashboard,
  updateDashboardLayout,
  deleteDashboard,
} from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';

const router = Router();

const dashboardIdParamsSchema = z.object({
  id: uuidSchema,
});

const createDashboardSchema = z.object({
  name: z.string().trim().min(1, 'Dashboard name is required'),
  is_default: z.coerce.boolean().optional(),
  widgets: z.array(z.unknown()),
  layout: z.array(z.unknown()),
  breakpoints: z.record(z.string(), z.unknown()).optional(),
  cols: z.record(z.string(), z.unknown()).optional(),
});

const updateDashboardSchema = z.object({
  name: z.string().trim().min(1).optional(),
  is_default: z.coerce.boolean().optional(),
  widgets: z.array(z.unknown()).optional(),
  layout: z.array(z.unknown()).optional(),
  breakpoints: z.record(z.string(), z.unknown()).optional(),
  cols: z.record(z.string(), z.unknown()).optional(),
});

const dashboardLayoutSchema = z.object({
  layout: z.array(z.unknown()),
});

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/dashboard/configs
 * Get all dashboard configurations for current user
 */
router.get('/configs', getDashboards);

/**
 * GET /api/dashboard/configs/default
 * Get user's default dashboard (or create if doesn't exist)
 */
router.get('/configs/default', getDefaultDashboard);

/**
 * GET /api/dashboard/configs/:id
 * Get a specific dashboard configuration
 */
router.get('/configs/:id', validateParams(dashboardIdParamsSchema), getDashboard);

/**
 * POST /api/dashboard/configs
 * Create a new dashboard configuration
 */
router.post('/configs', validateBody(createDashboardSchema), createDashboard);

/**
 * PUT /api/dashboard/configs/:id
 * Update dashboard configuration
 */
router.put('/configs/:id', validateParams(dashboardIdParamsSchema), validateBody(updateDashboardSchema), updateDashboard);

/**
 * PUT /api/dashboard/configs/:id/layout
 * Update only the layout of a dashboard (quick save)
 */
router.put('/configs/:id/layout', validateParams(dashboardIdParamsSchema), validateBody(dashboardLayoutSchema), updateDashboardLayout);

/**
 * DELETE /api/dashboard/configs/:id
 * Delete dashboard configuration
 */
router.delete('/configs/:id', validateParams(dashboardIdParamsSchema), deleteDashboard);

export default router;
