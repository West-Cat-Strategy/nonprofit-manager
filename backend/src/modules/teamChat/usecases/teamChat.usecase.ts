import type {
  TeamChatAddMemberDTO,
  TeamChatInboxItem,
  TeamChatMarkReadDTO,
  TeamChatMember,
  TeamChatMessage,
  TeamChatMessageCreateDTO,
  TeamChatMessageListResult,
  TeamChatMessageQuery,
  TeamChatRoomDetail,
  TeamChatRoomRecord,
  TeamChatUnreadSummary,
} from '../types/contracts';
import type { TeamChatRepositoryPort } from '../types/ports';

export interface TeamChatActor {
  userId: string;
  organizationId: string;
  canManage: boolean;
}

export class TeamChatDomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TeamChatDomainError';
  }
}

interface RoomAccessResult {
  room: TeamChatRoomRecord;
  membership: TeamChatMember | null;
}

const normalizeMentions = (mentionIds: string[] | undefined, senderUserId: string): string[] => {
  if (!mentionIds || mentionIds.length === 0) {
    return [];
  }

  return Array.from(new Set(mentionIds.filter((id) => id && id !== senderUserId)));
};

export class TeamChatUseCase {
  constructor(private readonly repository: TeamChatRepositoryPort) {}

  private async ensureRoomAccess(caseId: string, actor: TeamChatActor): Promise<RoomAccessResult> {
    const caseContext = await this.repository.getCaseContext(caseId, actor.organizationId);

    if (!caseContext) {
      throw new TeamChatDomainError('TEAM_CHAT_CASE_NOT_FOUND', 404, 'Case not found');
    }

    let room = await this.repository.getRoomByCaseId(caseId, actor.organizationId);

    if (!room) {
      room = await this.repository.createRoom({
        caseId,
        organizationId: actor.organizationId,
        createdBy: actor.userId,
      });

      await this.repository.upsertMembership({
        roomId: room.room_id,
        userId: actor.userId,
        membershipRole: 'owner',
        source: 'system',
      });

      if (caseContext.assigned_to && caseContext.assigned_to !== actor.userId) {
        await this.repository.upsertMembership({
          roomId: room.room_id,
          userId: caseContext.assigned_to,
          membershipRole: 'member',
          source: 'case_assignee',
        });
      }
    }

    let membership = await this.repository.getMembership(room.room_id, actor.userId);

    if (!membership && actor.canManage) {
      membership = await this.repository.upsertMembership({
        roomId: room.room_id,
        userId: actor.userId,
        membershipRole: 'observer',
        source: 'system',
      });
    }

    if (!membership) {
      throw new TeamChatDomainError(
        'TEAM_CHAT_MEMBERSHIP_REQUIRED',
        403,
        'Case chat membership required for this action'
      );
    }

    return {
      room,
      membership,
    };
  }

  private async validateCursorMessage(
    roomId: string,
    messageId: string | undefined
  ): Promise<void> {
    if (!messageId) {
      return;
    }

    const cursorMessage = await this.repository.getMessageById(roomId, messageId);
    if (!cursorMessage) {
      throw new TeamChatDomainError(
        'TEAM_CHAT_CURSOR_INVALID',
        400,
        'Cursor message must belong to the requested room'
      );
    }
  }

  async getInbox(actor: TeamChatActor): Promise<TeamChatInboxItem[]> {
    return this.repository.getInbox(actor.organizationId, actor.userId, actor.canManage);
  }

  async getUnreadSummary(actor: TeamChatActor): Promise<TeamChatUnreadSummary> {
    return this.repository.getUnreadSummary(actor.organizationId, actor.userId, actor.canManage);
  }

  async getCaseRoom(caseId: string, actor: TeamChatActor): Promise<TeamChatRoomDetail> {
    const access = await this.ensureRoomAccess(caseId, actor);
    return this.repository.getRoomDetail(access.room.room_id, actor.userId);
  }

  async listMessages(
    caseId: string,
    actor: TeamChatActor,
    query: TeamChatMessageQuery
  ): Promise<TeamChatMessageListResult> {
    const access = await this.ensureRoomAccess(caseId, actor);

    await this.validateCursorMessage(access.room.room_id, query.after_message_id);
    await this.validateCursorMessage(access.room.room_id, query.before_message_id);

    return this.repository.listMessages(access.room.room_id, query);
  }

