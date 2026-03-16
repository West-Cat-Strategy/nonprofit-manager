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
} from '../types/contracts';
import type { TeamChatRepositoryPort } from '../types/ports';
import { TeamChatDomainError, TeamChatUseCase } from '../usecases/teamChat.usecase';

const baseCaseContext: TeamChatCaseContext = {
  case_id: '11111111-1111-1111-1111-111111111111',
  case_number: 'CASE-001',
  case_title: 'Case A',
  assigned_to: null,
};

const baseRoom: TeamChatRoomRecord = {
  room_id: '22222222-2222-2222-2222-222222222222',
  organization_id: '33333333-3333-3333-3333-333333333333',
  room_type: 'case',
  case_id: baseCaseContext.case_id,
  title: null,
  direct_key: null,
  status: 'active',
  created_by: '44444444-4444-4444-4444-444444444444',
  last_message_at: '2026-03-02T00:00:00.000Z',
  last_message_preview: null,
  message_count: 0,
  created_at: '2026-03-02T00:00:00.000Z',
  updated_at: '2026-03-02T00:00:00.000Z',
  case_number: baseCaseContext.case_number,
  case_title: baseCaseContext.case_title,
};

const baseMembership: TeamChatMember = {
  room_id: baseRoom.room_id,
  user_id: '55555555-5555-5555-5555-555555555555',
  membership_role: 'member',
  source: 'manual',
  joined_at: '2026-03-02T00:00:00.000Z',
  last_read_at: null,
  last_read_message_id: null,
  muted: false,
  first_name: 'Alex',
  last_name: 'User',
  email: 'alex@example.com',
};

const baseMessage: TeamChatMessage = {
  id: '66666666-6666-6666-6666-666666666666',
  room_id: baseRoom.room_id,
  sender_user_id: baseMembership.user_id,
  sender_first_name: 'Alex',
  sender_last_name: 'User',
  body: 'Hello',
  parent_message_id: null,
  client_message_id: null,
  metadata: null,
  created_at: '2026-03-02T00:00:00.000Z',
  edited_at: null,
  deleted_at: null,
  mention_user_ids: [],
};

const baseInboxItem: TeamChatInboxItem = {
  room_id: baseRoom.room_id,
  case_id: baseRoom.case_id,
  case_number: baseRoom.case_number,
  case_title: baseRoom.case_title,
  status: 'active',
  last_message_at: baseRoom.last_message_at,
  last_message_preview: null,
  message_count: 0,
  member_count: 1,
  unread_count: 0,
  unread_mentions_count: 0,
};

const baseRoomDetail: TeamChatRoomDetail = {
  room: baseInboxItem,
  members: [baseMembership],
  messages: [baseMessage],
};

const baseMessageListResult: TeamChatMessageListResult = {
  room_id: baseRoom.room_id,
  messages: [baseMessage],
  limit: 50,
};

const baseUnreadSummary: TeamChatUnreadSummary = {
  total_unread_count: 0,
  total_unread_mentions_count: 0,
  rooms_with_unread_count: 0,
};

const createRepositoryMock = (): jest.Mocked<TeamChatRepositoryPort> => ({
  getCaseContext: jest.fn().mockResolvedValue(baseCaseContext),
  getRoomByCaseId: jest.fn().mockResolvedValue(baseRoom),
  createRoom: jest.fn().mockResolvedValue(baseRoom),
  getMembership: jest.fn().mockResolvedValue(baseMembership),
  addMembership: jest.fn().mockResolvedValue(baseMembership),
  upsertMembership: jest.fn().mockResolvedValue(baseMembership),
  listMembers: jest.fn().mockResolvedValue([baseMembership]),
  removeMembership: jest.fn().mockResolvedValue(true),
  countOwners: jest.fn().mockResolvedValue(2),
  userExists: jest.fn().mockResolvedValue(true),
  createMessage: jest.fn().mockResolvedValue(baseMessage),
  listMessages: jest.fn().mockResolvedValue(baseMessageListResult),
  getMessageById: jest.fn().mockResolvedValue(baseMessage),
  markRoomRead: jest.fn().mockResolvedValue({
    last_read_at: baseMessage.created_at,
    last_read_message_id: baseMessage.id,
  }),
  getRoomInboxItem: jest.fn().mockResolvedValue(baseInboxItem),
  getRoomDetail: jest.fn().mockResolvedValue(baseRoomDetail),
  getInbox: jest.fn().mockResolvedValue([baseInboxItem]),
  getUnreadSummary: jest.fn().mockResolvedValue(baseUnreadSummary),
});

