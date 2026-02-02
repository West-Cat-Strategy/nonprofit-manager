/**
 * Activity Controller
 * Handles activity feed requests
 */

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
import activityService from '../services/activityService';
import { logger } from '../config/logger';
import { PAGINATION, HTTP_STATUS } from '../config/constants';

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

    // Validate limit
    if (limit < PAGINATION.MIN_LIMIT || limit > PAGINATION.ACTIVITY_MAX_LIMIT) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: `Limit must be between ${PAGINATION.MIN_LIMIT} and ${PAGINATION.ACTIVITY_MAX_LIMIT}`,
      });
    }

    const activities = await activityService.getRecentActivities(limit);

    res.json({
      activities,
      total: activities.length,
    });
  } catch (error: any) {
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
    const { entityType, entityId } = req.params;

    // Validate entity type
    const validTypes = ['case', 'donation', 'volunteer', 'event', 'contact'];
    if (!validTypes.includes(entityType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid entity type',
      });
    }

    const activities = await activityService.getActivitiesForEntity(
      entityType as any,
      entityId
    );

    res.json({
      activities,
      total: activities.length,
    });
  } catch (error: any) {
    const { entityType, entityId } = req.params;
    logger.error('Error fetching entity activities', { error, entityType, entityId });
    next(error);
  }
};
