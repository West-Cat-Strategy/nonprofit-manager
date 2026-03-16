import type {
  TeamChatAddMemberDTO,
  TeamChatMarkReadDTO,
  TeamChatMember,
  TeamChatMessage,
  TeamChatMessageCreateDTO,
  TeamMessengerContact,
  TeamMessengerConversationDetail,
  TeamMessengerConversationUpdateDTO,
  TeamMessengerDirectConversationCreateDTO,
  TeamMessengerGroupConversationCreateDTO,
  TeamMessengerTypingDTO,
} from '../types/contracts';
import type {
  TeamChatRepositoryPort,
  TeamMessengerRepositoryPort,
} from '../types/ports';
import { TeamChatDomainError, type TeamChatActor } from './teamChat.usecase';

type TeamMessengerRepository = TeamChatRepositoryPort & TeamMessengerRepositoryPort;

const buildDirectKey = (leftUserId: string, rightUserId: string): string =>
  [leftUserId, rightUserId].sort().join(':');

const normalizeParticipants = (
  participantUserIds: string[],
  actorUserId: string
): string[] =>
  Array.from(
    new Set(
      participantUserIds
        .map((entry) => entry.trim())
        .filter((entry) => entry && entry !== actorUserId)
    )
  );

const normalizeMentions = (mentionIds: string[] | undefined, senderUserId: string): string[] => {
  if (!mentionIds || mentionIds.length === 0) {
    return [];
  }

  return Array.from(new Set(mentionIds.filter((id) => id && id !== senderUserId)));
};

const isUniqueViolation = (error: unknown): boolean =>
  Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23505');

interface MessengerRoomAccess {
  roomId: string;
  roomType: 'direct' | 'group';
  members: TeamChatMember[];
}

export class TeamMessengerUseCase {
  constructor(private readonly repository: TeamMessengerRepository) {}

  private async getEligibleParticipant(
    organizationId: string,
    userId: string
  ): Promise<TeamMessengerContact> {
    const participant = await this.repository.getMessengerContactById(organizationId, userId);

    if (!participant) {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_PARTICIPANT_INVALID',
        404,
        'Participant is not available for team messaging'
      );
    }

