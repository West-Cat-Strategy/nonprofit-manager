import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateContactRelationshipDTO, UpdateContactRelationshipDTO } from '@app-types/contact';
import { ContactRelationshipsUseCase } from '../usecases/contactRelationships.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

const mapRelationshipError = (error: unknown): { status: number; code: string; message: string } | null => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('already exists')) {
    return { status: 409, code: 'CONFLICT', message };
  }
  if (message.includes('not found')) {
    return { status: 404, code: 'NOT_FOUND', message };
  }

  return null;
};

export const createContactRelationshipsController = (
  useCase: ContactRelationshipsUseCase,
  mode: ResponseMode
) => {
  const getContactRelationships = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const relationships = await useCase.list(req.params.contactId);
      sendData(res, mode, relationships);
    } catch (error) {
      next(error);
    }
  };

  const getContactRelationshipById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const relationship = await useCase.getById(req.params.relationshipId);
      if (!relationship) {
        sendFailure(res, mode, 'NOT_FOUND', 'Relationship not found', 404);
        return;
      }

      sendData(res, mode, relationship);
    } catch (error) {
      next(error);
    }
  };

  const createContactRelationship = async (
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

      const relationship = await useCase.create(
        req.params.contactId,
        req.body as CreateContactRelationshipDTO,
        userId
      );
      sendData(res, mode, relationship, 201);
    } catch (error) {
      const mapped = mapRelationshipError(error);
      if (mapped) {
        sendFailure(res, mode, mapped.code, mapped.message, mapped.status);
        return;
      }
      next(error);
    }
  };

  const updateContactRelationship = async (
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

      const relationship = await useCase.update(
        req.params.relationshipId,
        req.body as UpdateContactRelationshipDTO,
        userId
      );
      if (!relationship) {
        sendFailure(res, mode, 'NOT_FOUND', 'Relationship not found', 404);
        return;
      }

      sendData(res, mode, relationship);
    } catch (error) {
      const mapped = mapRelationshipError(error);
      if (mapped) {
        sendFailure(res, mode, mapped.code, mapped.message, mapped.status);
        return;
      }
      next(error);
    }
  };

  const deleteContactRelationship = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const deleted = await useCase.delete(req.params.relationshipId);
      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Relationship not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getContactRelationships,
    getContactRelationshipById,
    createContactRelationship,
    updateContactRelationship,
    deleteContactRelationship,
  };
};
