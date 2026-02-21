import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateContactPhoneDTO, UpdateContactPhoneDTO } from '@app-types/contact';
import { ContactPhonesUseCase } from '../usecases/contactPhones.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

const mapPhoneError = (error: unknown): { status: number; code: string; message: string } | null => {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'This phone number already exists for this contact') {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message,
    };
  }
  return null;
};

export const createContactPhonesController = (
  useCase: ContactPhonesUseCase,
  mode: ResponseMode
) => {
  const getContactPhones = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const phones = await useCase.list(req.params.contactId);
      sendData(res, mode, phones);
    } catch (error) {
      next(error);
    }
  };

  const getContactPhoneById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const phone = await useCase.getById(req.params.phoneId);
      if (!phone) {
        sendFailure(res, mode, 'NOT_FOUND', 'Phone number not found', 404);
        return;
      }

      sendData(res, mode, phone);
    } catch (error) {
      next(error);
    }
  };

  const createContactPhone = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const phone = await useCase.create(req.params.contactId, req.body as CreateContactPhoneDTO, userId);
      sendData(res, mode, phone, 201);
    } catch (error) {
      const mapped = mapPhoneError(error);
      if (mapped) {
        sendFailure(res, mode, mapped.code, mapped.message, mapped.status);
        return;
      }
      next(error);
    }
  };

  const updateContactPhone = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const phone = await useCase.update(req.params.phoneId, req.body as UpdateContactPhoneDTO, userId);
      if (!phone) {
        sendFailure(res, mode, 'NOT_FOUND', 'Phone number not found', 404);
        return;
      }

      sendData(res, mode, phone);
    } catch (error) {
      const mapped = mapPhoneError(error);
      if (mapped) {
        sendFailure(res, mode, mapped.code, mapped.message, mapped.status);
        return;
      }
      next(error);
    }
  };

  const deleteContactPhone = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const deleted = await useCase.delete(req.params.phoneId);
      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Phone number not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getContactPhones,
    getContactPhoneById,
    createContactPhone,
    updateContactPhone,
    deleteContactPhone,
  };
};
