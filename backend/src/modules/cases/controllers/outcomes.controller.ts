import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';
import { CaseOutcomesUseCase } from '../usecases/caseOutcomes.usecase';
import { ResponseMode, sendData } from '../mappers/responseMode';

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

  return {
    getCaseOutcomeDefinitions,
    getInteractionOutcomes,
    putInteractionOutcomes,
  };
};
