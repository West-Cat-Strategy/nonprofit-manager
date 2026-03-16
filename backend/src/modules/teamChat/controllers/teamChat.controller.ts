import type { Response } from 'express';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import { hasStaticPermissionAccess } from '@services/authorization';
import {
  isTeamChatRealtimeEnabled,
  openTeamChatRealtimeStream,
  publishTeamChatRoomEvent,
} from '@services/teamChatRealtimeService';
import { Permission } from '@utils/permissions';
import type {
  TeamChatAddMemberDTO,
  TeamChatMarkReadDTO,
  TeamChatMessageCreateDTO,
  TeamChatMessageQuery,
} from '../types/contracts';
import { TeamChatEventName } from '../types/events';
import { TeamChatDomainError, TeamChatUseCase, type TeamChatActor } from '../usecases/teamChat.usecase';

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
    canManage: hasStaticPermissionAccess(
      req.user?.role || '',
      Permission.TEAM_CHAT_MANAGE,
      req.authorizationContext?.roles
    ),
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
      sendError(res, 'TEAM_CHAT_NOT_FOUND', error.message, 404, undefined, req.correlationId);
      return;
    }

    if (normalized.includes('invalid') || normalized.includes('must')) {
      sendError(
        res,
        'TEAM_CHAT_VALIDATION_ERROR',
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
    'TEAM_CHAT_ERROR',
    fallbackMessage,
    500,
    undefined,
    req.correlationId
  );
};

