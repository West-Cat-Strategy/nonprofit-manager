import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateCaseNoteDTO } from '@app-types/case';
import { CaseNotesUseCase } from '../usecases/caseNotes.usecase';
import { ResponseMode, sendData } from '../mappers/responseMode';

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

  return {
    getCaseNotes,
    createCaseNote,
  };
};
