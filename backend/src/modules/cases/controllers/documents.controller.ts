import fs from 'fs';
import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import fileStorage, { uploadFile } from '@services/fileStorageService';
import type { UpdateCaseDocumentDTO } from '@app-types/case';
import { CaseDocumentsUseCase } from '../usecases/caseDocuments.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

const INLINE_PREVIEW_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return undefined;
};

const resolveVisibleToClient = (body: Record<string, unknown>): boolean => {
  const visible = toBoolean(body.visible_to_client);
  if (visible !== undefined) return visible;

  const portalVisible = toBoolean(body.is_portal_visible);
  if (portalVisible !== undefined) return portalVisible;

  return false;
};

const encodeFileName = (name: string): string => encodeURIComponent(name).replace(/%20/g, ' ');

export const createCaseDocumentsController = (
  useCase: CaseDocumentsUseCase,
  mode: ResponseMode
) => {
  const getCaseDocuments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const documents = await useCase.list(req.params.id);
      sendData(res, mode, mode === 'v2' ? documents : { documents });
    } catch (error) {
      next(error);
    }
  };

  const uploadCaseDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        sendFailure(res, mode, 'VALIDATION_ERROR', 'No file uploaded', 400);
        return;
      }

      const caseId = req.params.id;
      const uploadResult = await uploadFile(file, `case-documents/${caseId}`);
      const body = req.body as Record<string, unknown>;

      const document = await useCase.create({
        caseId,
        fileName: uploadResult.fileName,
        originalFilename: file.originalname,
        filePath: uploadResult.filePath,
        fileSize: uploadResult.fileSize,
        mimeType: file.mimetype,
        documentType: typeof body.document_type === 'string' ? body.document_type : undefined,
        documentName:
          typeof body.document_name === 'string'
            ? body.document_name
            : typeof body.title === 'string'
              ? body.title
              : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        visibleToClient: resolveVisibleToClient(body),
        userId: req.user?.id,
      });

      sendData(res, mode, document, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateCaseDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as Record<string, unknown>;
      const payload: UpdateCaseDocumentDTO = {
        document_name: typeof body.document_name === 'string' ? body.document_name : undefined,
        document_type: typeof body.document_type === 'string' ? body.document_type : undefined,
        description:
          typeof body.description === 'string' || body.description === null
            ? (body.description as string | null)
            : undefined,
        visible_to_client: toBoolean(body.visible_to_client),
        is_portal_visible: toBoolean(body.is_portal_visible),
        is_active: toBoolean(body.is_active),
      };

      const document = await useCase.update(req.params.documentId, payload, req.user?.id);
      sendData(res, mode, document);
    } catch (error) {
      next(error);
    }
  };

  const deleteCaseDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await useCase.delete(req.params.documentId, req.user?.id);
      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Case document not found', 404);
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

  const downloadCaseDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = (await useCase.get(req.params.id, req.params.documentId)) as
        | {
            file_path?: string | null;
            mime_type?: string | null;
            original_filename?: string | null;
            document_name?: string | null;
          }
        | null;

      if (!record || !record.file_path) {
        sendFailure(res, mode, 'NOT_FOUND', 'Case document not found', 404);
        return;
      }

      const exists = await fileStorage.fileExists(record.file_path);
      if (!exists) {
        sendFailure(res, mode, 'NOT_FOUND', 'Case document file not found', 404);
        return;
      }

      const fullPath = fileStorage.getFullPath(record.file_path);
      const fileName = record.original_filename || record.document_name || 'case-document';
      const mimeType = record.mime_type || 'application/octet-stream';
      const dispositionQuery = String(req.query.disposition || '').toLowerCase();
      const wantsInline = dispositionQuery === 'inline' && INLINE_PREVIEW_MIME_TYPES.has(mimeType);
      const disposition = wantsInline ? 'inline' : 'attachment';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeFileName(fileName)}"`);

      const stream = fs.createReadStream(fullPath);
      stream.on('error', (streamError) => next(streamError));
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  };

  return {
    getCaseDocuments,
    uploadCaseDocument,
    updateCaseDocument,
    deleteCaseDocument,
    downloadCaseDocument,
  };
};

