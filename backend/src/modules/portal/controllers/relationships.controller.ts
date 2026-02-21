import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { PortalRelationshipsUseCase } from '../usecases/relationshipsUseCase';

const getPortalContactId = (req: PortalAuthRequest): string | null => req.portalUser?.contactId ?? null;

export const createPortalRelationshipsController = (useCase: PortalRelationshipsUseCase) => {
  const getRelationships = async (
    req: PortalAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const rows = await useCase.list(contactId);
      sendSuccess(res, rows);
    } catch (error) {
      next(error);
    }
  };

  const createRelationship = async (
    req: PortalAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      const portalUserId = req.portalUser?.id;
      if (!contactId || !portalUserId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const row = await useCase.create({
        contactId,
        portalUserId,
        relatedContactId: req.body.related_contact_id as string | undefined,
        relatedContact: req.body.related_contact as
          | {
              first_name: string;
              last_name: string;
              email?: string;
              phone?: string;
            }
          | undefined,
        relationshipType: req.body.relationship_type as string,
        relationshipLabel: req.body.relationship_label as string | undefined,
        notes: req.body.notes as string | undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (!row) {
        sendError(res, 'VALIDATION_ERROR', 'Related contact is required', 400);
        return;
      }

      sendSuccess(res, row, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateRelationship = async (
    req: PortalAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      const portalUserId = req.portalUser?.id;
      if (!contactId || !portalUserId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const row = await useCase.update({
        contactId,
        relationshipId: req.params.id,
        portalUserId,
        relationshipType: req.body.relationship_type as string | undefined,
        relationshipLabel: req.body.relationship_label as string | null | undefined,
        notes: req.body.notes as string | null | undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (row === 'no_updates') {
        sendError(res, 'VALIDATION_ERROR', 'No updates provided', 400);
        return;
      }

      if (!row) {
        sendError(res, 'RELATIONSHIP_NOT_FOUND', 'Relationship not found', 404);
        return;
      }

      sendSuccess(res, row);
    } catch (error) {
      next(error);
    }
  };

  const deleteRelationship = async (
    req: PortalAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      const portalUserId = req.portalUser?.id;
      if (!contactId || !portalUserId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const deleted = await useCase.remove({
        contactId,
        relationshipId: req.params.id,
        portalUserId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (!deleted) {
        sendError(res, 'RELATIONSHIP_NOT_FOUND', 'Relationship not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const getPointpersonContext = async (
    req: PortalAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const requestedCaseId = typeof req.query.case_id === 'string' ? req.query.case_id : undefined;
      const payload = await useCase.getPointpersonContext(contactId, requestedCaseId);
      sendSuccess(res, payload);
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 'POINTPERSON_CONTEXT_ERROR', error.message, 400);
        return;
      }
      next(error);
    }
  };

  return {
    getRelationships,
    createRelationship,
    updateRelationship,
    deleteRelationship,
    getPointpersonContext,
  };
};
