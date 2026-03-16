import type { Response } from 'express';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import type {
  TeamChatAddMemberDTO,
  TeamChatMarkReadDTO,
  TeamChatMessageCreateDTO,
  TeamMessengerConversationUpdateDTO,
  TeamMessengerDirectConversationCreateDTO,
  TeamMessengerGroupConversationCreateDTO,
  TeamMessengerTypingDTO,
} from '../types/contracts';
import { TeamChatEventName } from '../types/events';
import { TeamChatDomainError, type TeamChatActor } from '../usecases/teamChat.usecase';
import { TeamMessengerUseCase } from '../usecases/teamMessenger.usecase';
import {
  isTeamChatRealtimeEnabled,
  openTeamChatRealtimeStream,
  publishTeamChatRoomEvent,
  publishTeamChatTypingState,
} from '@services/teamChatRealtimeService';

const getOrganizationId = (req: AuthRequest): string | null =>
  req.organizationId || req.accountId || req.tenantId || null;

const buildActor = (req: AuthRequest, res: Response): TeamChatActor | null => {
  const userId = req.user?.id;
  const organizationId = getOrganizationId(req);

  if (!userId) {
    sendError(res, 'unauthorized', 'Unauthorized', 401, undefined, req.correlationId);
    return null;
  }

  if (!organizationId) {
    sendError(
      res,
      'bad_request',
      'Organization context required',
      400,
      undefined,
      req.correlationId
    );
    return null;
  }

  return {
    userId,
    organizationId,
    canManage: false,
  };
};

const handleControllerError = (
  req: AuthRequest,
  res: Response,
  error: unknown,
  fallbackMessage: string
): void => {
  if (error instanceof TeamChatDomainError) {
    sendError(
      res,
      error.code,
      error.message,
      error.status,
      error.details,
      req.correlationId
    );
    return;
  }

  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes('not found')) {
      sendError(res, 'TEAM_MESSENGER_NOT_FOUND', error.message, 404, undefined, req.correlationId);
      return;
    }

    if (normalized.includes('invalid') || normalized.includes('must')) {
      sendError(
        res,
        'TEAM_MESSENGER_VALIDATION_ERROR',
        error.message,
        400,
        undefined,
        req.correlationId
      );
      return;
    }
  }

  sendError(
    res,
    'TEAM_MESSENGER_ERROR',
    fallbackMessage,
    500,
    undefined,
    req.correlationId
  );
};

