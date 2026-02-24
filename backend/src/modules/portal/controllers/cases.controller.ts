import fs from 'fs';
import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import fileStorage from '@services/fileStorageService';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { PortalCasesUseCase } from '../usecases/casesUseCase';

const INLINE_PREVIEW_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const getPortalContactId = (req: PortalAuthRequest): string | null => req.portalUser?.contactId ?? null;
const encodeFileName = (name: string): string => encodeURIComponent(name).replace(/%20/g, ' ');

export const createPortalCasesController = (useCase: PortalCasesUseCase) => {
  const listCases = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const cases = await useCase.listCases(contactId);
      sendSuccess(res, cases);
    } catch (error) {
      next(error);
    }
  };

  const getCaseById = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const caseData = await useCase.getCase(contactId, req.params.id);
      if (!caseData) {
        sendError(res, 'NOT_FOUND', 'Case not found', 404);
        return;
      }

      sendSuccess(res, caseData);
    } catch (error) {
      next(error);
    }
  };

  const getCaseTimeline = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const caseData = await useCase.getCase(contactId, req.params.id);
      if (!caseData) {
        sendError(res, 'NOT_FOUND', 'Case not found', 404);
        return;
      }

      const timeline = await useCase.getTimeline(contactId, req.params.id);
      sendSuccess(res, timeline);
    } catch (error) {
      next(error);
    }
  };

  const getCaseDocuments = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const caseData = await useCase.getCase(contactId, req.params.id);
      if (!caseData) {
        sendError(res, 'NOT_FOUND', 'Case not found', 404);
        return;
      }

      const documents = await useCase.getDocuments(contactId, req.params.id);
      sendSuccess(res, documents);
    } catch (error) {
      next(error);
    }
  };

  const downloadCaseDocument = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const document = await useCase.getDownloadableDocument(
        contactId,
        req.params.id,
        req.params.documentId
      );
      if (!document) {
        sendError(res, 'NOT_FOUND', 'Document not found', 404);
        return;
      }

      const exists = await fileStorage.fileExists(document.file_path);
      if (!exists) {
        sendError(res, 'NOT_FOUND', 'Document file not found', 404);
        return;
      }

      const fullPath = fileStorage.getFullPath(document.file_path);
      const mimeType = document.mime_type || 'application/octet-stream';
      const fileName = document.original_filename || 'case-document';
      const dispositionQuery = String(req.query.disposition || '').toLowerCase();
      const disposition =
        dispositionQuery === 'inline' && INLINE_PREVIEW_MIME_TYPES.has(mimeType)
          ? 'inline'
          : 'attachment';

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
    listCases,
    getCaseById,
    getCaseTimeline,
    getCaseDocuments,
    downloadCaseDocument,
  };
};

