import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { ContactCommunicationFilters } from '@app-types/contact';
import { ContactCommunicationsUseCase } from '../usecases/contactCommunications.usecase';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createContactCommunicationsController = (
  useCase: ContactCommunicationsUseCase,
  directoryUseCase: ContactDirectoryUseCase,
  mode: ResponseMode
) => {
  const getContactCommunications = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const contact = await directoryUseCase.getById(req.params.id, scope, req.user?.role);
      if (!contact) {
        sendFailure(res, mode, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      const query = (req.validatedQuery ?? req.query) as ContactCommunicationFilters;
      const result = await useCase.list(req.params.id, {
        channel: query.channel,
        source_type: query.source_type,
        delivery_status: query.delivery_status,
        limit: query.limit,
      });

      sendData(res, mode, result);
    } catch (error) {
      next(error);
    }
  };

  return {
    getContactCommunications,
  };
};
