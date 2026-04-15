import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { badRequest, conflict, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import { logger } from '@config/logger';
import { isPolicyGroupError } from '../errors/policyGroupErrors';
import {
  createPolicyGroup,
  deletePolicyGroup,
  listPolicyGroups,
  updatePolicyGroup,
} from '../usecases/policyGroupUseCase';
import type {
  AdminPolicyGroupCreateInput,
  AdminPolicyGroupParamsInput,
  AdminPolicyGroupUpdateInput,
} from '@validations/admin';

const mapPolicyGroupError = (res: Response, error: unknown): boolean => {
  if (!isPolicyGroupError(error)) {
    return false;
  }

  switch (error.code) {
    case 'NOT_FOUND':
      notFoundMessage(res, error.message);
      return true;
    case 'CONFLICT':
      conflict(res, error.message);
      return true;
    case 'RESERVED':
    case 'UNKNOWN_ROLE':
    case 'INVALID_INPUT':
      badRequest(res, error.message);
      return true;
    default:
      return false;
  }
};

export const listPolicyGroupsHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const groups = await listPolicyGroups();
    return sendSuccess(res, { groups });
  } catch (error) {
    logger.error('Failed to fetch policy groups', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};

export const createPolicyGroupHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const body = req.body as AdminPolicyGroupCreateInput;
    const group = await createPolicyGroup(body, req.user?.id);
    return sendSuccess(res, { group }, 201);
  } catch (error) {
    if (mapPolicyGroupError(res, error)) {
      return;
    }

    logger.error('Failed to create policy group', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};

export const updatePolicyGroupHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const params = (req.validatedParams ?? req.params) as AdminPolicyGroupParamsInput;
    const body = req.body as AdminPolicyGroupUpdateInput;
    const group = await updatePolicyGroup(params.id, body, req.user?.id);
    return sendSuccess(res, { group });
  } catch (error) {
    if (mapPolicyGroupError(res, error)) {
      return;
    }

    logger.error('Failed to update policy group', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};

export const deletePolicyGroupHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const params = (req.validatedParams ?? req.params) as AdminPolicyGroupParamsInput;
    await deletePolicyGroup(params.id);
    return sendSuccess(res, { message: 'Group deleted successfully' });
  } catch (error) {
    if (mapPolicyGroupError(res, error)) {
      return;
    }

    logger.error('Failed to delete policy group', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};
