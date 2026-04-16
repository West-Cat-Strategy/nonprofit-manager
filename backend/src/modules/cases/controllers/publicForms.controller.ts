import fs from 'fs';
import { NextFunction, Request, Response } from 'express';
import fileStorage from '@services/fileStorageService';
import type {
  SaveCaseFormDraftDTO,
  SubmitCaseFormDTO,
} from '@app-types/caseForms';
import { sendSuccess } from '../../shared/http/envelope';
import { CaseFormsUseCase } from '../usecases/caseForms.usecase';

const encodeFileName = (name: string): string => encodeURIComponent(name).replace(/%20/g, ' ');

const streamDownload = async (
  payload: { fileName: string; filePath: string; mimeType: string },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const exists = await fileStorage.fileExists(payload.filePath);
  if (!exists) {
    throw Object.assign(new Error('File not found'), { statusCode: 404, code: 'not_found' });
  }

  const fullPath = fileStorage.getFullPath(payload.filePath);
  res.setHeader('Content-Type', payload.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeFileName(payload.fileName)}"`);

  const stream = fs.createReadStream(fullPath);
  stream.on('error', (error) => next(error));
  stream.pipe(res);
};

export const createPublicCaseFormsController = (useCase: CaseFormsUseCase) => {
  const getToken = (req: Request): string => {
    const value = req.params.token;
    return Array.isArray(value) ? value[0] || '' : value;
  };

  const getForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await useCase.getAssignmentDetailByToken(getToken(req));
      sendSuccess(res, detail);
    } catch (error) {
      next(error);
    }
  };

  const uploadAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw Object.assign(new Error('No file uploaded'), { statusCode: 400, code: 'validation_error' });
      }

      const asset = await useCase.uploadAssetByToken(
        getToken(req),
        req.body as { question_key: string; asset_kind: 'upload' | 'signature' },
        req.file
      );
      sendSuccess(res, asset, 201);
    } catch (error) {
      next(error);
    }
  };

  const saveDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignment = await useCase.saveDraftByToken(
        getToken(req),
        req.body as SaveCaseFormDraftDTO
      );
      sendSuccess(res, assignment);
    } catch (error) {
      next(error);
    }
  };

  const submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await useCase.submitByToken(
        getToken(req),
        req.body as SubmitCaseFormDTO
      );
      sendSuccess(res, detail, 201);
    } catch (error) {
      next(error);
    }
  };

  const downloadResponsePacket = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = await useCase.getResponsePacketByToken(getToken(req));
      await streamDownload(payload, res, next);
    } catch (error) {
      next(error);
    }
  };

  return {
    getForm,
    uploadAsset,
    saveDraft,
    submit,
    downloadResponsePacket,
  };
};
