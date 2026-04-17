/**
 * Activity Controller
 * Handles activity feed requests
 */

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { activityService } from '../services/activityService';
import { logger } from '@config/logger';
import { PAGINATION } from '@config/constants';
import { sendSuccess } from '@modules/shared/http/envelope';

type EntityType = 'case' | 'donation' | 'volunteer' | 'event' | 'contact';

const getOrganizationId = (req: AuthRequest): string => {
  const organizationId =
    req.organizationId ||
    req.accountId ||
    req.tenantId ||
    req.user?.organizationId ||
    req.user?.organization_id;

  if (!organizationId) {
    throw new Error('Active organization context is required');
  }

  return organizationId;
};

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
    const organizationId = getOrganizationId(req);
    const query = (req.validatedQuery ?? req.query) as { limit?: number | string };
    const parsedLimit =
      typeof query.limit === 'number'
        ? query.limit
        : parseInt(String(query.limit ?? ''), 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : PAGINATION.ACTIVITY_DEFAULT_LIMIT;

    const activities = await activityService.getRecentActivities(limit, organizationId);

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
    const organizationId = getOrganizationId(req);
    const entityType = req.params.entityType as EntityType;
    const { entityId } = req.params;

    const activities = await activityService.getActivitiesForEntity(entityType, entityId, organizationId);

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
