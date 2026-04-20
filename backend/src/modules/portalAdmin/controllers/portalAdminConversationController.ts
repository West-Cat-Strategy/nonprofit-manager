import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  addStaffMessage,
  getStaffThread,
  listStaffThreads,
  markStaffThreadRead,
  updateThread,
} from '@modules/portal/services/portalMessagingService';
import {
  isPortalRealtimeEnabled,
  openPortalRealtimeStream,
} from '@services/portalRealtimeService';
import { badRequest, notFoundMessage } from '@utils/responseHelpers';
import { ensurePortalAdmin, getPortalAdminQuery } from './portalAdminController.shared';

export const listPortalAdminConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const query = getPortalAdminQuery<{
      status?: 'open' | 'closed' | 'archived';
      case_id?: string;
      pointperson_user_id?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }>(req);

    const conversations = await listStaffThreads({
      status: query.status,
      caseId: query.case_id,
      pointpersonUserId: query.pointperson_user_id,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });

    sendSuccess(res, { conversations });
  } catch (error) {
    next(error);
  }
};

export const getPortalAdminConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { threadId } = req.params;
    const conversation = await getStaffThread(threadId);

    if (!conversation) {
      notFoundMessage(res, 'Conversation not found');
      return;
    }

    await markStaffThreadRead(threadId);
    sendSuccess(res, conversation);
  } catch (error) {
    next(error);
  }
};

export const replyPortalAdminConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { threadId } = req.params;
    const { message, is_internal } = req.body as {
      message: string;
      client_message_id?: string;
      is_internal?: boolean;
    };

    const existing = await getStaffThread(threadId);
    if (!existing) {
      notFoundMessage(res, 'Conversation not found');
      return;
    }

    if (existing.thread.status !== 'open') {
      badRequest(res, 'Conversation is not open');
      return;
    }

    const created = await addStaffMessage({
      threadId,
      senderUserId: req.user!.id,
      messageText: message,
      isInternal: Boolean(is_internal),
      clientMessageId: (req.body.client_message_id as string | undefined) ?? undefined,
    });

    await markStaffThreadRead(threadId);
    sendSuccess(res, { message: created }, 201);
  } catch (error) {
    next(error);
  }
};

export const updatePortalAdminConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { threadId } = req.params;
    const status =
      req.body.status === 'open' || req.body.status === 'closed' || req.body.status === 'archived'
        ? req.body.status
        : undefined;
    const pointpersonUserId =
      req.body.pointperson_user_id === null || typeof req.body.pointperson_user_id === 'string'
        ? req.body.pointperson_user_id
        : undefined;
    const caseId =
      req.body.case_id === null || typeof req.body.case_id === 'string'
        ? req.body.case_id
        : undefined;
    const subject =
      req.body.subject === null || typeof req.body.subject === 'string'
        ? req.body.subject
        : undefined;

    const updated = await updateThread({
      threadId,
      status,
      pointpersonUserId,
      caseId,
      subject,
      actorType: 'staff',
      closedBy: status === 'closed' ? req.user!.id : null,
    });

    if (!updated) {
      notFoundMessage(res, 'Conversation not found');
      return;
    }

    sendSuccess(res, { conversation: updated });
  } catch (error) {
    next(error);
  }
};

export const streamPortalAdminRealtime = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    if (!isPortalRealtimeEnabled()) {
      badRequest(res, 'Portal realtime stream is disabled');
      return;
    }

    const query = getPortalAdminQuery<{ channels?: string }>(req);
    const channelsRaw = typeof query.channels === 'string' ? query.channels : undefined;

    openPortalRealtimeStream({
      req,
      res,
      audience: 'admin',
      userId: req.user!.id,
      channelsRaw,
    });
  } catch (error) {
    if (error instanceof Error) {
      badRequest(res, error.message);
      return;
    }
    next(error);
  }
};
