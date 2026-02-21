import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateCaseMilestoneDTO, UpdateCaseMilestoneDTO } from '@app-types/case';
import { CaseMilestonesUseCase } from '../usecases/caseMilestones.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createCaseMilestonesController = (
  useCase: CaseMilestonesUseCase,
  mode: ResponseMode
) => {
  const getCaseMilestones = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const milestones = await useCase.list(req.params.id);
      sendData(res, mode, mode === 'v2' ? milestones : { milestones });
    } catch (error) {
      next(error);
    }
  };

  const createCaseMilestone = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as CreateCaseMilestoneDTO;
      if (!data.milestone_name?.trim()) {
        sendFailure(res, mode, 'VALIDATION_ERROR', 'Milestone name is required', 400);
        return;
      }

      const milestone = await useCase.create(req.params.id, data, req.user?.id);
      sendData(res, mode, milestone, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateCaseMilestone = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const milestone = await useCase.update(req.params.milestoneId, req.body as UpdateCaseMilestoneDTO);
      sendData(res, mode, milestone);
    } catch (error) {
      next(error);
    }
  };

  const deleteCaseMilestone = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await useCase.delete(req.params.milestoneId);
      if (mode === 'v2') {
        res.status(204).send();
        return;
      }
      res.json({ success: true, message: 'Milestone deleted' });
    } catch (error) {
      next(error);
    }
  };

  return {
    getCaseMilestones,
    createCaseMilestone,
    updateCaseMilestone,
    deleteCaseMilestone,
  };
};
