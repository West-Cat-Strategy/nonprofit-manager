import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { PASSWORD } from '@config/constants';
import { conflict, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  findExistingUserByEmailExcludingId,
  getPasswordHashByUserId,
  getProfileById,
  requireAuthenticatedUser,
  updateProfileById,
  updateUserPasswordHash,
} from '../lib/authQueries';
import { mapProfile } from '../lib/authResponseMappers';

export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authUser = requireAuthenticatedUser(req, res);
    if (!authUser) return;
    const userId = authUser.id;

    const user = await getProfileById(userId);
    if (!user) {
      return notFoundMessage(res, 'User not found');
    }

    return sendSuccess(res, mapProfile(user));
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authUser = requireAuthenticatedUser(req, res);
    if (!authUser) return;
    const userId = authUser.id;

    const {
      firstName,
      lastName,
      email,
      displayName,
      alternativeName,
      pronouns,
      title,
      cellPhone,
      contactNumber,
      profilePicture,
      emailSharedWithClients,
      emailSharedWithUsers,
      alternativeEmails,
      notifications,
    } = req.body;

    if (email) {
      const existingUserId = await findExistingUserByEmailExcludingId(email, userId);
      if (existingUserId) {
        return conflict(res, 'Email is already in use by another account');
      }
    }

    const user = await updateProfileById(userId, {
      firstName,
      lastName,
      email,
      displayName,
      alternativeName,
      pronouns,
      title,
      cellPhone,
      contactNumber,
      profilePicture,
      emailSharedWithClients,
      emailSharedWithUsers,
      alternativeEmails,
      notifications,
    });
    if (!user) {
      return notFoundMessage(res, 'User not found');
    }

    logger.info(`User profile updated: ${user.email}`);

    return sendSuccess(res, mapProfile(user));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authUser = requireAuthenticatedUser(req, res);
    if (!authUser) return;
    const userId = authUser.id;

    const { currentPassword, newPassword } = req.body;

    const user = await getPasswordHashByUserId(userId);
    if (!user) {
      return notFoundMessage(res, 'User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return unauthorized(res, 'Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, PASSWORD.BCRYPT_SALT_ROUNDS);
    await updateUserPasswordHash(userId, hashedPassword);

    logger.info(`Password changed for user: ${user.email}`);

    return sendSuccess(res, { message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
