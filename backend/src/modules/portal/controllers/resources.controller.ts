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

export const createPortalResourcesController = (useCase: PortalResourcesUseCase) => {
  const getDocuments = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const documents = await useCase.getDocuments(contactId);
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

      const forms = await useCase.getForms(contactId);
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

      const notes = await useCase.getNotes(contactId);
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

      const reminders = await useCase.getReminders(contactId);
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

      const fs = await import('fs');
      const fullPath = fileStorage.getFullPath(document.file_path);
      const fileStream = fs.createReadStream(fullPath);

      res.setHeader('Content-Type', document.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
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
