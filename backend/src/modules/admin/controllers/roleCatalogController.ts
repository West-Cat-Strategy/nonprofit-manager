import type { Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import { badRequest, conflict, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import { isRoleCatalogError } from '../errors/roleCatalogErrors';
import {
  createRole,
  deleteRole,
  getPermissionCatalog,
  getRoleCatalog,
  updateRole,
} from '../usecases/roleCatalogUseCase';
import type {
  AdminRoleCreateInput,
  AdminRoleUpdateInput,
  AdminRoleParamsInput,
} from '@validations/admin';

const mapRoleError = (res: Response, error: unknown): boolean => {
  if (!isRoleCatalogError(error)) {
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
    case 'IN_USE':
    case 'UNKNOWN_PERMISSION':
    case 'INVALID_INPUT':
      badRequest(res, error.message);
      return true;
    default:
      return false;
  }
};

export const listRoles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const roles = await getRoleCatalog();
    return sendSuccess(res, { roles });
  } catch (error) {
    logger.error('Failed to fetch role catalog', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};

export const listPermissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const permissions = await getPermissionCatalog();
    return sendSuccess(res, { permissions });
  } catch (error) {
    logger.error('Failed to fetch permission catalog', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};

export const createRoleHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const body = req.body as AdminRoleCreateInput;
    const role = await createRole(body);
    return sendSuccess(res, { role }, 201);
  } catch (error) {
    const mapped = mapRoleError(res, error);
    if (mapped) {
      return;
    }

    logger.error('Failed to create role', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};

export const updateRoleHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const params = (req.validatedParams ?? req.params) as AdminRoleParamsInput;
    const body = req.body as AdminRoleUpdateInput;
    const role = await updateRole(params.id, body);
    return sendSuccess(res, { role });
  } catch (error) {
    const mapped = mapRoleError(res, error);
    if (mapped) {
      return;
    }

    logger.error('Failed to update role', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};

export const deleteRoleHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const params = (req.validatedParams ?? req.params) as AdminRoleParamsInput;
    await deleteRole(params.id);
    return sendSuccess(res, { message: 'Role deleted successfully' });
  } catch (error) {
    const mapped = mapRoleError(res, error);
    if (mapped) {
      return;
    }

    logger.error('Failed to delete role', {
      error,
      correlationId: req.correlationId,
    });
    next(error);
  }
};
