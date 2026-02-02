/**
 * Activity Controller
 * Handles activity feed requests
 */

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
import activityService from '../services/activityService';
import { logger } from '../config/logger';

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
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate limit
    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        error: 'Limit must be between 1 and 50',
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
      return res.status(400).json({
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
