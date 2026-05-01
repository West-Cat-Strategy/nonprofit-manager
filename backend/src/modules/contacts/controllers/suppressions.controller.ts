import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import type { DataScopeFilter } from '@app-types/dataScope';
import type {
  CreateContactSuppressionEvidenceDTO,
  UpdateContactSuppressionEvidenceDTO,
} from '@app-types/contact';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { ContactSuppressionService } from '../services/contactSuppressionService';
import { sendData, sendFailure } from '../mappers/responseMode';

export const createContactSuppressionsController = (
  directoryUseCase: ContactDirectoryUseCase,
  suppressionService: ContactSuppressionService
) => {
  const resolveScopedContact = async (req: AuthRequest) => {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    return directoryUseCase.getById(req.params.contactId ?? req.params.id, scope, req.user?.role);
  };

  const listSuppressions = async (
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

      const result = await suppressionService.list(contact.contact_id);
      if (!result) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, result);
    } catch (error) {
      next(error);
    }
  };

  const createSuppression = async (
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

      const suppression = await suppressionService.create(
        contact.contact_id,
        (req.validatedBody ?? req.body) as CreateContactSuppressionEvidenceDTO,
        req.user?.id
      );
      if (!suppression) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, suppression, 201);
    } catch (error) {
      next(error);
    }
  };

  const upsertStaffSuppression = async (
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

      const suppression = await suppressionService.upsertStaffSuppression(
        contact.contact_id,
        req.validatedBody ?? req.body,
        req.user?.id
      );
      if (!suppression) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, suppression, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateSuppression = async (
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

      const suppression = await suppressionService.update(
        contact.contact_id,
        req.params.suppressionId,
        (req.validatedBody ?? req.body) as UpdateContactSuppressionEvidenceDTO,
        req.user?.id
      );
      if (!suppression) {
        sendFailure(res, 'NOT_FOUND', 'Suppression evidence not found', 404);
        return;
      }

      sendData(res, suppression);
    } catch (error) {
      next(error);
    }
  };

  return {
    listSuppressions,
    listActiveSuppressions: listSuppressions,
    createSuppression,
    upsertStaffSuppression,
    updateSuppression,
  };
};
