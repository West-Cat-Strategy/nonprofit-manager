import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateCaseNoteDTO, UpdateCaseNoteDTO } from '@app-types/case';
import { CaseNotesUseCase } from '../usecases/caseNotes.usecase';
import { sendData, sendFailure } from '../mappers/responseMode';

export const createCaseNotesController = (useCase: CaseNotesUseCase) => {
  const getCaseNotes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notes = await useCase.list(req.params.id);
      sendData(res, notes);
    } catch (error) {
      next(error);
    }
  };

  const createCaseNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const note = await useCase.create(req.body as CreateCaseNoteDTO, req.user?.id);
      sendData(res, note, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateCaseNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const note = await useCase.update(req.params.noteId, req.body as UpdateCaseNoteDTO, req.user?.id);
      sendData(res, note);
    } catch (error) {
      next(error);
    }
  };

  const deleteCaseNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await useCase.delete(req.params.noteId);
      if (!deleted) {
        sendFailure(res, 'NOT_FOUND', 'Case note not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getCaseNotes,
    createCaseNote,
    updateCaseNote,
    deleteCaseNote,
  };
};
