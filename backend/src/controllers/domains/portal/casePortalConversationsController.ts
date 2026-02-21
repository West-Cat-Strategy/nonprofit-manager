import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { forbidden, notFoundMessage, badRequest } from '@utils/responseHelpers';
import {
  addStaffMessage,
  getStaffThread,
  listCaseThreads,
  markStaffThreadRead,
} from '@services/portalMessagingService';

const tryHandlePortalRequestError = (error: unknown, res: Response): boolean => {
  const message = error instanceof Error ? error.message : '';
  if (message === 'Thread is not open' || message === 'Thread not found') {
    badRequest(res, message);
    return true;
  }
  return false;
};

export const getCasePortalConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const caseId = req.params.id;
    const summaries = await listCaseThreads(caseId);
    const conversations = await Promise.all(summaries.map(async (thread) => getStaffThread(thread.id)));
    res.json({ conversations: conversations.filter((entry) => entry !== null) });
  } catch (error) {
    next(error);
  }
};

export const replyCasePortalConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      forbidden(res, 'Authentication required');
      return;
    }

    const caseId = req.params.id;
    const threadId = req.params.threadId;
    const { message, is_internal } = req.body as { message: string; is_internal?: boolean };

    const thread = await getStaffThread(threadId);
    if (!thread || thread.thread.case_id !== caseId) {
      notFoundMessage(res, 'Conversation not found for this case');
      return;
    }

    const createdMessage = await addStaffMessage({
      threadId,
      senderUserId: req.user.id,
      messageText: message,
      isInternal: Boolean(is_internal),
    });
    await markStaffThreadRead(threadId);

    res.status(201).json({ message: createdMessage });
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};
