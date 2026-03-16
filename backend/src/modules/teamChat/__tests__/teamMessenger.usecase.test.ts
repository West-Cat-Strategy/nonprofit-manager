import { describe, expect, it, jest } from '@jest/globals';
import type {
  TeamChatCaseContext,
  TeamChatInboxItem,
  TeamChatMember,
  TeamChatMessage,
  TeamChatMessageListResult,
  TeamChatRoomDetail,
  TeamChatRoomRecord,
  TeamChatUnreadSummary,
  TeamMessengerContact,
  TeamMessengerConversationDetail,
  TeamMessengerConversationSummary,
} from '../types/contracts';
import type {
  TeamChatRepositoryPort,
  TeamMessengerRepositoryPort,
} from '../types/ports';
import { TeamChatDomainError, type TeamChatActor } from '../usecases/teamChat.usecase';
import { TeamMessengerUseCase } from '../usecases/teamMessenger.usecase';

type TeamMessengerRepository = TeamChatRepositoryPort & TeamMessengerRepositoryPort;

const actor: TeamChatActor = {
  userId: '55555555-5555-5555-5555-555555555555',
  organizationId: '33333333-3333-3333-3333-333333333333',
  canManage: false,
};

const directRoom: TeamChatRoomRecord = {
  room_id: '22222222-2222-2222-2222-222222222222',
  organization_id: actor.organizationId,
  room_type: 'direct',
  case_id: null,
  title: null,
  direct_key: `${actor.userId}:88888888-8888-8888-8888-888888888888`,
  status: 'active',
  created_by: actor.userId,
  last_message_at: '2026-03-10T00:00:00.000Z',
  last_message_preview: 'Hello',
  message_count: 1,
  created_at: '2026-03-10T00:00:00.000Z',
  updated_at: '2026-03-10T00:00:00.000Z',
  case_number: null,
  case_title: null,
};

const groupRoom: TeamChatRoomRecord = {
  ...directRoom,
  room_id: '99999999-9999-9999-9999-999999999999',
  room_type: 'group',
  title: 'Intake squad',
  direct_key: null,
};

const actorMembership: TeamChatMember = {
  room_id: directRoom.room_id,
  user_id: actor.userId,
  membership_role: 'member',
  source: 'manual',
  joined_at: '2026-03-10T00:00:00.000Z',
  last_read_at: null,
  last_read_message_id: null,
  muted: false,
  first_name: 'Alex',
  last_name: 'User',
  email: 'alex@example.com',
};

const ownerMembership: TeamChatMember = {
  ...actorMembership,
  room_id: groupRoom.room_id,
  membership_role: 'owner',
};

const otherMember: TeamChatMember = {
  ...actorMembership,
  room_id: groupRoom.room_id,
  user_id: '88888888-8888-8888-8888-888888888888',
  first_name: 'Taylor',
  email: 'taylor@example.com',
};

const thirdMember: TeamChatMember = {
  ...actorMembership,
  room_id: groupRoom.room_id,
  user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  first_name: 'Jordan',
  email: 'jordan@example.com',
};

const baseMessage: TeamChatMessage = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  room_id: directRoom.room_id,
  sender_user_id: otherMember.user_id,
  sender_first_name: otherMember.first_name,
  sender_last_name: otherMember.last_name,
  body: 'Hello',
  parent_message_id: null,
  client_message_id: null,
  metadata: null,
  created_at: '2026-03-10T00:00:00.000Z',
  edited_at: null,
  deleted_at: null,
  mention_user_ids: [],
};

const baseMessageList: TeamChatMessageListResult = {
  room_id: directRoom.room_id,
  messages: [baseMessage],
  limit: 50,
};

