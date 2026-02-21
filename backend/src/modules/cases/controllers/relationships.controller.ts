import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateCaseRelationshipDTO } from '@app-types/case';
import { CaseRelationshipsUseCase } from '../usecases/caseRelationships.usecase';
import { ResponseMode, sendData } from '../mappers/responseMode';

export const createCaseRelationshipsController = (
  useCase: CaseRelationshipsUseCase,
  mode: ResponseMode
) => {
  const getCaseRelationships = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const relationships = await useCase.list(req.params.id);
      sendData(res, mode, mode === 'v2' ? relationships : { relationships });
    } catch (error) {
      next(error);
    }
  };

  const createCaseRelationship = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const relationship = await useCase.create(req.params.id, req.body as CreateCaseRelationshipDTO, req.user?.id);
      sendData(res, mode, relationship, 201);
    } catch (error) {
      next(error);
    }
  };

  const deleteCaseRelationship = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await useCase.delete(req.params.relationshipId);
      if (mode === 'v2') {
        res.status(204).send();
        return;
      }
      res.json({ success: true, message: 'Relationship deleted' });
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
