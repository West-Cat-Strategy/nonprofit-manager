import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { sendFailure } from '../mappers/responseMode';

export const ensureContactAccess = async (
  req: AuthRequest,
  res: Response,
  directoryUseCase: ContactDirectoryUseCase,
  contactId: string
): Promise<boolean> => {
  const scope = req.dataScope?.filter as DataScopeFilter | undefined;
  const contact = await directoryUseCase.getById(contactId, scope, req.user?.role);
  if (!contact) {
    sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
    return false;
  }

  return true;
};
