import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateCaseServiceDTO, UpdateCaseServiceDTO } from '@app-types/case';
import { CaseServicesUseCase } from '../usecases/caseServices.usecase';
import { sendData } from '../mappers/responseMode';

export const createCaseServicesController = (useCase: CaseServicesUseCase) => {
  const getOrganizationId = (req: AuthRequest): string | undefined =>
    req.organizationId || req.accountId || req.tenantId;

  const getCaseServices = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const services = await useCase.list(req.params.id, getOrganizationId(req));
      sendData(res, services);
    } catch (error) {
      next(error);
    }
  };

  const createCaseService = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const service = await useCase.create(
        req.params.id,
        req.body as CreateCaseServiceDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, service, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateCaseService = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const service = await useCase.update(
        req.params.serviceId,
        req.body as UpdateCaseServiceDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, service);
    } catch (error) {
      next(error);
    }
  };

  const deleteCaseService = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await useCase.delete(req.params.serviceId, getOrganizationId(req));
      res.status(204).send();
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