export const createTeamMessengerController = (useCase: TeamMessengerUseCase) => {
  const listContacts = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const contacts = await useCase.listContacts(actor);
      sendSuccess(res, { contacts });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to fetch messenger contacts');
    }
  };

  const listConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const conversations = await useCase.listConversations(actor);
      sendSuccess(res, { conversations });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to fetch conversations');
    }
  };

  const getConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { roomId: string } }).validatedParams ||
        req.params) as { roomId: string };

      const conversation = await useCase.getConversation(params.roomId, actor);
      sendSuccess(res, conversation);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to fetch conversation');
    }
  };

  const startDirectConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const payload = req.body as TeamMessengerDirectConversationCreateDTO;
      const conversation = await useCase.startDirectConversation(actor, payload);
      sendSuccess(res, conversation, 201);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to create direct conversation');
    }
  };

  const createGroupConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const payload = req.body as TeamMessengerGroupConversationCreateDTO;
      const conversation = await useCase.createGroupConversation(actor, payload);
      sendSuccess(res, conversation, 201);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to create group conversation');
    }
  };

  const updateConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { roomId: string } }).validatedParams ||
        req.params) as { roomId: string };
      const payload = req.body as TeamMessengerConversationUpdateDTO;
      const conversation = await useCase.updateConversation(params.roomId, actor, payload);
      sendSuccess(res, conversation);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to update conversation');
    }
  };

  const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { roomId: string } }).validatedParams ||
        req.params) as { roomId: string };
      const payload = req.body as TeamChatMessageCreateDTO;
      const result = await useCase.sendMessage(params.roomId, actor, payload);

      publishTeamChatRoomEvent({
        organizationId: actor.organizationId,
        participantUserIds: result.participant_user_ids,
        roomId: result.room_id,
        roomType: result.conversation.room.room_type,
        eventName: TeamChatEventName.MESSAGE_CREATED,
        payload: {
          room_id: result.room_id,
          room_type: result.conversation.room.room_type,
          actor_user_id: actor.userId,
          client_message_id: result.message.client_message_id,
          message: result.message,
          room: result.conversation.room,
        },
      });

      logger.info('Team messenger message created', {
        action: TeamChatEventName.MESSAGE_CREATED,
        roomId: result.room_id,
        messageId: result.message.id,
        actorUserId: actor.userId,
        organizationId: actor.organizationId,
        requestId: req.correlationId,
      });

      sendSuccess(res, {
        room_id: result.room_id,
        room: result.conversation.room,
        message: result.message,
      }, 201);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to send messenger message');
    }
  };

  const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { roomId: string } }).validatedParams ||
        req.params) as { roomId: string };
      const payload = req.body as TeamChatMarkReadDTO;
      const result = await useCase.markRead(params.roomId, actor, payload);

      publishTeamChatRoomEvent({
        organizationId: actor.organizationId,
        participantUserIds: result.participant_user_ids,
        roomId: result.room_id,
        roomType: result.conversation.room.room_type,
        eventName: TeamChatEventName.ROOM_READ,
        payload: {
          room_id: result.room_id,
          room_type: result.conversation.room.room_type,
          actor_user_id: actor.userId,
          last_read_at: result.last_read_at,
          last_read_message_id: result.last_read_message_id,
          room: result.conversation.room,
        },
      });

      sendSuccess(res, {
        room_id: result.room_id,
        room: result.conversation.room,
        last_read_at: result.last_read_at,
        last_read_message_id: result.last_read_message_id,
        unread_count: result.unread_count,
        unread_mentions_count: result.unread_mentions_count,
      });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to mark conversation read');
    }
  };

  const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { roomId: string } }).validatedParams ||
        req.params) as { roomId: string };
      const payload = req.body as TeamChatAddMemberDTO;
      const result = await useCase.addMember(params.roomId, actor, payload);

      publishTeamChatRoomEvent({
        organizationId: actor.organizationId,
        participantUserIds: result.participant_user_ids,
        roomId: params.roomId,
        roomType: result.conversation.room.room_type,
        eventName: TeamChatEventName.MEMBER_ADDED,
        payload: {
          room_id: params.roomId,
          room_type: result.conversation.room.room_type,
          actor_user_id: actor.userId,
          target_user_id: payload.user_id,
          room: result.conversation.room,
          members: result.conversation.members,
        },
      });

      sendSuccess(res, result.conversation);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to add conversation member');
    }
  };

  const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { roomId: string; userId: string } })
        .validatedParams || req.params) as { roomId: string; userId: string };
      const result = await useCase.removeMember(params.roomId, actor, params.userId);

      publishTeamChatRoomEvent({
        organizationId: actor.organizationId,
        participantUserIds: result.participant_user_ids,
        roomId: params.roomId,
        roomType: result.conversation.room.room_type,
        eventName: TeamChatEventName.MEMBER_REMOVED,
        payload: {
          room_id: params.roomId,
          room_type: result.conversation.room.room_type,
          actor_user_id: actor.userId,
          target_user_id: params.userId,
          removed: result.removed,
          room: result.conversation.room,
          members: result.conversation.members,
        },
      });

      sendSuccess(res, {
        removed: result.removed,
        ...result.conversation,
      });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to remove conversation member');
    }
  };

  const updateTyping = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { roomId: string } }).validatedParams ||
        req.params) as { roomId: string };
      const payload = req.body as TeamMessengerTypingDTO;
      const result = await useCase.setTyping(params.roomId, actor, payload);
      const typingEvent = publishTeamChatTypingState({
        organizationId: actor.organizationId,
        roomId: result.room_id,
        userId: actor.userId,
        participantUserIds: result.participant_user_ids,
        isTyping: result.is_typing,
      });

      sendSuccess(res, typingEvent);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to update typing state');
    }
  };

  const stream = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      if (!isTeamChatRealtimeEnabled()) {
        sendError(
          res,
          'TEAM_CHAT_REALTIME_DISABLED',
          'Team messenger realtime stream is disabled',
          404,
          undefined,
          req.correlationId
        );
        return;
      }

      const query = (req.validatedQuery ?? req.query) as { channels?: string };
      openTeamChatRealtimeStream({
        req,
        res,
        organizationId: actor.organizationId,
        userId: actor.userId,
        channelsRaw: typeof query.channels === 'string' ? query.channels : undefined,
        allowedChannels: ['messages', 'presence', 'typing', 'read', 'members'],
        roomTypes: ['direct', 'group'],
      });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to open team messenger stream');
    }
  };

  return {
    listContacts,
    listConversations,
    getConversation,
    startDirectConversation,
    createGroupConversation,
    updateConversation,
    sendMessage,
    markRead,
    addMember,
    removeMember,
    updateTyping,
    stream,
  };
};

export type TeamMessengerController = ReturnType<typeof createTeamMessengerController>;