describe('TeamChatUseCase', () => {
  it('enforces parent message same-room constraint on message create', async () => {
    const repository = createRepositoryMock();
    repository.getMessageById.mockResolvedValueOnce(null);
    const useCase = new TeamChatUseCase(repository);

    await expect(
      useCase.createMessage(
        baseCaseContext.case_id,
        {
          userId: baseMembership.user_id,
          organizationId: baseRoom.organization_id,
          canManage: false,
        },
        {
          body: 'Reply',
          parent_message_id: '77777777-7777-7777-7777-777777777777',
        }
      )
    ).rejects.toMatchObject<TeamChatDomainError>({
      code: 'TEAM_CHAT_PARENT_MESSAGE_INVALID',
      status: 400,
    });
  });

  it('validates mention targets are room members', async () => {
    const repository = createRepositoryMock();
    repository.listMembers.mockResolvedValue([
      baseMembership,
      {
        ...baseMembership,
        user_id: '88888888-8888-8888-8888-888888888888',
      },
    ]);

    const useCase = new TeamChatUseCase(repository);

    await expect(
      useCase.createMessage(
        baseCaseContext.case_id,
        {
          userId: baseMembership.user_id,
          organizationId: baseRoom.organization_id,
          canManage: false,
        },
        {
          body: 'Ping',
          mention_user_ids: ['99999999-9999-9999-9999-999999999999'],
        }
      )
    ).rejects.toMatchObject<TeamChatDomainError>({
      code: 'TEAM_CHAT_MENTION_INVALID',
      status: 400,
    });
  });

  it('auto-joins manager as observer when accessing room without membership', async () => {
    const repository = createRepositoryMock();
    repository.getMembership.mockResolvedValueOnce(null);
    repository.upsertMembership.mockResolvedValueOnce({
      ...baseMembership,
      membership_role: 'observer',
      source: 'system',
    });

    const useCase = new TeamChatUseCase(repository);

    const detail = await useCase.getCaseRoom(baseCaseContext.case_id, {
      userId: baseMembership.user_id,
      organizationId: baseRoom.organization_id,
      canManage: true,
    });

    expect(repository.upsertMembership).toHaveBeenCalledWith({
      roomId: baseRoom.room_id,
      userId: baseMembership.user_id,
      membershipRole: 'observer',
      source: 'system',
    });
    expect(detail).toEqual(baseRoomDetail);
  });

  it('prevents removing the last owner', async () => {
    const repository = createRepositoryMock();
    const ownerUserId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    repository.getMembership
      .mockResolvedValueOnce(baseMembership)
      .mockResolvedValueOnce({
        ...baseMembership,
        user_id: ownerUserId,
        membership_role: 'owner',
      });
    repository.countOwners.mockResolvedValueOnce(1);

    const useCase = new TeamChatUseCase(repository);

    await expect(
      useCase.removeMember(
        baseCaseContext.case_id,
        {
          userId: baseMembership.user_id,
          organizationId: baseRoom.organization_id,
          canManage: true,
        },
        ownerUserId
      )
    ).rejects.toMatchObject<TeamChatDomainError>({
      code: 'TEAM_CHAT_LAST_OWNER',
      status: 400,
    });
  });

  it('uses manager-scope visibility for inbox and unread summary', async () => {
    const repository = createRepositoryMock();
    const useCase = new TeamChatUseCase(repository);

    await useCase.getInbox({
      userId: baseMembership.user_id,
      organizationId: baseRoom.organization_id,
      canManage: true,
    });

    await useCase.getUnreadSummary({
      userId: baseMembership.user_id,
      organizationId: baseRoom.organization_id,
      canManage: true,
    });

    expect(repository.getInbox).toHaveBeenCalledWith(
      baseRoom.organization_id,
      baseMembership.user_id,
      true
    );

    expect(repository.getUnreadSummary).toHaveBeenCalledWith(
      baseRoom.organization_id,
      baseMembership.user_id,
      true
    );
  });
});