const baseConversationSummary: TeamMessengerConversationSummary = {
  room_id: directRoom.room_id,
  room_type: 'direct',
  title: 'Taylor Member',
  status: 'active',
  last_message_at: directRoom.last_message_at,
  last_message_preview: directRoom.last_message_preview,
  message_count: 1,
  member_count: 2,
  unread_count: 0,
  unread_mentions_count: 0,
  counterpart_user_id: otherMember.user_id,
  counterpart_first_name: otherMember.first_name,
  counterpart_last_name: otherMember.last_name,
  counterpart_email: otherMember.email,
};

const baseConversationDetail: TeamMessengerConversationDetail = {
  room: baseConversationSummary,
  members: [actorMembership, otherMember],
  messages: [baseMessage],
};

const baseContact: TeamMessengerContact = {
  user_id: otherMember.user_id,
  first_name: otherMember.first_name,
  last_name: otherMember.last_name,
  email: otherMember.email || 'taylor@example.com',
  role: 'staff',
  presence_status: 'offline',
};

const baseCaseContext: TeamChatCaseContext = {
  case_id: '11111111-1111-1111-1111-111111111111',
  case_number: 'CASE-001',
  case_title: 'Case A',
  assigned_to: null,
};

const baseInboxItem: TeamChatInboxItem = {
  room_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  case_id: baseCaseContext.case_id,
  case_number: baseCaseContext.case_number,
  case_title: baseCaseContext.case_title,
  status: 'active',
  last_message_at: '2026-03-10T00:00:00.000Z',
  last_message_preview: null,
  message_count: 0,
  member_count: 1,
  unread_count: 0,
  unread_mentions_count: 0,
};

const baseRoomDetail: TeamChatRoomDetail = {
  room: baseInboxItem,
  members: [actorMembership],
  messages: [baseMessage],
};

const baseUnreadSummary: TeamChatUnreadSummary = {
  total_unread_count: 0,
  total_unread_mentions_count: 0,
  rooms_with_unread_count: 0,
};

const createRepositoryMock = (): jest.Mocked<TeamMessengerRepository> => ({
  getCaseContext: jest.fn().mockResolvedValue(baseCaseContext),
  getRoomByCaseId: jest.fn().mockResolvedValue(null),
  createRoom: jest.fn().mockResolvedValue(directRoom),
  getMembership: jest.fn().mockResolvedValue(actorMembership),
  addMembership: jest.fn().mockResolvedValue(actorMembership),
  upsertMembership: jest.fn().mockResolvedValue(actorMembership),
  listMembers: jest.fn().mockResolvedValue([actorMembership, otherMember]),
  removeMembership: jest.fn().mockResolvedValue(true),
  countOwners: jest.fn().mockResolvedValue(2),
  userExists: jest.fn().mockResolvedValue(true),
  createMessage: jest.fn().mockResolvedValue(baseMessage),
  listMessages: jest.fn().mockResolvedValue(baseMessageList),
  getMessageById: jest.fn().mockResolvedValue(baseMessage),
  markRoomRead: jest.fn().mockResolvedValue({
    last_read_at: baseMessage.created_at,
    last_read_message_id: baseMessage.id,
  }),
  getRoomInboxItem: jest.fn().mockResolvedValue(baseInboxItem),
  getRoomDetail: jest.fn().mockResolvedValue(baseRoomDetail),
  getInbox: jest.fn().mockResolvedValue([baseInboxItem]),
  getUnreadSummary: jest.fn().mockResolvedValue(baseUnreadSummary),
  getMessengerContactById: jest.fn().mockResolvedValue(baseContact),
  listMessengerContacts: jest.fn().mockResolvedValue([baseContact]),
  getDirectRoomByKey: jest.fn().mockResolvedValue(directRoom),
  createMessengerRoom: jest.fn().mockResolvedValue(directRoom),
  getMessengerRoomById: jest.fn().mockResolvedValue(directRoom),
  listMessengerConversations: jest.fn().mockResolvedValue([baseConversationSummary]),
  getMessengerConversationDetail: jest.fn().mockResolvedValue(baseConversationDetail),
  updateMessengerRoomTitle: jest.fn().mockResolvedValue(groupRoom),
});

