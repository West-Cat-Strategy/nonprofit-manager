import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import type { CreateContactNoteDTO, UpdateContactNoteDTO } from '@app-types/contact';
import { ContactNotesUseCase } from '../usecases/contactNotes.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createContactNotesController = (
  useCase: ContactNotesUseCase,
  mode: ResponseMode
) => {
  const guardOutcomeTagPermission = (req: AuthRequest, res: Response): boolean => {
    const guardResult = requirePermissionSafe(req, Permission.OUTCOMES_TAG_INTERACTION);
    if (!guardResult.ok) {
      if (guardResult.error.code === 'unauthorized') {
        sendUnauthorized(res, guardResult.error.message);
      } else {
        sendForbidden(res, guardResult.error.message || 'Forbidden');
      }
      return false;
    }

    return true;
  };

  const hasOutcomePayload = (
    payload: Partial<CreateContactNoteDTO | UpdateContactNoteDTO> | undefined
  ): boolean => payload?.outcome_impacts !== undefined || payload?.outcomes_mode !== undefined;

  const getContactNotes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notes = await useCase.list(req.params.contactId);
      sendData(res, mode, notes);
    } catch (error) {
      next(error);
    }
  };

  const getContactNotesTimeline = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const timeline = await useCase.listTimeline(req.params.contactId);
      sendData(res, mode, timeline);
    } catch (error) {
      next(error);
    }
  };

  const getContactNoteById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const note = await useCase.getById(req.params.noteId);
      if (!note) {
        sendFailure(res, mode, 'NOT_FOUND', 'Note not found', 404);
        return;
      }

      sendData(res, mode, note);
    } catch (error) {
      next(error);
    }
  };

  const createContactNote = async (
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

      const payload = req.body as CreateContactNoteDTO;
      if (hasOutcomePayload(payload) && !guardOutcomeTagPermission(req, res)) {
        return;
      }

      const note = await useCase.create(req.params.contactId, payload, userId);
      sendData(res, mode, note, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateContactNote = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = req.body as UpdateContactNoteDTO;
      if (hasOutcomePayload(payload) && !guardOutcomeTagPermission(req, res)) {
        return;
      }

      const note = await useCase.update(req.params.noteId, payload, req.user?.id);
      if (!note) {
        sendFailure(res, mode, 'NOT_FOUND', 'Note not found', 404);
        return;
      }

      sendData(res, mode, note);
    } catch (error) {
      next(error);
    }
  };

  const deleteContactNote = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const deleted = await useCase.delete(req.params.noteId);
      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Note not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getContactNotes,
    getContactNotesTimeline,
    getContactNoteById,
    createContactNote,
    updateContactNote,
    deleteContactNote,
  };
};
