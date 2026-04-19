import type { Pool } from 'pg';

import type {
  TeamChatMessageCreateDTO,
  TeamChatMessage,
  TeamChatMember,
  TeamChatRoomRecord,
} from '../types/contracts';
import { isUniqueViolation, mapRoomRecord } from './teamChat.repository.shared';
import { TeamChatQueryRepository } from './teamChat.repository.query';
import { TeamChatValidationRepository } from './teamChat.repository.validation';

export class TeamChatCommandRepository {
  constructor(
    private readonly db: Pool,
    private readonly queries: TeamChatQueryRepository,
    private readonly validation: TeamChatValidationRepository
  ) {}

  async createRoom(input: {
    caseId: string;
    organizationId: string;
    createdBy: string;
  }): Promise<TeamChatRoomRecord> {
    const result = await this.db.query(
      `WITH upserted AS (
         INSERT INTO team_chat_rooms (
           organization_id,
           case_id,
           room_type,
           created_by,
           status
         )
         VALUES ($1, $2, 'case', $3, 'active')
         ON CONFLICT (organization_id, case_id)
         DO UPDATE SET updated_at = CURRENT_TIMESTAMP
         RETURNING *
       )
       SELECT
         r.id AS room_id,
         r.organization_id,
         r.room_type,
         r.case_id,
         r.title,
         r.direct_key,
         r.status,
         r.created_by,
         r.last_message_at,
         r.last_message_preview,
         r.message_count,
         r.created_at,
         r.updated_at,
         c.case_number,
         c.title AS case_title
       FROM upserted r
       INNER JOIN cases c ON c.id = r.case_id`,
      [input.organizationId, input.caseId, input.createdBy]
    );

    return mapRoomRecord(result.rows[0]);
  }

  async addMembership(input: {
    roomId: string;
    userId: string;
    membershipRole: TeamChatMember['membership_role'];
    source: TeamChatMember['source'];
  }): Promise<TeamChatMember> {
    await this.db.query(
      `INSERT INTO team_chat_members (
         room_id,
         user_id,
         membership_role,
         source
       )
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [input.roomId, input.userId, input.membershipRole, input.source]
    );

    const membership = await this.queries.getMembership(input.roomId, input.userId);
    if (!membership) {
      throw new Error('Failed to create team chat membership');
    }

    return membership;
  }

  async upsertMembership(input: {
    roomId: string;
    userId: string;
    membershipRole: TeamChatMember['membership_role'];
    source: TeamChatMember['source'];
  }): Promise<TeamChatMember> {
    const result = await this.db.query(
      `INSERT INTO team_chat_members (
         room_id,
         user_id,
         membership_role,
         source
       )
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_id, user_id)
       DO UPDATE SET
         membership_role = EXCLUDED.membership_role,
         source = EXCLUDED.source
       RETURNING room_id, user_id`,
      [input.roomId, input.userId, input.membershipRole, input.source]
    );

    const row = result.rows[0] as { room_id: string; user_id: string } | undefined;
    const roomId = row?.room_id || input.roomId;
    const userId = row?.user_id || input.userId;

    const membership = await this.queries.getMembership(roomId, userId);
    if (!membership) {
      throw new Error('Failed to upsert team chat membership');
    }

    return membership;
  }

  async removeMembership(roomId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM team_chat_members
       WHERE room_id = $1
         AND user_id = $2`,
      [roomId, userId]
    );

