import fs from 'fs';
import path from 'path';
import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { logger } from '@config/logger';
import fileStorage from '@services/fileStorageService';
import { logPortalActivity } from '@services/domains/integration';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { PortalResourcesUseCase } from '../usecases/resourcesUseCase';

const getPortalContactId = (req: PortalAuthRequest): string | null => req.portalUser?.contactId ?? null;
const getUserAgent = (req: PortalAuthRequest): string | null =>
  typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
const sanitizeFileName = (name: string): string => {
  const candidate = path.basename(name || 'document');
  const safe = candidate
    .replace(/[\r\n"]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .trim();
  return safe || 'document';
};
const buildContentDisposition = (name: string): string => {
  const safeName = sanitizeFileName(name);
  const encoded = encodeURIComponent(safeName);
  return `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`;
};

export const createPortalResourcesController = (useCase: PortalResourcesUseCase) => {
  const getListQuery = (req: PortalAuthRequest) =>
    (req.validatedQuery ?? req.query) as {
      search?: string;
      sort?: string;
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    };

  const getDocuments = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const query = getListQuery(req);
      const documents = await useCase.getDocuments(contactId, {
        search: query.search,
        sort: query.sort as 'created_at' | 'title' | 'document_type' | 'original_name' | undefined,
        order: query.order,
        limit: query.limit,
        offset: query.offset,
      });
      sendSuccess(res, documents);
    } catch (error) {
      next(error);
    }
  };

  const getForms = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const query = getListQuery(req);
      const forms = await useCase.getForms(contactId, {
        search: query.search,
        sort: query.sort as 'created_at' | 'title' | 'document_type' | 'original_name' | undefined,
        order: query.order,
        limit: query.limit,
        offset: query.offset,
      });
      sendSuccess(res, forms);
    } catch (error) {
      next(error);
    }
  };

  const getNotes = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const query = getListQuery(req);
      const notes = await useCase.getNotes(contactId, {
        search: query.search,
        sort: query.sort as 'created_at' | 'subject' | 'note_type' | undefined,
        order: query.order,
        limit: query.limit,
        offset: query.offset,
      });
      sendSuccess(res, notes);
    } catch (error) {
      next(error);
    }
  };

  const getReminders = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const query = getListQuery(req);
      const reminders = await useCase.getReminders(contactId, {
        search: query.search,
        sort: query.sort as 'date' | 'title' | 'type' | undefined,
        order: query.order,
        limit: query.limit,
        offset: query.offset,
      });
      sendSuccess(res, reminders);
    } catch (error) {
      next(error);
    }
  };

  const downloadDocument = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId || !req.portalUser?.id) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const document = await useCase.getDownloadableDocument(contactId, req.params.id);
      if (!document) {
        sendError(res, 'DOCUMENT_NOT_FOUND', 'Document not found', 404);
        return;
      }

      const exists = await fileStorage.fileExists(document.file_path);
      if (!exists) {
        sendError(res, 'DOCUMENT_FILE_NOT_FOUND', 'Document file not found', 404);
        return;
      }

      const fullPath = fileStorage.getFullPath(document.file_path);
      const fileStream = fs.createReadStream(fullPath);

      const mimeType = document.mime_type || 'application/octet-stream';
      const fileName = document.original_name || 'document';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', buildContentDisposition(fileName));
      fileStream.on('error', (streamError) => next(streamError));
      fileStream.pipe(res);

      await logPortalActivity({
        portalUserId: req.portalUser.id,
        action: 'document.download',
        details: `Downloaded document ${req.params.id}`,
        ipAddress: req.ip,
        userAgent: getUserAgent(req),
      });
    } catch (error) {
      logger.error('Failed to download portal document', { error });
      next(error);
    }
  };

  return {
    getDocuments,
    getForms,
    getNotes,
    getReminders,
    downloadDocument,
  };
};
