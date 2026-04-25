import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { UpdateDonorProfileDTO } from '@app-types/contact';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { DonorProfileService } from '../services/donorProfileService';
import { sendData, sendFailure } from '../mappers/responseMode';

export const createContactDonorProfileController = (
  directoryUseCase: ContactDirectoryUseCase,
  donorProfileService: DonorProfileService
) => {
  const resolveScopedContact = async (req: AuthRequest) => {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    return directoryUseCase.getById(req.params.id, scope, req.user?.role);
  };

  const getDonorProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const contact = await resolveScopedContact(req);
      if (!contact) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, await donorProfileService.getProfile(contact.contact_id, contact.account_id));
    } catch (error) {
      next(error);
    }
  };

  const updateDonorProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const contact = await resolveScopedContact(req);
      if (!contact) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      const profile = await donorProfileService.updateProfile({
        contactId: contact.contact_id,
        accountId: contact.account_id,
        userId,
        payload: (req.validatedBody ?? req.body) as UpdateDonorProfileDTO,
      });
      sendData(res, profile);
    } catch (error) {
      next(error);
    }
  };

  return {
    getDonorProfile,
    updateDonorProfile,
  };
};
