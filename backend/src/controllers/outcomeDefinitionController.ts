import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import {
  requirePermissionOrError,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { serverError, notFound, conflict } from '@utils/responseHelpers';
import * as outcomeDefinitionService from '@services/outcomeDefinitionService';
import type {
  CreateOutcomeDefinitionDTO,
  ReorderOutcomeDefinitionsDTO,
  UpdateOutcomeDefinitionDTO,
} from '@app-types/outcomes';

const guardManagePermission = (req: AuthRequest, res: Response): boolean => {
  const guardResult = requirePermissionOrError(req, Permission.OUTCOMES_MANAGE);
  if (!guardResult.success) {
    if (guardResult.error?.toLowerCase().startsWith('unauthorized')) {
      sendUnauthorized(res, guardResult.error);
    } else {
      sendForbidden(res, guardResult.error || 'Forbidden');
    }
    return false;
  }
  return true;
};

const handleControllerError = (res: Response, error: any, fallback: string): void => {
  if (error?.statusCode === 404) {
    notFound(res, 'Outcome definition');
    return;
  }
  if (error?.statusCode === 409 || error?.code === 'conflict') {
    conflict(res, error.message || 'Conflict');
    return;
  }
  serverError(res, fallback);
};

export const listOutcomeDefinitions = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardManagePermission(req, res)) {
    return;
  }

  try {
    const query = ((req as any).validatedQuery ?? req.query) as { includeInactive?: boolean };
    const definitions = await outcomeDefinitionService.listOutcomeDefinitions(
      query.includeInactive === true
    );

    res.json({ success: true, data: definitions });
  } catch (error) {
    handleControllerError(res, error, 'Failed to list outcome definitions');
  }
};

export const createOutcomeDefinition = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardManagePermission(req, res)) {
    return;
  }

  try {
    const data = req.body as CreateOutcomeDefinitionDTO;
    const definition = await outcomeDefinitionService.createOutcomeDefinition(data);

    res.status(201).json({ success: true, data: definition });
  } catch (error) {
    handleControllerError(res, error, 'Failed to create outcome definition');
  }
};

export const updateOutcomeDefinition = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardManagePermission(req, res)) {
    return;
  }

  try {
    const params = ((req as any).validatedParams ?? req.params) as { id: string };
    const data = req.body as UpdateOutcomeDefinitionDTO;

    const definition = await outcomeDefinitionService.updateOutcomeDefinition(params.id, data);
    if (!definition) {
      notFound(res, 'Outcome definition');
      return;
    }

    res.json({ success: true, data: definition });
  } catch (error) {
    handleControllerError(res, error, 'Failed to update outcome definition');
  }
};

export const enableOutcomeDefinition = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardManagePermission(req, res)) {
    return;
  }

  try {
    const params = ((req as any).validatedParams ?? req.params) as { id: string };
    const definition = await outcomeDefinitionService.setOutcomeDefinitionActive(params.id, true);

    if (!definition) {
      notFound(res, 'Outcome definition');
      return;
    }

    res.json({ success: true, data: definition });
  } catch (error) {
    handleControllerError(res, error, 'Failed to enable outcome definition');
  }
};

export const disableOutcomeDefinition = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardManagePermission(req, res)) {
    return;
  }

  try {
    const params = ((req as any).validatedParams ?? req.params) as { id: string };
    const definition = await outcomeDefinitionService.setOutcomeDefinitionActive(params.id, false);

    if (!definition) {
      notFound(res, 'Outcome definition');
      return;
    }

    res.json({ success: true, data: definition });
  } catch (error) {
    handleControllerError(res, error, 'Failed to disable outcome definition');
  }
};

export const reorderOutcomeDefinitions = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardManagePermission(req, res)) {
    return;
  }

  try {
    const data = req.body as ReorderOutcomeDefinitionsDTO;
    const definitions = await outcomeDefinitionService.reorderOutcomeDefinitions(data);

    res.json({ success: true, data: definitions });
  } catch (error) {
    handleControllerError(res, error, 'Failed to reorder outcome definitions');
  }
};
