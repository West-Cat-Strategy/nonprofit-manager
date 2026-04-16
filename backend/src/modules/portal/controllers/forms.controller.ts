import fs from 'fs';
import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import fileStorage from '@services/fileStorageService';
import type {
  SaveCaseFormDraftDTO,
  SubmitCaseFormDTO,
} from '@app-types/caseForms';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { CaseFormsUseCase } from '@modules/cases/usecases/caseForms.usecase';

const encodeFileName = (name: string): string => encodeURIComponent(name).replace(/%20/g, ' ');

const getPortalActor = (
  req: PortalAuthRequest
): { contactId: string; portalUserId?: string | null } | null => {
  if (!req.portalUser?.contactId) {
    return null;
  }

  return {
    contactId: req.portalUser.contactId,
    portalUserId: req.portalUser.id,
  };
};

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

export const createPortalFormsController = (useCase: CaseFormsUseCase) => {
  const listForms = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getPortalActor(req);
      if (!actor) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const query = (req.validatedQuery ?? req.query) as { status?: string };
      const assignments = await useCase.listAssignmentsForPortal(actor.contactId, query.status);
      sendSuccess(res, assignments);
    } catch (error) {
      next(error);
    }
  };

  const getForm = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getPortalActor(req);
      if (!actor) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const detail = await useCase.getAssignmentDetailForPortal(actor, req.params.assignmentId);
      sendSuccess(res, detail);
    } catch (error) {
      next(error);
    }
  };

  const uploadAsset = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getPortalActor(req);
      if (!actor) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }
      if (!req.file) {
        sendError(res, 'VALIDATION_ERROR', 'No file uploaded', 400);
        return;
      }

      const asset = await useCase.uploadAssetForPortal(
        actor,
        req.params.assignmentId,
        req.body as { question_key: string; asset_kind: 'upload' | 'signature' },
        req.file
      );
      sendSuccess(res, asset, 201);
    } catch (error) {
      next(error);
    }
  };

  const saveDraft = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getPortalActor(req);
      if (!actor) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const assignment = await useCase.saveDraftForPortal(
        actor,
        req.params.assignmentId,
        req.body as SaveCaseFormDraftDTO
      );
      sendSuccess(res, assignment);
    } catch (error) {
      next(error);
    }
  };

  const submit = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = getPortalActor(req);
      if (!actor) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const detail = await useCase.submitForPortal(
        actor,
        req.params.assignmentId,
        req.body as SubmitCaseFormDTO
      );
      sendSuccess(res, detail, 201);
    } catch (error) {
      next(error);
    }
  };

  const downloadResponsePacket = async (
    req: PortalAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const actor = getPortalActor(req);
      if (!actor) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const payload = await useCase.getResponsePacketForPortal(actor, req.params.assignmentId);
      await streamDownload(payload, res, next);
    } catch (error) {
      next(error);
    }
  };

  return {
    listForms,
    getForm,
    uploadAsset,
    saveDraft,
    submit,
    downloadResponsePacket,
  };
};
