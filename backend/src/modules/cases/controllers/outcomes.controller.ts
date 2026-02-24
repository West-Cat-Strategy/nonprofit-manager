import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type {
  CreateCaseOutcomeDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  UpdateCaseOutcomeDTO,
} from '@app-types/case';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';
import { CaseOutcomesUseCase } from '../usecases/caseOutcomes.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createCaseOutcomesController = (
  useCase: CaseOutcomesUseCase,
  mode: ResponseMode
) => {
  const getCaseOutcomeDefinitions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const includeInactive =
        req.query.includeInactive === 'true' || (req as any).validatedQuery?.includeInactive === true;
      const definitions = await useCase.listDefinitions(includeInactive);
      sendData(res, mode, definitions);
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
      const params = ((req as any).validatedParams ?? req.params) as {
        caseId: string;
        interactionId: string;
      };
      const impacts = await useCase.getInteractionOutcomes(params.caseId, params.interactionId);
      sendData(res, mode, impacts);
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
      const params = ((req as any).validatedParams ?? req.params) as {
        caseId: string;
        interactionId: string;
      };
      const impacts = await useCase.saveInteractionOutcomes(
        params.caseId,
        params.interactionId,
        req.body as UpdateInteractionOutcomeImpactsDTO,
        req.user?.id
      );
      sendData(res, mode, impacts);
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
      const outcomes = await useCase.listCaseOutcomes(req.params.id);
      sendData(res, mode, mode === 'v2' ? outcomes : { outcomes });
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
      const outcome = await useCase.createCaseOutcome(
        req.params.id,
        req.body as CreateCaseOutcomeDTO,
        req.user?.id
      );
      sendData(res, mode, outcome, 201);
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
      const outcome = await useCase.updateCaseOutcome(
        req.params.outcomeId,
        req.body as UpdateCaseOutcomeDTO,
        req.user?.id
      );
      sendData(res, mode, outcome);
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
      const deleted = await useCase.deleteCaseOutcome(req.params.outcomeId);
      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Case outcome not found', 404);
        return;
      }

      if (mode === 'v2') {
        res.status(204).send();
        return;
      }

      sendData(res, mode, { success: true });
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
      const topics = await useCase.listTopicDefinitions(req.params.id);
      sendData(res, mode, mode === 'v2' ? topics : { topics });
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
      const topic = await useCase.createTopicDefinition(
        req.params.id,
        req.body as CreateCaseTopicDefinitionDTO,
        req.user?.id
      );
      sendData(res, mode, topic, 201);
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
      const topicEvents = await useCase.listTopicEvents(req.params.id);
      sendData(res, mode, mode === 'v2' ? topicEvents : { topic_events: topicEvents });
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
      const topicEvent = await useCase.addTopicEvent(
        req.params.id,
        req.body as CreateCaseTopicEventDTO,
        req.user?.id
      );
      sendData(res, mode, topicEvent, 201);
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
      const deleted = await useCase.deleteTopicEvent(req.params.topicEventId);
      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Case topic event not found', 404);
        return;
      }

      if (mode === 'v2') {
        res.status(204).send();
        return;
      }

      sendData(res, mode, { success: true });
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
