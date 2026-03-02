import type {
  TeamChatCaseContext,
  TeamChatInboxItem,
  TeamChatMember,
  TeamChatMembershipRole,
  TeamChatMembershipSource,
  TeamChatMessage,
  TeamChatMessageCreateDTO,
  TeamChatMessageListResult,
  TeamChatMessageQuery,
  TeamChatRoomDetail,
  TeamChatRoomRecord,
  TeamChatUnreadSummary,
} from './contracts';

export interface TeamChatRepositoryPort {
  getCaseContext(caseId: string, organizationId: string): Promise<TeamChatCaseContext | null>;
  getRoomByCaseId(caseId: string, organizationId: string): Promise<TeamChatRoomRecord | null>;
  createRoom(input: {
    caseId: string;
    organizationId: string;
    createdBy: string;
  }): Promise<TeamChatRoomRecord>;
  getMembership(roomId: string, userId: string): Promise<TeamChatMember | null>;
  addMembership(input: {
    roomId: string;
    userId: string;
    membershipRole: TeamChatMembershipRole;
    source: TeamChatMembershipSource;
  }): Promise<TeamChatMember>;
  upsertMembership(input: {
    roomId: string;
    userId: string;
    membershipRole: TeamChatMembershipRole;
    source: TeamChatMembershipSource;
  }): Promise<TeamChatMember>;
  listMembers(roomId: string): Promise<TeamChatMember[]>;
  removeMembership(roomId: string, userId: string): Promise<boolean>;
  countOwners(roomId: string): Promise<number>;
  userExists(userId: string): Promise<boolean>;
  createMessage(input: {
    roomId: string;
    senderUserId: string;
    payload: TeamChatMessageCreateDTO;
  }): Promise<TeamChatMessage>;
  listMessages(roomId: string, query: TeamChatMessageQuery): Promise<TeamChatMessageListResult>;
  getMessageById(roomId: string, messageId: string): Promise<TeamChatMessage | null>;
  markRoomRead(input: {
    roomId: string;
    userId: string;
    messageId?: string;
  }): Promise<{ last_read_at: string; last_read_message_id: string | null }>;
  getRoomInboxItem(roomId: string, userId: string): Promise<TeamChatInboxItem>;
  getRoomDetail(roomId: string, userId: string): Promise<TeamChatRoomDetail>;
  getInbox(organizationId: string, userId: string, includeAllRooms: boolean): Promise<TeamChatInboxItem[]>;
  getUnreadSummary(
    organizationId: string,
    userId: string,
    includeAllRooms: boolean
  ): Promise<TeamChatUnreadSummary>;
}