    return (result.rowCount || 0) > 0;
  }

  async createMessengerRoom(input: {
    organizationId: string;
    createdBy: string;
    roomType: 'direct' | 'group';
    title?: string | null;
    directKey?: string | null;
  }): Promise<TeamChatRoomRecord> {
    const result = await this.db.query(
      `INSERT INTO team_chat_rooms (
         organization_id,
         case_id,
         room_type,
         title,
         direct_key,
         created_by,
         status
       )
       VALUES ($1, NULL, $2, $3, $4, $5, 'active')
       RETURNING
         id AS room_id,
         organization_id,
         room_type,
         case_id,
         title,
         direct_key,
         status,
         created_by,
         last_message_at,
         last_message_preview,
         message_count,
         created_at,
         updated_at`,
      [
        input.organizationId,
        input.roomType,
        input.title?.trim() || null,
        input.directKey || null,
        input.createdBy,
      ]
    );

    return mapRoomRecord(result.rows[0]);
  }

  async updateMessengerRoomTitle(roomId: string, title: string): Promise<TeamChatRoomRecord> {
    const result = await this.db.query(
      `UPDATE team_chat_rooms
       SET title = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING
         id AS room_id,
         organization_id,
         room_type,
         case_id,
         title,
         direct_key,
         status,
         created_by,
         last_message_at,
         last_message_preview,
         message_count,
         created_at,
         updated_at`,
      [roomId, this.validation.normalizeRoomTitle(title)]
    );

    if (!result.rows[0]) {
      throw new Error('Messenger conversation not found');
    }

    return mapRoomRecord(result.rows[0]);
  }

  async createMessage(input: {
    roomId: string;
    senderUserId: string;
    payload: TeamChatMessageCreateDTO;
  }): Promise<TeamChatMessage> {
    const trimmedBody = this.validation.validateMessageBody(input.payload.body);
    const clientMessageId = this.validation.normalizeClientMessageId(input.payload.client_message_id);
    const dedupedMentions = this.validation.dedupeMentionUserIds(
      input.payload.mention_user_ids,
      input.senderUserId
    );

    if (clientMessageId) {
      const existing = await this.queries.getMessageByClientMessageId({
        roomId: input.roomId,
        senderUserId: input.senderUserId,
        clientMessageId,
      });

      if (existing) {
        return existing;
      }
    }

    let messageId: string;

    try {
      const result = await this.db.query(
        `INSERT INTO team_chat_messages (
           room_id,
           sender_user_id,
           body,
           parent_message_id,
           client_message_id,
           metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          input.roomId,
          input.senderUserId,
          trimmedBody,
          input.payload.parent_message_id || null,
          clientMessageId,
          input.payload.parent_message_id ? { parent_message_id: input.payload.parent_message_id } : null,
        ]
      );

      messageId = String(result.rows[0].id);
    } catch (error) {
      if (!clientMessageId || !isUniqueViolation(error)) {
        throw error;
      }

      const existing = await this.queries.getMessageByClientMessageId({
        roomId: input.roomId,
        senderUserId: input.senderUserId,
        clientMessageId,
      });

      if (existing) {
        return existing;
      }

      throw error;
    }

    if (dedupedMentions.length > 0) {
      await this.db.query(
        `INSERT INTO team_chat_message_mentions (message_id, mentioned_user_id)
         SELECT $1, UNNEST($2::uuid[])
         ON CONFLICT (message_id, mentioned_user_id) DO NOTHING`,
        [messageId, dedupedMentions]
      );
    }

    const created = await this.queries.getMessageById(input.roomId, messageId);
    if (!created) {
      throw new Error('Failed to load created team chat message');
    }

    return created;
  }

  async markRoomRead(input: {
    roomId: string;
    userId: string;
    messageId?: string;
  }): Promise<{ last_read_at: string; last_read_message_id: string | null }> {
    let resolvedMessageId: string | null = null;
    let resolvedReadAt: string;

    if (input.messageId) {
      const message = await this.queries.getMessageById(input.roomId, input.messageId);
      if (!message) {
        throw new Error('Message not found in room');
      }
      resolvedMessageId = message.id;
      resolvedReadAt = message.created_at;
    } else {
      const latestResult = await this.db.query(
        `SELECT id, created_at
         FROM team_chat_messages
         WHERE room_id = $1
           AND deleted_at IS NULL
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [input.roomId]
      );

      const latest = latestResult.rows[0] as { id: string; created_at: string } | undefined;
      if (latest) {
        resolvedMessageId = latest.id;
        resolvedReadAt = latest.created_at;
      } else {
        resolvedReadAt = new Date().toISOString();
      }
    }

    const updateResult = await this.db.query(
      `UPDATE team_chat_members
       SET
         last_read_at = $3,
         last_read_message_id = $4
       WHERE room_id = $1
         AND user_id = $2
       RETURNING last_read_at, last_read_message_id`,
      [input.roomId, input.userId, resolvedReadAt, resolvedMessageId]
    );

    if (!updateResult.rows[0]) {
      throw new Error('Membership not found for mark-read operation');
    }

    return {
      last_read_at: String(updateResult.rows[0].last_read_at),
      last_read_message_id: updateResult.rows[0].last_read_message_id
        ? String(updateResult.rows[0].last_read_message_id)
        : null,
    };
  }
}
