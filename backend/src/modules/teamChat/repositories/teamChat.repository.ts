import type { Pool } from 'pg';
import pool from '@config/database';
import type {
  TeamChatCaseContext,
  TeamChatInboxItem,
  TeamChatMember,
  TeamChatMessage,
  TeamChatMessageCreateDTO,
  TeamChatMessageListResult,
  TeamChatMessageQuery,
  TeamChatRoomDetail,
  TeamChatRoomRecord,
  TeamChatUnreadSummary,
  TeamMessengerContact,
  TeamMessengerConversationDetail,
  TeamMessengerConversationSummary,
} from '../types/contracts';
import type { TeamChatRepositoryPort, TeamMessengerRepositoryPort } from '../types/ports';

import { TeamChatQueryRepository } from './teamChat.repository.query';
import { TeamChatCommandRepository } from './teamChat.repository.command';
import { TeamChatValidationRepository } from './teamChat.repository.validation';

export class TeamChatRepository implements TeamChatRepositoryPort, TeamMessengerRepositoryPort {
  private readonly queryRepository: TeamChatQueryRepository;
  private readonly commandRepository: TeamChatCommandRepository;
  private readonly validationRepository: TeamChatValidationRepository;

  constructor(private readonly db: Pool = pool) {
    this.validationRepository = new TeamChatValidationRepository();
    this.queryRepository = new TeamChatQueryRepository(this.db);
    this.commandRepository = new TeamChatCommandRepository(this.db, this.queryRepository, this.validationRepository);
  }

  getCaseContext(caseId: string, organizationId: string): Promise<TeamChatCaseContext | null> {
    return this.queryRepository.getCaseContext(caseId, organizationId);
  }

  getRoomByCaseId(caseId: string, organizationId: string): Promise<TeamChatRoomRecord | null> {
    return this.queryRepository.getRoomByCaseId(caseId, organizationId);
  }

  createRoom(input: {
    caseId: string;
    organizationId: string;
    createdBy: string;
  }): Promise<TeamChatRoomRecord> {
    return this.commandRepository.createRoom(input);
  }

  getMembership(roomId: string, userId: string): Promise<TeamChatMember | null> {
    return this.queryRepository.getMembership(roomId, userId);
  }

  addMembership(input: {
    roomId: string;
    userId: string;
    membershipRole: TeamChatMember['membership_role'];
    source: TeamChatMember['source'];
  }): Promise<TeamChatMember> {
    return this.commandRepository.addMembership(input);
  }

  upsertMembership(input: {
    roomId: string;
    userId: string;
    membershipRole: TeamChatMember['membership_role'];
    source: TeamChatMember['source'];
  }): Promise<TeamChatMember> {
    return this.commandRepository.upsertMembership(input);
  }

  listMembers(roomId: string): Promise<TeamChatMember[]> {
    return this.queryRepository.listMembers(roomId);
  }

  removeMembership(roomId: string, userId: string): Promise<boolean> {
    return this.commandRepository.removeMembership(roomId, userId);
  }

  countOwners(roomId: string): Promise<number> {
    return this.queryRepository.countOwners(roomId);
  }

  userExists(userId: string): Promise<boolean> {
    return this.queryRepository.userExists(userId);
  }

  getMessengerContactById(
    organizationId: string,
    userId: string
  ): Promise<TeamMessengerContact | null> {
    return this.queryRepository.getMessengerContactById(organizationId, userId);
  }

  listMessengerContacts(
    organizationId: string,
    viewerUserId: string
  ): Promise<TeamMessengerContact[]> {
    return this.queryRepository.listMessengerContacts(organizationId, viewerUserId);
  }

  getDirectRoomByKey(organizationId: string, directKey: string): Promise<TeamChatRoomRecord | null> {
    return this.queryRepository.getDirectRoomByKey(organizationId, directKey);
  }

  createMessengerRoom(input: {
    organizationId: string;
    createdBy: string;
    roomType: 'direct' | 'group';
    title?: string | null;
    directKey?: string | null;
  }): Promise<TeamChatRoomRecord> {
    return this.commandRepository.createMessengerRoom(input);
  }

  getMessengerRoomById(
    roomId: string,
    organizationId: string
  ): Promise<TeamChatRoomRecord | null> {
    return this.queryRepository.getMessengerRoomById(roomId, organizationId);
  }

  listMessengerConversations(
    organizationId: string,
    userId: string
  ): Promise<TeamMessengerConversationSummary[]> {
    return this.queryRepository.listMessengerConversations(organizationId, userId);
  }

  getMessengerConversationDetail(
    roomId: string,
    userId: string
  ): Promise<TeamMessengerConversationDetail> {
    return this.queryRepository.getMessengerConversationDetail(roomId, userId);
  }

  updateMessengerRoomTitle(roomId: string, title: string): Promise<TeamChatRoomRecord> {
    return this.commandRepository.updateMessengerRoomTitle(roomId, title);
  }

  createMessage(input: {
    roomId: string;
    senderUserId: string;
    payload: TeamChatMessageCreateDTO;
  }): Promise<TeamChatMessage> {
    return this.commandRepository.createMessage(input);
  }

  listMessages(roomId: string, query: TeamChatMessageQuery): Promise<TeamChatMessageListResult> {
    return this.queryRepository.listMessages(roomId, query);
  }

  getMessageById(roomId: string, messageId: string): Promise<TeamChatMessage | null> {
    return this.queryRepository.getMessageById(roomId, messageId);
  }

  markRoomRead(input: {
    roomId: string;
    userId: string;
    messageId?: string;
  }): Promise<{ last_read_at: string; last_read_message_id: string | null }> {
    return this.commandRepository.markRoomRead(input);
  }

  getRoomInboxItem(roomId: string, userId: string): Promise<TeamChatInboxItem> {
    return this.queryRepository.getRoomInboxItem(roomId, userId);
  }

  getRoomDetail(roomId: string, userId: string): Promise<TeamChatRoomDetail> {
    return this.queryRepository.getRoomDetail(roomId, userId);
  }

  getInbox(
    organizationId: string,
    userId: string,
    includeAllRooms: boolean
  ): Promise<TeamChatInboxItem[]> {
    return this.queryRepository.getInbox(organizationId, userId, includeAllRooms);
  }

  getUnreadSummary(
    organizationId: string,
    userId: string,
    includeAllRooms: boolean
  ): Promise<TeamChatUnreadSummary> {
    return this.queryRepository.getUnreadSummary(organizationId, userId, includeAllRooms);
  }
}
