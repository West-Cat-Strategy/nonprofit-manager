/**
 * Activity Routes
 * API routes for activity feed
 */

import { Router } from 'express';
import { z } from 'zod';
import { getRecentActivities, getEntityActivities } from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';

const router = Router();
const activityEntityTypeSchema = z.enum(['case', 'donation', 'volunteer', 'event', 'contact']);

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const activityEntityParamsSchema = z.object({
  entityType: activityEntityTypeSchema,
  entityId: uuidSchema,
});

// All routes require authentication
router.use(authenticate);
router.use(requireActiveOrganizationContext);

/**
 * GET /api/activities/recent
 * Get recent activities across the application
 * Query params:
 *   - limit: number of activities to return (default 10, max 50)
 */
router.get('/recent', validateQuery(activityQuerySchema), getRecentActivities);

/**
 * GET /api/activities/:entityType/:entityId
 * Get activities for a specific entity
 * Path params:
 *   - entityType: case | donation | volunteer | event | contact
 *   - entityId: UUID of the entity
 */
router.get('/:entityType/:entityId', validateParams(activityEntityParamsSchema), getEntityActivities);

export default router;