    return participant;
  }

  private async assertMessengerRoomAccess(
    roomId: string,
    actor: TeamChatActor
  ): Promise<MessengerRoomAccess> {
    const room = await this.repository.getMessengerRoomById(roomId, actor.organizationId);
    if (!room || room.room_type === 'case') {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_ROOM_NOT_FOUND',
        404,
        'Messenger conversation not found'
      );
    }

    const membership = await this.repository.getMembership(room.room_id, actor.userId);
    if (!membership) {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_MEMBERSHIP_REQUIRED',
        403,
        'Conversation membership required for this action'
      );
    }

    const members = await this.repository.listMembers(room.room_id);
    return {
      roomId: room.room_id,
      roomType: room.room_type,
      members,
    };
  }

  private assertOwnerAccess(members: TeamChatMember[], actorUserId: string): void {
    const actorMembership = members.find((member) => member.user_id === actorUserId);
    if (!actorMembership || actorMembership.membership_role !== 'owner') {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_OWNER_REQUIRED',
        403,
        'Group owner access required'
      );
    }
  }

  async listContacts(actor: TeamChatActor): Promise<TeamMessengerContact[]> {
    return this.repository.listMessengerContacts(actor.organizationId, actor.userId);
  }

  async listConversations(actor: TeamChatActor) {
    return this.repository.listMessengerConversations(actor.organizationId, actor.userId);
  }

  async getConversation(roomId: string, actor: TeamChatActor): Promise<TeamMessengerConversationDetail> {
    await this.assertMessengerRoomAccess(roomId, actor);
    return this.repository.getMessengerConversationDetail(roomId, actor.userId);
  }

  async startDirectConversation(
    actor: TeamChatActor,
    payload: TeamMessengerDirectConversationCreateDTO
  ): Promise<TeamMessengerConversationDetail> {
    if (payload.participant_user_id === actor.userId) {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_SELF_CONVERSATION_INVALID',
        400,
        'You cannot start a direct conversation with yourself'
      );
    }

    await this.getEligibleParticipant(actor.organizationId, payload.participant_user_id);

    const directKey = buildDirectKey(actor.userId, payload.participant_user_id);
    let room = await this.repository.getDirectRoomByKey(actor.organizationId, directKey);

    if (!room) {
      try {
        room = await this.repository.createMessengerRoom({
          organizationId: actor.organizationId,
          createdBy: actor.userId,
          roomType: 'direct',
          directKey,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        room = await this.repository.getDirectRoomByKey(actor.organizationId, directKey);
      }
    }

    if (!room) {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_ROOM_CREATE_FAILED',
        500,
        'Failed to create direct conversation'
      );
    }

    await this.repository.upsertMembership({
      roomId: room.room_id,
      userId: actor.userId,
      membershipRole: 'member',
      source: 'manual',
    });
    await this.repository.upsertMembership({
      roomId: room.room_id,
      userId: payload.participant_user_id,
      membershipRole: 'member',
      source: 'manual',
    });

    return this.repository.getMessengerConversationDetail(room.room_id, actor.userId);
  }

  async createGroupConversation(
    actor: TeamChatActor,
    payload: TeamMessengerGroupConversationCreateDTO
  ): Promise<TeamMessengerConversationDetail> {
    const participants = normalizeParticipants(payload.participant_user_ids, actor.userId);
    if (participants.length < 2) {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_GROUP_PARTICIPANTS_INVALID',
        400,
        'Group conversations require at least two other participants'
      );
    }

    for (const participantUserId of participants) {
      await this.getEligibleParticipant(actor.organizationId, participantUserId);
    }

    const room = await this.repository.createMessengerRoom({
      organizationId: actor.organizationId,
      createdBy: actor.userId,
      roomType: 'group',
      title: payload.title.trim(),
    });

    await this.repository.upsertMembership({
      roomId: room.room_id,
      userId: actor.userId,
      membershipRole: 'owner',
      source: 'manual',
    });

    for (const participantUserId of participants) {
      await this.repository.upsertMembership({
        roomId: room.room_id,
        userId: participantUserId,
        membershipRole: 'member',
        source: 'manual',
      });
    }

    return this.repository.getMessengerConversationDetail(room.room_id, actor.userId);
  }

  async updateConversation(
    roomId: string,
    actor: TeamChatActor,
    payload: TeamMessengerConversationUpdateDTO
  ): Promise<TeamMessengerConversationDetail> {
    const access = await this.assertMessengerRoomAccess(roomId, actor);
    if (access.roomType !== 'group') {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_ROOM_UPDATE_UNSUPPORTED',
        400,
        'Only group conversations can be renamed'
      );
    }

    this.assertOwnerAccess(access.members, actor.userId);
    await this.repository.updateMessengerRoomTitle(roomId, payload.title.trim());
    return this.repository.getMessengerConversationDetail(roomId, actor.userId);
  }

  async sendMessage(
    roomId: string,
    actor: TeamChatActor,
    payload: TeamChatMessageCreateDTO
  ): Promise<{
    room_id: string;
    message: TeamChatMessage;
    conversation: TeamMessengerConversationDetail;
    participant_user_ids: string[];
  }> {
    const access = await this.assertMessengerRoomAccess(roomId, actor);

    if (payload.parent_message_id) {
      const parentMessage = await this.repository.getMessageById(roomId, payload.parent_message_id);
      if (!parentMessage) {
        throw new TeamChatDomainError(
          'TEAM_MESSENGER_PARENT_MESSAGE_INVALID',
          400,
          'Parent message must belong to this conversation'
        );
      }
    }

    const normalizedMentions = normalizeMentions(payload.mention_user_ids, actor.userId);
    if (normalizedMentions.length > 0) {
      const memberIds = new Set(access.members.map((member) => member.user_id));
      const invalidMentions = normalizedMentions.filter((id) => !memberIds.has(id));

      if (invalidMentions.length > 0) {
        throw new TeamChatDomainError(
          'TEAM_MESSENGER_MENTION_INVALID',
          400,
          'Mentioned users must be conversation members',
          { invalid_user_ids: invalidMentions }
        );
      }
    }

    const message = await this.repository.createMessage({
      roomId,
      senderUserId: actor.userId,
      payload: {
        ...payload,
        mention_user_ids: normalizedMentions,
      },
    });

    await this.repository.markRoomRead({
      roomId,
      userId: actor.userId,
      messageId: message.id,
    });

    const conversation = await this.repository.getMessengerConversationDetail(roomId, actor.userId);

    return {
      room_id: roomId,
      message,
      conversation,
      participant_user_ids: access.members.map((member) => member.user_id),
    };
  }

  async markRead(
    roomId: string,
    actor: TeamChatActor,
    payload: TeamChatMarkReadDTO
  ): Promise<{
    room_id: string;
    last_read_at: string;
    last_read_message_id: string | null;
    unread_count: number;
    unread_mentions_count: number;
    conversation: TeamMessengerConversationDetail;
    participant_user_ids: string[];
  }> {
    const access = await this.assertMessengerRoomAccess(roomId, actor);
    const cursor = await this.repository.markRoomRead({
      roomId,
      userId: actor.userId,
      messageId: payload.message_id,
    });
    const conversation = await this.repository.getMessengerConversationDetail(roomId, actor.userId);

    return {
      room_id: roomId,
      last_read_at: cursor.last_read_at,
      last_read_message_id: cursor.last_read_message_id,
      unread_count: conversation.room.unread_count,
      unread_mentions_count: conversation.room.unread_mentions_count,
      conversation,
      participant_user_ids: access.members.map((member) => member.user_id),
    };
  }

  async addMember(
    roomId: string,
    actor: TeamChatActor,
    payload: TeamChatAddMemberDTO
  ): Promise<{
    conversation: TeamMessengerConversationDetail;
    participant_user_ids: string[];
  }> {
    const access = await this.assertMessengerRoomAccess(roomId, actor);
    if (access.roomType !== 'group') {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_ROOM_UPDATE_UNSUPPORTED',
        400,
        'Only group conversations can be updated'
      );
    }

    this.assertOwnerAccess(access.members, actor.userId);
    await this.getEligibleParticipant(actor.organizationId, payload.user_id);

    await this.repository.upsertMembership({
      roomId,
      userId: payload.user_id,
      membershipRole: payload.membership_role || 'member',
      source: 'manual',
    });

    const conversation = await this.repository.getMessengerConversationDetail(roomId, actor.userId);
    return {
      participant_user_ids: conversation.members.map((member) => member.user_id),
      conversation,
    };
  }

  async removeMember(
    roomId: string,
    actor: TeamChatActor,
    targetUserId: string
  ): Promise<{
    removed: boolean;
    conversation: TeamMessengerConversationDetail;
    participant_user_ids: string[];
  }> {
    const access = await this.assertMessengerRoomAccess(roomId, actor);
    if (access.roomType !== 'group') {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_ROOM_UPDATE_UNSUPPORTED',
        400,
        'Only group conversations can be updated'
      );
    }

    this.assertOwnerAccess(access.members, actor.userId);

    const targetMembership = access.members.find((member) => member.user_id === targetUserId);
    if (!targetMembership) {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_MEMBER_NOT_FOUND',
        404,
        'Member not found in conversation'
      );
    }

    if (targetMembership.membership_role === 'owner') {
      const ownerCount = await this.repository.countOwners(roomId);
      if (ownerCount <= 1) {
        throw new TeamChatDomainError(
          'TEAM_MESSENGER_LAST_OWNER',
          400,
          'Cannot remove the last group owner'
        );
      }
    }

    const removed = await this.repository.removeMembership(roomId, targetUserId);
    if (!removed) {
      throw new TeamChatDomainError(
        'TEAM_MESSENGER_MEMBER_NOT_FOUND',
        404,
        'Member not found in conversation'
      );
    }

    const conversation = await this.repository.getMessengerConversationDetail(roomId, actor.userId);
    return {
      removed,
      participant_user_ids: conversation.members.map((member) => member.user_id),
      conversation,
    };
  }

  async setTyping(
    roomId: string,
    actor: TeamChatActor,
    payload: TeamMessengerTypingDTO
  ): Promise<{ room_id: string; participant_user_ids: string[]; is_typing: boolean }> {
    const access = await this.assertMessengerRoomAccess(roomId, actor);
    return {
      room_id: roomId,
      participant_user_ids: access.members.map((member) => member.user_id),
      is_typing: payload.is_typing,
    };
  }
}