export const createTeamChatController = (useCase: TeamChatUseCase) => {
  const getInbox = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const inbox = await useCase.getInbox(actor);
      sendSuccess(res, {
        rooms: inbox,
      });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to fetch team chat inbox');
    }
  };

  const getUnreadSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const summary = await useCase.getUnreadSummary(actor);
      sendSuccess(res, summary);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to fetch unread summary');
    }
  };

  const getCaseRoom = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { caseId: string } }).validatedParams ||
        req.params) as { caseId: string };

      const roomDetail = await useCase.getCaseRoom(params.caseId, actor);
      sendSuccess(res, roomDetail);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to fetch case room');
    }
  };

  const listMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { caseId: string } }).validatedParams ||
        req.params) as { caseId: string };

      const query = ((req as unknown as { validatedQuery?: TeamChatMessageQuery }).validatedQuery ||
        req.query) as TeamChatMessageQuery;

      const messages = await useCase.listMessages(params.caseId, actor, query);
      sendSuccess(res, messages);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to fetch messages');
    }
  };

  const createMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { caseId: string } }).validatedParams ||
        req.params) as { caseId: string };

      const payload = req.body as TeamChatMessageCreateDTO;
      const result = await useCase.createMessage(params.caseId, actor, payload);

      publishTeamChatRoomEvent({
        organizationId: actor.organizationId,
        participantUserIds: result.participant_user_ids,
        roomId: result.room_id,
        roomType: 'case',
        eventName: TeamChatEventName.MESSAGE_CREATED,
        payload: {
          room_id: result.room_id,
          room_type: 'case',
          actor_user_id: actor.userId,
          client_message_id: result.message.client_message_id,
          message: result.message,
          room: result.room,
        },
      });

      logger.info('Team chat message created', {
        action: TeamChatEventName.MESSAGE_CREATED,
        caseId: params.caseId,
        roomId: result.room_id,
        messageId: result.message.id,
        actorUserId: actor.userId,
        organizationId: actor.organizationId,
        parentMessageId: payload.parent_message_id || null,
        mentionCount: payload.mention_user_ids?.length || 0,
        requestId: req.correlationId,
      });

      sendSuccess(
        res,
        {
          room_id: result.room_id,
          room: result.room,
          message: result.message,
        },
        201
      );
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to send message');
    }
  };

  const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { caseId: string } }).validatedParams ||
        req.params) as { caseId: string };

      const payload = req.body as TeamChatMarkReadDTO;
      const result = await useCase.markRead(params.caseId, actor, payload);

      publishTeamChatRoomEvent({
        organizationId: actor.organizationId,
        participantUserIds: result.participant_user_ids,
        roomId: result.room_id,
        roomType: 'case',
        eventName: TeamChatEventName.ROOM_READ,
        payload: {
          room_id: result.room_id,
          room_type: 'case',
          actor_user_id: actor.userId,
          last_read_at: result.last_read_at,
          last_read_message_id: result.last_read_message_id,
          room: result.room,
        },
      });

      logger.info('Team chat read cursor updated', {
        action: TeamChatEventName.ROOM_READ,
        caseId: params.caseId,
        roomId: result.room_id,
        actorUserId: actor.userId,
        organizationId: actor.organizationId,
        requestedMessageId: payload.message_id || null,
        lastReadMessageId: result.last_read_message_id,
        unreadCount: result.unread_count,
        unreadMentionsCount: result.unread_mentions_count,
        requestId: req.correlationId,
      });

      sendSuccess(res, {
        room_id: result.room_id,
        room: result.room,
        last_read_at: result.last_read_at,
        last_read_message_id: result.last_read_message_id,
        unread_count: result.unread_count,
        unread_mentions_count: result.unread_mentions_count,
      });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to mark room read');
    }
  };

  const listMembers = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { caseId: string } }).validatedParams ||
        req.params) as { caseId: string };

      const members = await useCase.listMembers(params.caseId, actor);
      sendSuccess(res, {
        members,
      });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to fetch room members');
    }
  };

  const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { caseId: string } }).validatedParams ||
        req.params) as { caseId: string };

      const payload = req.body as TeamChatAddMemberDTO;
      const members = await useCase.addMember(params.caseId, actor, payload);
      const addedMember = members.find((member) => member.user_id === payload.user_id);

      logger.info('Team chat member added', {
        action: TeamChatEventName.MEMBER_ADDED,
        caseId: params.caseId,
        roomId: addedMember?.room_id || null,
        actorUserId: actor.userId,
        targetUserId: payload.user_id,
        membershipRole: addedMember?.membership_role || payload.membership_role || 'member',
        memberCount: members.length,
        organizationId: actor.organizationId,
        requestId: req.correlationId,
      });

      if (addedMember?.room_id) {
        publishTeamChatRoomEvent({
          organizationId: actor.organizationId,
          participantUserIds: members.map((member) => member.user_id),
          roomId: addedMember.room_id,
          roomType: 'case',
          eventName: TeamChatEventName.MEMBER_ADDED,
          payload: {
            room_id: addedMember.room_id,
            room_type: 'case',
            actor_user_id: actor.userId,
            target_user_id: payload.user_id,
            members,
          },
        });
      }

      sendSuccess(res, {
        members,
      });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to add room member');
    }
  };

  const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
    const actor = buildActor(req, res);
    if (!actor) return;

    try {
      const params = ((req as unknown as { validatedParams?: { caseId: string; userId: string } })
        .validatedParams || req.params) as {
        caseId: string;
        userId: string;
      };

      const result = await useCase.removeMember(params.caseId, actor, params.userId);

      logger.info('Team chat member removed', {
        action: TeamChatEventName.MEMBER_REMOVED,
        caseId: params.caseId,
        roomId: result.members[0]?.room_id || null,
        actorUserId: actor.userId,
        targetUserId: params.userId,
        removed: result.removed,
        memberCount: result.members.length,
        organizationId: actor.organizationId,
        requestId: req.correlationId,
      });

      const roomId = result.members[0]?.room_id || null;
      if (roomId) {
        publishTeamChatRoomEvent({
          organizationId: actor.organizationId,
          participantUserIds: result.members.map((member) => member.user_id),
          roomId,
          roomType: 'case',
          eventName: TeamChatEventName.MEMBER_REMOVED,
          payload: {
            room_id: roomId,
            room_type: 'case',
            actor_user_id: actor.userId,
            target_user_id: params.userId,
            removed: result.removed,
            members: result.members,
          },
        });
      }

      sendSuccess(res, result);
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to remove room member');
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
          'Case chat realtime stream is disabled',
          404,
          undefined,
          req.correlationId
        );
        return;
      }

      const params = ((req as unknown as { validatedParams?: { caseId: string } }).validatedParams ||
        req.params) as { caseId: string };
      const query = (req.validatedQuery ?? req.query) as { channels?: string };
      const streamContext = await useCase.getCaseStreamContext(params.caseId, actor);

      openTeamChatRealtimeStream({
        req,
        res,
        organizationId: actor.organizationId,
        userId: actor.userId,
        channelsRaw: typeof query.channels === 'string' ? query.channels : undefined,
        allowedChannels: ['messages', 'read', 'members'],
        roomTypes: ['case'],
        roomIds: [streamContext.room_id],
      });
    } catch (error) {
      handleControllerError(req, res, error, 'Failed to open case chat stream');
    }
  };

  return {
    getInbox,
    getUnreadSummary,
    getCaseRoom,
    listMessages,
    createMessage,
    stream,
    markRead,
    listMembers,
    addMember,
    removeMember,
  };
};

export type TeamChatController = ReturnType<typeof createTeamChatController>;
