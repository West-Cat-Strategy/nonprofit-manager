import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import type {
  CreateCaseOutcomeDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  UpdateCaseOutcomeDTO,
} from '@app-types/case';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';
import { CaseOutcomesUseCase } from '../usecases/caseOutcomes.usecase';
import { sendData, sendFailure } from '../mappers/responseMode';

export const createCaseOutcomesController = (useCase: CaseOutcomesUseCase) => {
  const guardTagPermission = (req: AuthRequest, res: Response): boolean => {
    const guardResult = requirePermissionSafe(req, Permission.OUTCOMES_TAG_INTERACTION);
    if (!guardResult.ok) {
      if (guardResult.error.code === 'unauthorized') {
        sendUnauthorized(res, guardResult.error.message);
      } else {
        sendForbidden(res, guardResult.error.message || 'Forbidden');
      }
      return false;
    }
    return true;
  };

  const getCaseOutcomeDefinitions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const includeInactive =
        req.query.includeInactive === 'true' || req.validatedQuery?.includeInactive === true;
      const definitions = await useCase.listDefinitions(includeInactive);
      sendData(res, definitions);
    } catch (error) {
      next(error);
    }
  };

  const getInteractionOutcomes = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const params = (req.validatedParams ?? req.params) as {
        caseId: string;
        interactionId: string;
      };
      const impacts = await useCase.getInteractionOutcomes(params.caseId, params.interactionId);
      sendData(res, impacts);
    } catch (error) {
      next(error);
    }
  };

  const putInteractionOutcomes = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const params = (req.validatedParams ?? req.params) as {
        caseId: string;
        interactionId: string;
      };
      const impacts = await useCase.saveInteractionOutcomes(
        params.caseId,
        params.interactionId,
        req.body as UpdateInteractionOutcomeImpactsDTO,
        req.user?.id
      );
      sendData(res, impacts);
    } catch (error) {
      next(error);
    }
  };

  const getCaseOutcomes = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const outcomes = await useCase.listCaseOutcomes(req.params.id);
      sendData(res, outcomes);
    } catch (error) {
      next(error);
    }
  };

  const createCaseOutcome = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const outcome = await useCase.createCaseOutcome(
        req.params.id,
        req.body as CreateCaseOutcomeDTO,
        req.user?.id
      );
      sendData(res, outcome, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateCaseOutcome = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const outcome = await useCase.updateCaseOutcome(
        req.params.outcomeId,
        req.body as UpdateCaseOutcomeDTO,
        req.user?.id
      );
      sendData(res, outcome);
    } catch (error) {
      next(error);
    }
  };

  const deleteCaseOutcome = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const deleted = await useCase.deleteCaseOutcome(req.params.outcomeId);
      if (!deleted) {
        sendFailure(res, 'NOT_FOUND', 'Case outcome not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const getCaseTopicDefinitions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const topics = await useCase.listTopicDefinitions(req.params.id);
      sendData(res, topics);
    } catch (error) {
      next(error);
    }
  };

  const createCaseTopicDefinition = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const topic = await useCase.createTopicDefinition(
        req.params.id,
        req.body as CreateCaseTopicDefinitionDTO,
        req.user?.id
      );
      sendData(res, topic, 201);
    } catch (error) {
      next(error);
    }
  };

  const getCaseTopicEvents = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const topicEvents = await useCase.listTopicEvents(req.params.id);
      sendData(res, topicEvents);
    } catch (error) {
      next(error);
    }
  };

  const createCaseTopicEvent = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const topicEvent = await useCase.addTopicEvent(
        req.params.id,
        req.body as CreateCaseTopicEventDTO,
        req.user?.id
      );
      sendData(res, topicEvent, 201);
    } catch (error) {
      next(error);
    }
  };

  const deleteCaseTopicEvent = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!guardTagPermission(req, res)) {
        return;
      }

      const deleted = await useCase.deleteTopicEvent(req.params.topicEventId);
      if (!deleted) {
        sendFailure(res, 'NOT_FOUND', 'Case topic event not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getCaseOutcomeDefinitions,
    getInteractionOutcomes,
    putInteractionOutcomes,
    getCaseOutcomes,
    createCaseOutcome,
    updateCaseOutcome,
    deleteCaseOutcome,
    getCaseTopicDefinitions,
    createCaseTopicDefinition,
    getCaseTopicEvents,
    createCaseTopicEvent,
    deleteCaseTopicEvent,
  };
};