describe('TeamMessengerUseCase', () => {
  it('deduplicates direct rooms after a concurrent unique key race', async () => {
    const repository = createRepositoryMock();
    repository.getDirectRoomByKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(directRoom);
    repository.createMessengerRoom.mockRejectedValueOnce({ code: '23505' });

    const useCase = new TeamMessengerUseCase(repository);
    const detail = await useCase.startDirectConversation(actor, {
      participant_user_id: otherMember.user_id,
    });

    expect(repository.createMessengerRoom).toHaveBeenCalledWith({
      organizationId: actor.organizationId,
      createdBy: actor.userId,
      roomType: 'direct',
      directKey: `${actor.userId}:${otherMember.user_id}`,
    });
    expect(repository.upsertMembership).toHaveBeenNthCalledWith(1, {
      roomId: directRoom.room_id,
      userId: actor.userId,
      membershipRole: 'member',
      source: 'manual',
    });
    expect(repository.upsertMembership).toHaveBeenNthCalledWith(2, {
      roomId: directRoom.room_id,
      userId: otherMember.user_id,
      membershipRole: 'member',
      source: 'manual',
    });
    expect(detail).toEqual(baseConversationDetail);
  });

  it('rejects messenger reads for non-participants even if the room exists', async () => {
    const repository = createRepositoryMock();
    repository.getMembership.mockResolvedValueOnce(null);
    const useCase = new TeamMessengerUseCase(repository);

    await expect(useCase.getConversation(directRoom.room_id, actor)).rejects.toMatchObject<TeamChatDomainError>({
      code: 'TEAM_MESSENGER_MEMBERSHIP_REQUIRED',
      status: 403,
    });
  });

  it('requires group owner access for group rename actions', async () => {
    const repository = createRepositoryMock();
    repository.getMessengerRoomById.mockResolvedValueOnce(groupRoom);
    repository.getMembership.mockResolvedValueOnce({
      ...ownerMembership,
      membership_role: 'member',
    });
    repository.listMembers.mockResolvedValueOnce([
      {
        ...ownerMembership,
        membership_role: 'member',
      },
      otherMember,
      thirdMember,
    ]);

    const useCase = new TeamMessengerUseCase(repository);

    await expect(
      useCase.updateConversation(groupRoom.room_id, actor, { title: 'Updated name' })
    ).rejects.toMatchObject<TeamChatDomainError>({
      code: 'TEAM_MESSENGER_OWNER_REQUIRED',
      status: 403,
    });
  });

  it('prevents removing the final owner from a group conversation', async () => {
    const repository = createRepositoryMock();
    repository.getMessengerRoomById.mockResolvedValueOnce(groupRoom);
    repository.getMembership.mockResolvedValueOnce(ownerMembership);
    repository.listMembers.mockResolvedValueOnce([ownerMembership, otherMember, thirdMember]);
    repository.countOwners.mockResolvedValueOnce(1);

    const useCase = new TeamMessengerUseCase(repository);

    await expect(
      useCase.removeMember(groupRoom.room_id, actor, actor.userId)
    ).rejects.toMatchObject<TeamChatDomainError>({
      code: 'TEAM_MESSENGER_LAST_OWNER',
      status: 400,
    });
  });

  it('passes client_message_id through messenger send reconciliation', async () => {
    const repository = createRepositoryMock();
    const useCase = new TeamMessengerUseCase(repository);

    await useCase.sendMessage(directRoom.room_id, actor, {
      body: 'Hello again',
      client_message_id: '12121212-1212-4212-8212-121212121212',
    });

    expect(repository.createMessage).toHaveBeenCalledWith({
      roomId: directRoom.room_id,
      senderUserId: actor.userId,
      payload: {
        body: 'Hello again',
        client_message_id: '12121212-1212-4212-8212-121212121212',
        mention_user_ids: [],
      },
    });
  });
});
