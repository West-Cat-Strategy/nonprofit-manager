/**
 * Activity Routes
 * API routes for activity feed
 */

import { Router } from 'express';
import { getRecentActivities, getEntityActivities } from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/activities/recent
 * Get recent activities across the application
 * Query params:
 *   - limit: number of activities to return (default 10, max 50)
 */
router.get('/recent', getRecentActivities);

/**
 * GET /api/activities/:entityType/:entityId
 * Get activities for a specific entity
 * Path params:
 *   - entityType: case | donation | volunteer | event | contact
 *   - entityId: UUID of the entity
 */
router.get('/:entityType/:entityId', getEntityActivities);

export default router;
