/**
 * Activity Controller
 * Handles activity feed requests
 */

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { activityService } from '@services/domains/engagement';
import { logger } from '@config/logger';
import { PAGINATION } from '@config/constants';
import { sendSuccess } from '@modules/shared/http/envelope';

type EntityType = 'case' | 'donation' | 'volunteer' | 'event' | 'contact';

/**
 * Get recent activities
 * GET /api/activities/recent
 */
export const getRecentActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const limit = parseInt(req.query.limit as string) || PAGINATION.ACTIVITY_DEFAULT_LIMIT;

    const activities = await activityService.getRecentActivities(limit);

    sendSuccess(res, {
      activities,
      total: activities.length,
    });
  } catch (error) {
    logger.error('Error fetching activities', { error });
    next(error);
  }
};

/**
 * Get activities for a specific entity
 * GET /api/activities/:entityType/:entityId
 */
export const getEntityActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const entityType = req.params.entityType as EntityType;
    const { entityId } = req.params;

    const activities = await activityService.getActivitiesForEntity(
      entityType,
      entityId
    );

    sendSuccess(res, {
      activities,
      total: activities.length,
    });
  } catch (error) {
    const { entityType, entityId } = req.params;
    logger.error('Error fetching entity activities', { error, entityType, entityId });
    next(error);
  }
};
