import { Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  getUserPreferences,
  mergeUserPreferences,
  requireAuthenticatedUser,
  updateUserPreference,
} from '../lib/authQueries';

export const getPreferences = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authUser = requireAuthenticatedUser(req, res);
    if (!authUser) return;
    const userId = authUser.id;

    const preferences = await getUserPreferences(userId);
    if (preferences === null) {
      return notFoundMessage(res, 'User not found');
    }

    return sendSuccess(res, {
      preferences,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authUser = requireAuthenticatedUser(req, res);
    if (!authUser) return;
    const userId = authUser.id;
    const { preferences } = req.body as { preferences: Record<string, unknown> };

    const updatedPreferences = await mergeUserPreferences(userId, preferences);
    if (updatedPreferences === null) {
      return notFoundMessage(res, 'User not found');
    }

    logger.info(`User preferences updated: ${userId}`);

    return sendSuccess(res, {
      preferences: updatedPreferences,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferenceKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authUser = requireAuthenticatedUser(req, res);
    if (!authUser) return;
    const userId = authUser.id;
    const params = (req.validatedParams ?? req.params) as { key: string };
    const { key } = params;
    const { value } = req.body as { value: unknown };

    const updatedPreferences = await updateUserPreference(userId, key, value);
    if (updatedPreferences === null) {
      return notFoundMessage(res, 'User not found');
    }

    logger.info(`User preference '${key}' updated: ${userId}`);

    return sendSuccess(res, {
      preferences: updatedPreferences,
    });
  } catch (error) {
    next(error);
  }
};
