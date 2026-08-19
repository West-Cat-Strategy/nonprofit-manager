import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateContactRelationshipDTO, UpdateContactRelationshipDTO } from '@app-types/contact';
import { ContactRelationshipsUseCase } from '../usecases/contactRelationships.usecase';
import { sendData, sendFailure } from '../mappers/responseMode';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { ensureContactAccess } from './contactAccess';

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
  directoryUseCase: ContactDirectoryUseCase
) => {
  const getContactRelationships = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!(await ensureContactAccess(req, res, directoryUseCase, req.params.contactId))) return;
      const relationships = await useCase.list(req.params.contactId);
      sendData(res, relationships);
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
        sendFailure(res, 'NOT_FOUND', 'Relationship not found', 404);
        return;
      }
      if (!(await ensureContactAccess(req, res, directoryUseCase, relationship.contact_id))) return;

      sendData(res, relationship);
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
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const payload = req.body as CreateContactRelationshipDTO;
      if (!(await ensureContactAccess(req, res, directoryUseCase, req.params.contactId))) return;
      if (!(await ensureContactAccess(req, res, directoryUseCase, payload.related_contact_id))) return;

      const relationship = await useCase.create(
        req.params.contactId,
        payload,
        userId
      );
      sendData(res, relationship, 201);
    } catch (error) {
      const mapped = mapRelationshipError(error);
      if (mapped) {
        sendFailure(res, mapped.code, mapped.message, mapped.status);
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
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const existing = await useCase.getById(req.params.relationshipId);
      if (!existing) {
        sendFailure(res, 'NOT_FOUND', 'Relationship not found', 404);
        return;
      }
      if (!(await ensureContactAccess(req, res, directoryUseCase, existing.contact_id))) return;
      const payload = req.body as UpdateContactRelationshipDTO;
      const relationship = await useCase.update(
        req.params.relationshipId,
        payload,
        userId
      );
      if (!relationship) {
        sendFailure(res, 'NOT_FOUND', 'Relationship not found', 404);
        return;
      }

      sendData(res, relationship);
    } catch (error) {
      const mapped = mapRelationshipError(error);
      if (mapped) {
        sendFailure(res, mapped.code, mapped.message, mapped.status);
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
      const existing = await useCase.getById(req.params.relationshipId);
      if (!existing) {
        sendFailure(res, 'NOT_FOUND', 'Relationship not found', 404);
        return;
      }
      if (!(await ensureContactAccess(req, res, directoryUseCase, existing.contact_id))) return;
      const deleted = await useCase.delete(req.params.relationshipId);
      if (!deleted) {
        sendFailure(res, 'NOT_FOUND', 'Relationship not found', 404);
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
