import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { BulkStatusUpdateDTO, CreateCaseDTO, ReassignCaseDTO, UpdateCaseDTO, UpdateCaseStatusDTO } from '@app-types/case';
import { CaseLifecycleUseCase } from '../usecases/caseLifecycle.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createCaseLifecycleController = (
  useCase: CaseLifecycleUseCase,
  mode: ResponseMode
) => {
  const createCase = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await useCase.create(req.body as CreateCaseDTO, req.user?.id);
      sendData(res, mode, created, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateCase = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await useCase.update(req.params.id, req.body as UpdateCaseDTO, req.user?.id);
      sendData(res, mode, updated);
    } catch (error) {
      next(error);
    }
  };

  const updateCaseStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await useCase.updateStatus(req.params.id, req.body as UpdateCaseStatusDTO, req.user?.id);
      sendData(res, mode, updated);
    } catch (error) {
      next(error);
    }
  };

  const reassignCase = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await useCase.reassign(req.params.id, req.body as ReassignCaseDTO, req.user?.id);
      sendData(res, mode, updated);
    } catch (error) {
      next(error);
    }
  };

  const bulkUpdateCaseStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as BulkStatusUpdateDTO;
      if (!data.case_ids?.length || !data.new_status_id) {
        sendFailure(res, mode, 'VALIDATION_ERROR', 'case_ids and new_status_id are required', 400);
        return;
      }

      const result = await useCase.bulkUpdate(data, req.user?.id);
      sendData(res, mode, mode === 'v2' ? result : { success: true, ...(result as object) });
    } catch (error) {
      next(error);
    }
  };

  const deleteCase = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await useCase.delete(req.params.id);
      if (mode === 'v2') {
        res.status(204).send();
        return;
      }
      res.json({ success: true, message: 'Case deleted' });
    } catch (error) {
      next(error);
    }
  };

  return {
    createCase,
    updateCase,
    updateCaseStatus,
    reassignCase,
    bulkUpdateCaseStatus,
    deleteCase,
  };
};
