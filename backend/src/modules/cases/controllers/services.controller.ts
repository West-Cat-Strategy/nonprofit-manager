import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateCaseServiceDTO, UpdateCaseServiceDTO } from '@app-types/case';
import { CaseServicesUseCase } from '../usecases/caseServices.usecase';
import { ResponseMode, sendData } from '../mappers/responseMode';

export const createCaseServicesController = (
  useCase: CaseServicesUseCase,
  mode: ResponseMode
) => {
  const getCaseServices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const services = await useCase.list(req.params.id);
      sendData(res, mode, mode === 'v2' ? services : { services });
    } catch (error) {
      next(error);
    }
  };

  const createCaseService = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = await useCase.create(req.params.id, req.body as CreateCaseServiceDTO, req.user?.id);
      sendData(res, mode, service, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateCaseService = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = await useCase.update(req.params.serviceId, req.body as UpdateCaseServiceDTO, req.user?.id);
      sendData(res, mode, service);
    } catch (error) {
      next(error);
    }
  };

  const deleteCaseService = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await useCase.delete(req.params.serviceId);
      if (mode === 'v2') {
        res.status(204).send();
        return;
      }
      res.json({ success: true, message: 'Service deleted' });
    } catch (error) {
      next(error);
    }
  };

  return {
    getCaseServices,
    createCaseService,
    updateCaseService,
    deleteCaseService,
  };
};
