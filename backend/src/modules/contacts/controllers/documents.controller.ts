import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CreateContactDocumentDTO, UpdateContactDocumentDTO } from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';
import { ContactDocumentsUseCase } from '../usecases/contactDocuments.usecase';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

const parseBooleanField = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
      return false;
    }
  }

  return undefined;
};

export const createContactDocumentsController = (
  useCase: ContactDocumentsUseCase,
  directoryUseCase: ContactDirectoryUseCase,
  mode: ResponseMode
) => {
  const getContactDocuments = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      if (scope) {
        const scopedContact = await directoryUseCase.getById(req.params.contactId, scope);
        if (!scopedContact) {
          sendFailure(res, mode, 'NOT_FOUND', 'Contact not found', 404);
          return;
        }
      }

      const documents = await useCase.list(req.params.contactId);
      sendData(res, mode, documents);
    } catch (error) {
      next(error);
    }
  };

  const getDocumentById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const document = await useCase.getById(req.params.documentId, scope);
      if (!document) {
        sendFailure(res, mode, 'NOT_FOUND', 'Document not found', 404);
        return;
      }

      sendData(res, mode, document);
    } catch (error) {
      next(error);
    }
  };

  const downloadDocument = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const document = await useCase.getById(req.params.documentId, scope);
      if (!document || !document.is_active) {
        sendFailure(res, mode, 'NOT_FOUND', 'Document not found', 404);
        return;
      }

      const filePath = useCase.resolveFilePath(document);
      if (!filePath) {
        sendFailure(res, mode, 'NOT_FOUND', 'Document file not found', 404);
        return;
      }

      res.setHeader('Content-Type', document.mime_type);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(document.original_name)}"`
      );
      res.setHeader('Content-Length', document.file_size);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  };

  const uploadDocument = async (
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

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      if (scope) {
        const scopedContact = await directoryUseCase.getById(req.params.contactId, scope);
        if (!scopedContact) {
          sendFailure(res, mode, 'NOT_FOUND', 'Contact not found', 404);
          return;
        }
      }

      if (!req.file) {
        sendFailure(res, mode, 'VALIDATION_ERROR', 'No file uploaded', 400);
        return;
      }

      const payload: CreateContactDocumentDTO = {
        case_id: req.body.case_id,
        document_type: req.body.document_type,
        title: req.body.title,
        description: req.body.description,
        is_portal_visible: parseBooleanField(req.body.is_portal_visible),
      };

      const created = await useCase.create(req.params.contactId, req.file, payload, userId);
      sendData(res, mode, created, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateDocument = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;

      const payload: UpdateContactDocumentDTO = {
        ...(req.body as UpdateContactDocumentDTO),
        is_portal_visible:
          parseBooleanField(req.body.is_portal_visible) ??
          (req.body as UpdateContactDocumentDTO).is_portal_visible,
      };

      const updated = await useCase.update(req.params.documentId, payload, req.user?.id, scope);
      if (!updated) {
        sendFailure(res, mode, 'NOT_FOUND', 'Document not found', 404);
        return;
      }

      sendData(res, mode, updated);
    } catch (error) {
      next(error);
    }
  };

  const deleteDocument = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const deleted = await useCase.delete(req.params.documentId, scope);
      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Document not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getContactDocuments,
    getDocumentById,
    downloadDocument,
    uploadDocument,
    updateDocument,
    deleteDocument,
  };
};
