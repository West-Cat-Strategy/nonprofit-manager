import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { normalizePortalStatus } from '../mappers/portalMappers';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { PortalMessagingUseCase } from '../usecases/messagingUseCase';

const getPortalContactId = (req: PortalAuthRequest): string | null => req.portalUser?.contactId ?? null;

export const createPortalMessagingController = (useCase: PortalMessagingUseCase) => {
  const getThreads = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.portalUser?.id) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const threads = await useCase.listThreads(req.portalUser.id);
      sendSuccess(res, { threads });
    } catch (error) {
      next(error);
    }
  };

  const createThread = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const portalUserId = req.portalUser?.id;
      const contactId = getPortalContactId(req);
      if (!portalUserId || !contactId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const payload = await useCase.createThread({
        portalUserId,
        contactId,
        caseId: (req.body.case_id as string | undefined) ?? null,
        subject: (req.body.subject as string | undefined) ?? null,
        message: req.body.message as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      sendSuccess(res, payload, 201);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('Thread') || error.message.toLowerCase().includes('pointperson'))
      ) {
        sendError(res, 'THREAD_ERROR', error.message, 400);
        return;
      }
      next(error);
    }
  };

  const getThread = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.portalUser?.id) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const thread = await useCase.getThread(req.portalUser.id, req.params.threadId);
      if (!thread) {
        sendError(res, 'THREAD_NOT_FOUND', 'Thread not found', 404);
        return;
      }

      sendSuccess(res, thread);
    } catch (error) {
      next(error);
    }
  };

  const reply = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.portalUser?.id) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const existing = await useCase.getThread(req.portalUser.id, req.params.threadId);
      if (!existing) {
        sendError(res, 'THREAD_NOT_FOUND', 'Thread not found', 404);
        return;
      }

      const message = await useCase.addReply({
        portalUserId: req.portalUser.id,
        threadId: req.params.threadId,
        message: req.body.message as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      sendSuccess(res, { message }, 201);
    } catch (error) {
      next(error);
    }
  };

  const markRead = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.portalUser?.id) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const updated = await useCase.markRead(req.portalUser.id, req.params.threadId);
      sendSuccess(res, { updated });
    } catch (error) {
      next(error);
    }
  };

  const updateThread = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.portalUser?.id) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const thread = await useCase.updateThread({
        threadId: req.params.threadId,
        status: normalizePortalStatus(req.body.status),
        subject: (req.body.subject as string | null | undefined) ?? undefined,
      });

      if (!thread) {
        sendError(res, 'THREAD_NOT_FOUND', 'Thread not found', 404);
        return;
      }

      sendSuccess(res, { thread });
    } catch (error) {
      next(error);
    }
  };

  return {
    getThreads,
    createThread,
    getThread,
    reply,
    markRead,
    updateThread,
  };
};
