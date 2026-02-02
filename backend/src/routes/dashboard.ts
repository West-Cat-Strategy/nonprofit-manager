/**
 * Dashboard Routes
 * API routes for dashboard configuration
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getDashboards,
  getDashboard,
  getDefaultDashboard,
  createDashboard,
  updateDashboard,
  updateDashboardLayout,
  deleteDashboard,
} from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

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
router.get('/configs/:id', [param('id').isUUID()], getDashboard);

/**
 * POST /api/dashboard/configs
 * Create a new dashboard configuration
 */
router.post(
  '/configs',
  [
    body('name').isString().trim().notEmpty().withMessage('Dashboard name is required'),
    body('is_default').isBoolean().optional(),
    body('widgets').isArray().withMessage('Widgets must be an array'),
    body('layout').isArray().withMessage('Layout must be an array'),
    body('breakpoints').optional().isObject(),
    body('cols').optional().isObject(),
  ],
  createDashboard
);

/**
 * PUT /api/dashboard/configs/:id
 * Update dashboard configuration
 */
router.put(
  '/configs/:id',
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('is_default').optional().isBoolean(),
    body('widgets').optional().isArray(),
    body('layout').optional().isArray(),
    body('breakpoints').optional().isObject(),
    body('cols').optional().isObject(),
  ],
  updateDashboard
);

/**
 * PUT /api/dashboard/configs/:id/layout
 * Update only the layout of a dashboard (quick save)
 */
router.put(
  '/configs/:id/layout',
  [param('id').isUUID(), body('layout').isArray().withMessage('Layout must be an array')],
  updateDashboardLayout
);

/**
 * DELETE /api/dashboard/configs/:id
 * Delete dashboard configuration
 */
router.delete('/configs/:id', [param('id').isUUID()], deleteDashboard);

export default router;
