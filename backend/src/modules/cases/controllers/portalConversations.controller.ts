import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { badRequest, created, forbidden, notFoundMessage } from '@utils/responseHelpers';
import {
  addStaffMessage,
  getStaffThread,
  listCaseThreads,
  markStaffThreadRead,
} from '@modules/portal/services/portalMessagingService';
import { resolveCaseConversation } from '@services/caseWorkflowService';

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
    const conversations = await Promise.all(
      summaries.map(async (thread) => getStaffThread(thread.id))
    );
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
    const { message, is_internal } = req.body as {
      is_internal?: boolean;
      message: string;
    };

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

export const resolvePortalConversation = async (
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
    const {
      resolution_note,
      outcome_definition_ids,
      close_status,
      visible_to_client,
    } = req.body as {
      resolution_note: string;
      outcome_definition_ids: string[];
      close_status: 'closed' | 'archived';
      visible_to_client?: boolean;
    };

    const conversation = await resolveCaseConversation({
      caseId,
      threadId,
      userId: req.user.id,
      resolutionNote: resolution_note,
      outcomeDefinitionIds: outcome_definition_ids,
      closeStatus: close_status,
      visibleToClient: Boolean(visible_to_client),
    });

    if (!conversation) {
      notFoundMessage(res, 'Conversation not found for this case');
      return;
    }

    created(res, { conversation });
  } catch (error) {
    const errorRecord = error as unknown as Record<string, unknown>;
    if (error instanceof Error && 'statusCode' in errorRecord) {
      const statusCode = Number(errorRecord.statusCode || 500);
      if (statusCode === 404) {
        notFoundMessage(res, error.message);
        return;
      }
      badRequest(res, error.message);
      return;
    }

    next(error);
  }
};