  async createMessage(
    caseId: string,
    actor: TeamChatActor,
    payload: TeamChatMessageCreateDTO
  ): Promise<{
    room_id: string;
    message: TeamChatMessage;
    room: TeamChatInboxItem;
    participant_user_ids: string[];
  }> {
    const access = await this.ensureRoomAccess(caseId, actor);

    if (payload.parent_message_id) {
      const parentMessage = await this.repository.getMessageById(
        access.room.room_id,
        payload.parent_message_id
      );

      if (!parentMessage) {
        throw new TeamChatDomainError(
          'TEAM_CHAT_PARENT_MESSAGE_INVALID',
          400,
          'Parent message must belong to this room'
        );
      }
    }

    const normalizedMentions = normalizeMentions(payload.mention_user_ids, actor.userId);

    if (normalizedMentions.length > 0) {
      const members = await this.repository.listMembers(access.room.room_id);
      const memberIds = new Set(members.map((member) => member.user_id));
      const invalidMentions = normalizedMentions.filter((id) => !memberIds.has(id));

      if (invalidMentions.length > 0) {
        throw new TeamChatDomainError(
          'TEAM_CHAT_MENTION_INVALID',
          400,
          'Mentioned users must be room members',
          { invalid_user_ids: invalidMentions }
        );
      }
    }

    const message = await this.repository.createMessage({
      roomId: access.room.room_id,
      senderUserId: actor.userId,
      payload: {
        ...payload,
        mention_user_ids: normalizedMentions,
      },
    });

    // Keep sender cursor current so inbox badges stay stable for active sender sessions.
    await this.repository.markRoomRead({
      roomId: access.room.room_id,
      userId: actor.userId,
      messageId: message.id,
    });

    const [room, members] = await Promise.all([
      this.repository.getRoomInboxItem(access.room.room_id, actor.userId),
      this.repository.listMembers(access.room.room_id),
    ]);

    return {
      room_id: access.room.room_id,
      message,
      room,
      participant_user_ids: members.map((member) => member.user_id),
    };
  }

  async markRead(
    caseId: string,
    actor: TeamChatActor,
    payload: TeamChatMarkReadDTO
  ): Promise<{
    room_id: string;
    last_read_at: string;
    last_read_message_id: string | null;
    unread_count: number;
    unread_mentions_count: number;
    room: TeamChatInboxItem;
    participant_user_ids: string[];
  }> {
    const access = await this.ensureRoomAccess(caseId, actor);

    try {
      const cursor = await this.repository.markRoomRead({
        roomId: access.room.room_id,
        userId: actor.userId,
        messageId: payload.message_id,
      });

      const [room, members] = await Promise.all([
        this.repository.getRoomInboxItem(access.room.room_id, actor.userId),
        this.repository.listMembers(access.room.room_id),
      ]);

      return {
        room_id: access.room.room_id,
        last_read_at: cursor.last_read_at,
        last_read_message_id: cursor.last_read_message_id,
        unread_count: room.unread_count,
        unread_mentions_count: room.unread_mentions_count,
        room,
        participant_user_ids: members.map((member) => member.user_id),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';

      if (message.includes('message not found')) {
        throw new TeamChatDomainError(
          'TEAM_CHAT_MESSAGE_NOT_FOUND',
          404,
          'Message not found in this room'
        );
      }

      throw error;
    }
  }

  async listMembers(caseId: string, actor: TeamChatActor): Promise<TeamChatMember[]> {
    const access = await this.ensureRoomAccess(caseId, actor);
    return this.repository.listMembers(access.room.room_id);
  }

  async getCaseStreamContext(
    caseId: string,
    actor: TeamChatActor
  ): Promise<{ room_id: string; participant_user_ids: string[] }> {
    const access = await this.ensureRoomAccess(caseId, actor);
    const members = await this.repository.listMembers(access.room.room_id);
    return {
      room_id: access.room.room_id,
      participant_user_ids: members.map((member) => member.user_id),
    };
  }

  async addMember(
    caseId: string,
    actor: TeamChatActor,
    payload: TeamChatAddMemberDTO
  ): Promise<TeamChatMember[]> {
    const access = await this.ensureRoomAccess(caseId, actor);

    if (!actor.canManage) {
      throw new TeamChatDomainError('TEAM_CHAT_MANAGE_REQUIRED', 403, 'Manage permission required');
    }

    const exists = await this.repository.userExists(payload.user_id);
    if (!exists) {
      throw new TeamChatDomainError('TEAM_CHAT_USER_NOT_FOUND', 404, 'User not found');
    }

    await this.repository.upsertMembership({
      roomId: access.room.room_id,
      userId: payload.user_id,
      membershipRole: payload.membership_role || 'member',
      source: 'manual',
    });

    return this.repository.listMembers(access.room.room_id);
  }

  async removeMember(
    caseId: string,
    actor: TeamChatActor,
    targetUserId: string
  ): Promise<{ removed: boolean; members: TeamChatMember[] }> {
    const access = await this.ensureRoomAccess(caseId, actor);

    if (!actor.canManage) {
      throw new TeamChatDomainError('TEAM_CHAT_MANAGE_REQUIRED', 403, 'Manage permission required');
    }

    const targetMembership = await this.repository.getMembership(access.room.room_id, targetUserId);
    if (!targetMembership) {
      throw new TeamChatDomainError('TEAM_CHAT_MEMBER_NOT_FOUND', 404, 'Member not found in room');
    }

    if (targetMembership.membership_role === 'owner') {
      const ownerCount = await this.repository.countOwners(access.room.room_id);
      if (ownerCount <= 1) {
        throw new TeamChatDomainError(
          'TEAM_CHAT_LAST_OWNER',
          400,
          'Cannot remove the last room owner'
        );
      }
    }

    const removed = await this.repository.removeMembership(access.room.room_id, targetUserId);

    if (!removed) {
      throw new TeamChatDomainError('TEAM_CHAT_MEMBER_NOT_FOUND', 404, 'Member not found in room');
    }

    return {
      removed,
      members: await this.repository.listMembers(access.room.room_id),
    };
  }
}
