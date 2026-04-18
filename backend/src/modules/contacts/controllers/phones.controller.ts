import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateContactPhoneDTO, UpdateContactPhoneDTO } from '@app-types/contact';
import { ContactPhonesUseCase } from '../usecases/contactPhones.usecase';
import { sendData, sendFailure } from '../mappers/responseMode';
import { CONTACT_PHONE_DUPLICATE_ERROR_CODE } from '../repositories/contactPhonesRepository';

const mapPhoneError = (error: unknown): { status: number; code: string; message: string } | null => {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code : undefined;
  if (code === CONTACT_PHONE_DUPLICATE_ERROR_CODE) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message,
    };
  }
  return null;
};

export const createContactPhonesController = (useCase: ContactPhonesUseCase) => {
  const getContactPhones = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const phones = await useCase.list(req.params.contactId);
      sendData(res, phones);
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
        sendFailure(res, 'NOT_FOUND', 'Phone number not found', 404);
        return;
      }

      sendData(res, phone);
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
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const phone = await useCase.create(req.params.contactId, req.body as CreateContactPhoneDTO, userId);
      sendData(res, phone, 201);
    } catch (error) {
      const mapped = mapPhoneError(error);
      if (mapped) {
        sendFailure(res, mapped.code, mapped.message, mapped.status);
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
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const phone = await useCase.update(req.params.phoneId, req.body as UpdateContactPhoneDTO, userId);
      if (!phone) {
        sendFailure(res, 'NOT_FOUND', 'Phone number not found', 404);
        return;
      }

      sendData(res, phone);
    } catch (error) {
      const mapped = mapPhoneError(error);
      if (mapped) {
        sendFailure(res, mapped.code, mapped.message, mapped.status);
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
        sendFailure(res, 'NOT_FOUND', 'Phone number not found', 404);
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
