import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { badRequest, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import { logger } from '@config/logger';
import {
  getOrganizationAccounts,
  getUserAccess,
  updateUserAccess,
} from '../usecases/userAccessUseCase';
import type {
  AdminUserAccessBodyInput,
  AdminUserAccessParamsInput,
} from '@validations/admin';

const mapUserAccessError = (res: Response, error: unknown): boolean => {
  const message = error instanceof Error ? error.message : null;
  if (!message) {
    return false;
  }

  if (message.includes('not found')) {
    notFoundMessage(res, message);
    return true;
  }

  if (
    message.includes('Unknown groups') ||
    message.includes('Unknown organization accounts') ||
    message.includes('Policy groups are unavailable')
  ) {
    badRequest(res, message);
    return true;
  }

  return false;
};

export const getUserAccessHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const params = (req.validatedParams ?? req.params) as AdminUserAccessParamsInput;
    const access = await getUserAccess(params.id);
    return sendSuccess(res, access);
  } catch (error) {
    if (mapUserAccessError(res, error)) {
      return;
    }

    logger.error('Failed to fetch user access', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};

export const updateUserAccessHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const params = (req.validatedParams ?? req.params) as AdminUserAccessParamsInput;
    const body = req.body as AdminUserAccessBodyInput;
    const access = await updateUserAccess(
      params.id,
      {
        groups: body.groups ?? [],
        organizationAccess: body.organizationAccess ?? [],
      },
      req.user?.id
    );
    return sendSuccess(res, access);
  } catch (error) {
    if (mapUserAccessError(res, error)) {
      return;
    }

    logger.error('Failed to update user access', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};

export const listOrganizationAccountsHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationAccounts = await getOrganizationAccounts();
    return sendSuccess(res, { organizationAccounts });
  } catch (error) {
    logger.error('Failed to fetch organization accounts', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};
