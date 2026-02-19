import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import {
  requirePermissionOrError,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { serverError, notFound, conflict } from '@utils/responseHelpers';
import * as outcomeImpactService from '@services/outcomeImpactService';
import * as outcomeDefinitionService from '@services/outcomeDefinitionService';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';

const guardTagPermission = (req: AuthRequest, res: Response): boolean => {
  const guardResult = requirePermissionOrError(req, Permission.OUTCOMES_TAG_INTERACTION);
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
  if (error?.statusCode === 404 || error?.code === 'not_found') {
    notFound(res, 'Interaction outcome impact');
    return;
  }
  if (error?.statusCode === 409 || error?.code === 'conflict') {
    conflict(res, error.message || 'Conflict');
    return;
  }
  serverError(res, fallback);
};

export const getCaseOutcomeDefinitions = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardTagPermission(req, res)) {
    return;
  }

  try {
    const query = ((req as any).validatedQuery ?? req.query) as { includeInactive?: boolean };
    const definitions = await outcomeDefinitionService.listOutcomeDefinitions(
      query.includeInactive === true
    );

    res.json({ success: true, data: definitions });
  } catch (error) {
    handleControllerError(res, error, 'Failed to load case outcome definitions');
  }
};

export const getInteractionOutcomes = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardTagPermission(req, res)) {
    return;
  }

  try {
    const params = ((req as any).validatedParams ?? req.params) as {
      caseId: string;
      interactionId: string;
    };

    const impacts = await outcomeImpactService.getInteractionOutcomes(
      params.caseId,
      params.interactionId
    );

    res.json({ success: true, data: impacts });
  } catch (error) {
    handleControllerError(res, error, 'Failed to fetch interaction outcomes');
  }
};

export const putInteractionOutcomes = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!guardTagPermission(req, res)) {
    return;
  }

  try {
    const params = ((req as any).validatedParams ?? req.params) as {
      caseId: string;
      interactionId: string;
    };
    const data = req.body as UpdateInteractionOutcomeImpactsDTO;

    const impacts = await outcomeImpactService.saveInteractionOutcomes(
      params.caseId,
      params.interactionId,
      data,
      req.user?.id
    );

    res.json({ success: true, data: impacts });
  } catch (error) {
    handleControllerError(res, error, 'Failed to save interaction outcomes');
  }
};
