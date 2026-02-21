import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateContactEmailDTO, UpdateContactEmailDTO } from '@app-types/contact';
import { ContactEmailsUseCase } from '../usecases/contactEmails.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

const mapEmailError = (error: unknown): { status: number; code: string; message: string } | null => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('already exists')) {
    return {
      status: 409,
      code: 'CONFLICT',
      message,
    };
  }
  return null;
};

export const createContactEmailsController = (
  useCase: ContactEmailsUseCase,
  mode: ResponseMode
) => {
  const getContactEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const emails = await useCase.list(req.params.contactId);
      sendData(res, mode, emails);
    } catch (error) {
      next(error);
    }
  };

  const getContactEmailById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const email = await useCase.getById(req.params.emailId);
      if (!email) {
        sendFailure(res, mode, 'NOT_FOUND', 'Email address not found', 404);
        return;
      }

      sendData(res, mode, email);
    } catch (error) {
      next(error);
    }
  };

  const createContactEmail = async (
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

      const email = await useCase.create(req.params.contactId, req.body as CreateContactEmailDTO, userId);
      sendData(res, mode, email, 201);
    } catch (error) {
      const mapped = mapEmailError(error);
      if (mapped) {
        sendFailure(res, mode, mapped.code, mapped.message, mapped.status);
        return;
      }
      next(error);
    }
  };

  const updateContactEmail = async (
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

      const email = await useCase.update(req.params.emailId, req.body as UpdateContactEmailDTO, userId);
      if (!email) {
        sendFailure(res, mode, 'NOT_FOUND', 'Email address not found', 404);
        return;
      }

      sendData(res, mode, email);
    } catch (error) {
      const mapped = mapEmailError(error);
      if (mapped) {
        sendFailure(res, mode, mapped.code, mapped.message, mapped.status);
        return;
      }
      next(error);
    }
  };

  const deleteContactEmail = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const deleted = await useCase.delete(req.params.emailId);
      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Email address not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getContactEmails,
    getContactEmailById,
    createContactEmail,
    updateContactEmail,
    deleteContactEmail,
  };
};
