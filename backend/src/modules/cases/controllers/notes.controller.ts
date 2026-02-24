import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateCaseNoteDTO, UpdateCaseNoteDTO } from '@app-types/case';
import { CaseNotesUseCase } from '../usecases/caseNotes.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createCaseNotesController = (
  useCase: CaseNotesUseCase,
  mode: ResponseMode
) => {
  const getCaseNotes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notes = await useCase.list(req.params.id);
      sendData(res, mode, mode === 'v2' ? notes : { notes });
    } catch (error) {
      next(error);
    }
  };

  const createCaseNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const note = await useCase.create(req.body as CreateCaseNoteDTO, req.user?.id);
      sendData(res, mode, note, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateCaseNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const note = await useCase.update(req.params.noteId, req.body as UpdateCaseNoteDTO, req.user?.id);
      sendData(res, mode, note);
    } catch (error) {
      next(error);
    }
  };

  const deleteCaseNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await useCase.delete(req.params.noteId);
      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Case note not found', 404);
        return;
      }

      if (mode === 'v2') {
        res.status(204).send();
        return;
      }

      sendData(res, mode, { success: true });
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
