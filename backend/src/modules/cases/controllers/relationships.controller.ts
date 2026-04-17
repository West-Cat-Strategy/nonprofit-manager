import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateCaseRelationshipDTO } from '@app-types/case';
import { CaseRelationshipsUseCase } from '../usecases/caseRelationships.usecase';
import { sendData, sendFailure } from '../mappers/responseMode';

export const createCaseRelationshipsController = (useCase: CaseRelationshipsUseCase) => {
  const getCaseRelationships = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const relationships = await useCase.list(req.params.id);
      sendData(res, relationships);
    } catch (error) {
      next(error);
    }
  };

  const createCaseRelationship = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const relationship = await useCase.create(req.params.id, req.body as CreateCaseRelationshipDTO, req.user?.id);
      sendData(res, relationship, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('cannot be related to itself')) {
        sendFailure(res, 'VALIDATION_ERROR', error.message, 400);
        return;
      }
      next(error);
    }
  };

  const deleteCaseRelationship = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await useCase.delete(req.params.relationshipId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getCaseRelationships,
    createCaseRelationship,
    deleteCaseRelationship,
  };
};
