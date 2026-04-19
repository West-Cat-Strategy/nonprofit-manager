import type { Pool } from 'pg';

import type {
  TeamChatCaseContext,
  TeamChatInboxItem,
  TeamChatMember,
  TeamChatMessage,
  TeamChatMessageListResult,
  TeamChatMessageQuery,
  TeamChatRoomDetail,
  TeamChatRoomRecord,
  TeamChatUnreadSummary,
  TeamMessengerContact,
  TeamMessengerConversationDetail,
  TeamMessengerConversationSummary,
} from '../types/contracts';
import {
  DEFAULT_MESSAGE_LIMIT,
  mapInboxRow,
  mapMemberRow,
  mapMessageRow,
  mapMessengerConversationRow,
  mapMessengerContactRow,
  mapRoomRow,
} from './teamChat.repository.shared';

export class TeamChatQueryRepository {
  constructor(private readonly db: Pool) {}

  async getMessageByClientMessageId(input: {
    roomId: string;
    senderUserId: string;
    clientMessageId: string;
  }): Promise<TeamChatMessage | null> {
    const result = await this.db.query(
      `SELECT
         m.id,
         m.room_id,
         m.sender_user_id,
         m.body,
         m.parent_message_id,
         m.client_message_id,
         m.metadata,
         m.created_at,
         m.edited_at,
         m.deleted_at,
         u.first_name AS sender_first_name,
         u.last_name AS sender_last_name,
         COALESCE(array_remove(array_agg(mm.mentioned_user_id), NULL), '{}') AS mention_user_ids
       FROM team_chat_messages m
       LEFT JOIN users u ON u.id = m.sender_user_id
       LEFT JOIN team_chat_message_mentions mm ON mm.message_id = m.id
       WHERE m.room_id = $1
         AND m.sender_user_id = $2
         AND m.client_message_id = $3
       GROUP BY m.id, u.first_name, u.last_name
       LIMIT 1`,
      [input.roomId, input.senderUserId, input.clientMessageId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapMessageRow(result.rows[0]);
  }

  async getCaseContext(caseId: string, organizationId: string): Promise<TeamChatCaseContext | null> {
    const result = await this.db.query(
      `SELECT
         c.id AS case_id,
         c.case_number,
         c.title AS case_title,
         c.assigned_to
       FROM cases c
       LEFT JOIN contacts ct ON ct.id = c.contact_id
       WHERE c.id = $1
         AND COALESCE(c.account_id, ct.account_id) = $2
       LIMIT 1`,
      [caseId, organizationId]
    );

    const row = result.rows[0] as TeamChatCaseContext | undefined;
    return row || null;
  }

  async getRoomByCaseId(caseId: string, organizationId: string): Promise<TeamChatRoomRecord | null> {
    const result = await this.db.query(
      `SELECT
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
       FROM team_chat_rooms r
       INNER JOIN cases c ON c.id = r.case_id
       WHERE r.case_id = $1
         AND r.organization_id = $2
       LIMIT 1`,
      [caseId, organizationId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRoomRow(result.rows[0]);
  }

  async getMembership(roomId: string, userId: string): Promise<TeamChatMember | null> {
    const result = await this.db.query(
      `SELECT
         m.room_id,
         m.user_id,
         m.membership_role,
         m.source,
         m.joined_at,
         m.last_read_at,
         m.last_read_message_id,
         m.muted,
         u.first_name,
         u.last_name,
         u.email
       FROM team_chat_members m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.room_id = $1
         AND m.user_id = $2
       LIMIT 1`,
      [roomId, userId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapMemberRow(result.rows[0]);
  }

  async listMembers(roomId: string): Promise<TeamChatMember[]> {
    const result = await this.db.query(
      `SELECT
         m.room_id,
         m.user_id,
         m.membership_role,
         m.source,
         m.joined_at,
         m.last_read_at,
         m.last_read_message_id,
         m.muted,
         u.first_name,
         u.last_name,
         u.email
       FROM team_chat_members m
       INNER JOIN users u ON u.id = m.user_id
       WHERE m.room_id = $1
       ORDER BY
         CASE m.membership_role
           WHEN 'owner' THEN 0
           WHEN 'member' THEN 1
           ELSE 2
         END,
         u.first_name ASC,
         u.last_name ASC,
         u.email ASC`,
      [roomId]
    );

    return result.rows.map((row) => mapMemberRow(row));
  }

  async countOwners(roomId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT COUNT(*)::int AS owner_count
       FROM team_chat_members
       WHERE room_id = $1
         AND membership_role = 'owner'`,
      [roomId]
    );

    return Number(result.rows[0]?.owner_count || 0);
  }

  async userExists(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1
       FROM users
       WHERE id = $1
         AND is_active = true
       LIMIT 1`,
      [userId]
    );

    return Boolean(result.rows[0]);
  }

  async getMessengerContactById(
    organizationId: string,
    userId: string
  ): Promise<TeamMessengerContact | null> {
    const result = await this.db.query(
      `SELECT
         u.id AS user_id,
         u.first_name,
         u.last_name,
         u.email,
         u.role
       FROM users u
       WHERE u.id = $1
         AND u.is_active = true
         AND u.role IN ('admin', 'manager', 'staff')
         AND (
           u.role = 'admin'
           OR EXISTS (
             SELECT 1
             FROM user_account_access uaa
             WHERE uaa.user_id = u.id
               AND uaa.account_id = $2
               AND uaa.is_active = true
           )
         )
       LIMIT 1`,
      [userId, organizationId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapMessengerContactRow(result.rows[0]);
  }

  async listMessengerContacts(
    organizationId: string,
    viewerUserId: string
  ): Promise<TeamMessengerContact[]> {
    const result = await this.db.query(
      `SELECT
         u.id AS user_id,
         u.first_name,
         u.last_name,
         u.email,
         u.role
       FROM users u
       WHERE u.id <> $2
         AND u.is_active = true
         AND u.role IN ('admin', 'manager', 'staff')
         AND (
           u.role = 'admin'
           OR EXISTS (
             SELECT 1
             FROM user_account_access uaa
             WHERE uaa.user_id = u.id
               AND uaa.account_id = $1
               AND uaa.is_active = true
           )
         )
       ORDER BY
         CASE u.role
           WHEN 'admin' THEN 0
           WHEN 'manager' THEN 1
           ELSE 2
         END,
         u.first_name ASC,
         u.last_name ASC,
         u.email ASC`,
      [organizationId, viewerUserId]
    );

    return result.rows.map((row) => mapMessengerContactRow(row));
  }

  async getDirectRoomByKey(
    organizationId: string,
    directKey: string
  ): Promise<TeamChatRoomRecord | null> {
    const result = await this.db.query(
      `SELECT
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
       FROM team_chat_rooms r
       LEFT JOIN cases c ON c.id = r.case_id
       WHERE r.organization_id = $1
         AND r.room_type = 'direct'
         AND r.direct_key = $2
       LIMIT 1`,
      [organizationId, directKey]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRoomRow(result.rows[0]);
  }

  async getMessengerRoomById(
    roomId: string,
    organizationId: string
  ): Promise<TeamChatRoomRecord | null> {
    const result = await this.db.query(
      `SELECT
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
       FROM team_chat_rooms r
       LEFT JOIN cases c ON c.id = r.case_id
       WHERE r.id = $1
         AND r.organization_id = $2
         AND r.room_type IN ('direct', 'group')
       LIMIT 1`,
      [roomId, organizationId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapRoomRow(result.rows[0]);
  }

  async listMessengerConversations(
    organizationId: string,
    userId: string
  ): Promise<TeamMessengerConversationSummary[]> {
    const result = await this.db.query(
      `SELECT
         r.id AS room_id,
         r.room_type,
         COALESCE(
           NULLIF(BTRIM(r.title), ''),
           NULLIF(BTRIM(CONCAT(counterpart.first_name, ' ', counterpart.last_name)), ''),
           counterpart.email,
           'Direct conversation'
         ) AS title,
         r.status,
         r.last_message_at,
         r.last_message_preview,
         r.message_count,
         COALESCE(member_counts.member_count, 0) AS member_count,
         COALESCE(unread.unread_count, 0) AS unread_count,
         COALESCE(mentions.unread_mentions_count, 0) AS unread_mentions_count,
         counterpart.user_id AS counterpart_user_id,
         counterpart.first_name AS counterpart_first_name,
         counterpart.last_name AS counterpart_last_name,
         counterpart.email AS counterpart_email
       FROM team_chat_rooms r
       INNER JOIN team_chat_members viewer_member
         ON viewer_member.room_id = r.id
        AND viewer_member.user_id = $2
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS member_count
         FROM team_chat_members m
         WHERE m.room_id = r.id
       ) member_counts ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_count
         FROM team_chat_messages m
         WHERE m.room_id = r.id
           AND m.deleted_at IS NULL
           AND m.sender_user_id <> $2
           AND m.created_at > COALESCE(viewer_member.last_read_at, to_timestamp(0))
       ) unread ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_mentions_count
         FROM team_chat_messages m
         INNER JOIN team_chat_message_mentions mm
           ON mm.message_id = m.id
          AND mm.mentioned_user_id = $2
         WHERE m.room_id = r.id
           AND m.deleted_at IS NULL
           AND m.sender_user_id <> $2
           AND m.created_at > COALESCE(viewer_member.last_read_at, to_timestamp(0))
       ) mentions ON true
       LEFT JOIN LATERAL (
         SELECT
           u.id AS user_id,
           u.first_name,
           u.last_name,
           u.email
         FROM team_chat_members m
         INNER JOIN users u ON u.id = m.user_id
         WHERE m.room_id = r.id
           AND m.user_id <> $2
         ORDER BY m.joined_at ASC
         LIMIT 1
       ) counterpart ON r.room_type = 'direct'
       WHERE r.organization_id = $1
         AND r.room_type IN ('direct', 'group')
       ORDER BY r.last_message_at DESC`,
      [organizationId, userId]
    );

    return result.rows.map((row) => mapMessengerConversationRow(row));
  }

  async getMessengerConversationDetail(
    roomId: string,
    userId: string
  ): Promise<TeamMessengerConversationDetail> {
    const result = await this.db.query(
      `SELECT
         r.id AS room_id,
         r.room_type,
         COALESCE(
           NULLIF(BTRIM(r.title), ''),
           NULLIF(BTRIM(CONCAT(counterpart.first_name, ' ', counterpart.last_name)), ''),
           counterpart.email,
           'Direct conversation'
         ) AS title,
         r.status,
         r.last_message_at,
         r.last_message_preview,
         r.message_count,
         COALESCE(member_counts.member_count, 0) AS member_count,
         COALESCE(unread.unread_count, 0) AS unread_count,
         COALESCE(mentions.unread_mentions_count, 0) AS unread_mentions_count,
         counterpart.user_id AS counterpart_user_id,
         counterpart.first_name AS counterpart_first_name,
         counterpart.last_name AS counterpart_last_name,
         counterpart.email AS counterpart_email
       FROM team_chat_rooms r
       INNER JOIN team_chat_members viewer_member
         ON viewer_member.room_id = r.id
        AND viewer_member.user_id = $2
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS member_count
         FROM team_chat_members m
         WHERE m.room_id = r.id
       ) member_counts ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_count
         FROM team_chat_messages m
         WHERE m.room_id = r.id
           AND m.deleted_at IS NULL
           AND m.sender_user_id <> $2
           AND m.created_at > COALESCE(viewer_member.last_read_at, to_timestamp(0))
       ) unread ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_mentions_count
         FROM team_chat_messages m
         INNER JOIN team_chat_message_mentions mm
           ON mm.message_id = m.id
          AND mm.mentioned_user_id = $2
         WHERE m.room_id = r.id
           AND m.deleted_at IS NULL
           AND m.sender_user_id <> $2
           AND m.created_at > COALESCE(viewer_member.last_read_at, to_timestamp(0))
       ) mentions ON true
       LEFT JOIN LATERAL (
         SELECT
           u.id AS user_id,
           u.first_name,
           u.last_name,
           u.email
         FROM team_chat_members m
         INNER JOIN users u ON u.id = m.user_id
         WHERE m.room_id = r.id
           AND m.user_id <> $2
         ORDER BY m.joined_at ASC
         LIMIT 1
       ) counterpart ON r.room_type = 'direct'
       WHERE r.id = $1
       LIMIT 1`,
      [roomId, userId]
    );

    if (!result.rows[0]) {
      throw new Error('Messenger conversation not found');
    }

    const [members, recentMessages] = await Promise.all([
      this.listMembers(roomId),
      this.listMessages(roomId, { limit: DEFAULT_MESSAGE_LIMIT }),
    ]);

    return {
      room: mapMessengerConversationRow(result.rows[0]),
      members,
      messages: recentMessages.messages,
    };
  }

  async listMessages(
    roomId: string,
    query: TeamChatMessageQuery
  ): Promise<TeamChatMessageListResult> {
    const limit = Math.max(1, Math.min(query.limit ?? DEFAULT_MESSAGE_LIMIT, 100));
    const afterMessageId = query.after_message_id || undefined;
    const beforeMessageId = query.before_message_id || undefined;

    const values: unknown[] = [roomId];
    const conditions: string[] = ['m.room_id = $1', 'm.deleted_at IS NULL'];

    let orderBy = 'm.created_at DESC, m.id DESC';
    let reverseAfterFetch = true;

    if (afterMessageId) {
      values.push(afterMessageId);
      const cursorIndex = values.length;
      conditions.push(
        `(m.created_at, m.id) > (
          SELECT cm.created_at, cm.id
          FROM team_chat_messages cm
          WHERE cm.id = $${cursorIndex}
            AND cm.room_id = $1
          LIMIT 1
        )`
      );
      orderBy = 'm.created_at ASC, m.id ASC';
      reverseAfterFetch = false;
    } else if (beforeMessageId) {
      values.push(beforeMessageId);
      const cursorIndex = values.length;
      conditions.push(
        `(m.created_at, m.id) < (
          SELECT cm.created_at, cm.id
          FROM team_chat_messages cm
          WHERE cm.id = $${cursorIndex}
            AND cm.room_id = $1
          LIMIT 1
        )`
      );
    }

    values.push(limit);
    const limitIndex = values.length;

    const result = await this.db.query(
      `SELECT
         m.id,
         m.room_id,
         m.sender_user_id,
         m.body,
         m.parent_message_id,
         m.client_message_id,
         m.metadata,
         m.created_at,
         m.edited_at,
         m.deleted_at,
         u.first_name AS sender_first_name,
         u.last_name AS sender_last_name,
         COALESCE(array_remove(array_agg(mm.mentioned_user_id), NULL), '{}') AS mention_user_ids
       FROM team_chat_messages m
       LEFT JOIN users u ON u.id = m.sender_user_id
       LEFT JOIN team_chat_message_mentions mm ON mm.message_id = m.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY m.id, u.first_name, u.last_name
       ORDER BY ${orderBy}
       LIMIT $${limitIndex}`,
      values
    );

    const messages = result.rows.map((row) => mapMessageRow(row));
    if (reverseAfterFetch) {
      messages.reverse();
    }

    return {
      room_id: roomId,
      messages,
      limit,
    };
  }

  async getMessageById(roomId: string, messageId: string): Promise<TeamChatMessage | null> {
    const result = await this.db.query(
      `SELECT
         m.id,
         m.room_id,
         m.sender_user_id,
         m.body,
         m.parent_message_id,
         m.client_message_id,
         m.metadata,
         m.created_at,
         m.edited_at,
         m.deleted_at,
         u.first_name AS sender_first_name,
         u.last_name AS sender_last_name,
         COALESCE(array_remove(array_agg(mm.mentioned_user_id), NULL), '{}') AS mention_user_ids
       FROM team_chat_messages m
       LEFT JOIN users u ON u.id = m.sender_user_id
       LEFT JOIN team_chat_message_mentions mm ON mm.message_id = m.id
       WHERE m.room_id = $1
         AND m.id = $2
       GROUP BY m.id, u.first_name, u.last_name
       LIMIT 1`,
      [roomId, messageId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapMessageRow(result.rows[0]);
  }

  async getRoomInboxItem(roomId: string, userId: string): Promise<TeamChatInboxItem> {
    const result = await this.db.query(
      `SELECT
         r.id AS room_id,
         r.case_id,
         c.case_number,
         c.title AS case_title,
         r.status,
         r.last_message_at,
         r.last_message_preview,
         r.message_count,
         COALESCE(member_counts.member_count, 0) AS member_count,
         COALESCE(unread.unread_count, 0) AS unread_count,
         COALESCE(mentions.unread_mentions_count, 0) AS unread_mentions_count
       FROM team_chat_rooms r
       INNER JOIN cases c ON c.id = r.case_id
       INNER JOIN team_chat_members viewer_member
         ON viewer_member.room_id = r.id
        AND viewer_member.user_id = $2
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS member_count
         FROM team_chat_members m
         WHERE m.room_id = r.id
       ) member_counts ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_count
         FROM team_chat_messages m
         WHERE m.room_id = r.id
           AND m.deleted_at IS NULL
           AND m.sender_user_id <> $2
           AND m.created_at > COALESCE(viewer_member.last_read_at, to_timestamp(0))
       ) unread ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_mentions_count
         FROM team_chat_messages m
         INNER JOIN team_chat_message_mentions mm
           ON mm.message_id = m.id
          AND mm.mentioned_user_id = $2
         WHERE m.room_id = r.id
           AND m.deleted_at IS NULL
           AND m.sender_user_id <> $2
           AND m.created_at > COALESCE(viewer_member.last_read_at, to_timestamp(0))
       ) mentions ON true
       WHERE r.id = $1
       LIMIT 1`,
      [roomId, userId]
    );

    if (!result.rows[0]) {
      throw new Error('Team chat room not found');
    }

    return mapInboxRow(result.rows[0]);
  }

  async getRoomDetail(roomId: string, userId: string): Promise<TeamChatRoomDetail> {
    const room = await this.getRoomInboxItem(roomId, userId);
    const [members, recentMessages] = await Promise.all([
      this.listMembers(roomId),
      this.listMessages(roomId, { limit: DEFAULT_MESSAGE_LIMIT }),
    ]);

    return {
      room,
      members,
      messages: recentMessages.messages,
    };
  }

  async getInbox(
    organizationId: string,
    userId: string,
    includeAllRooms: boolean
  ): Promise<TeamChatInboxItem[]> {
    const result = await this.db.query(
      `SELECT
         r.id AS room_id,
         r.case_id,
         c.case_number,
         c.title AS case_title,
         r.status,
         r.last_message_at,
         r.last_message_preview,
         r.message_count,
         COALESCE(member_counts.member_count, 0) AS member_count,
         COALESCE(unread.unread_count, 0) AS unread_count,
         COALESCE(mentions.unread_mentions_count, 0) AS unread_mentions_count
       FROM team_chat_rooms r
       INNER JOIN cases c ON c.id = r.case_id
       LEFT JOIN team_chat_members viewer_member
         ON viewer_member.room_id = r.id
        AND viewer_member.user_id = $2
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS member_count
         FROM team_chat_members m
         WHERE m.room_id = r.id
       ) member_counts ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_count
         FROM team_chat_messages m
         WHERE m.room_id = r.id
           AND m.deleted_at IS NULL
           AND m.sender_user_id <> $2
           AND viewer_member.user_id IS NOT NULL
           AND m.created_at > COALESCE(viewer_member.last_read_at, to_timestamp(0))
       ) unread ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_mentions_count
         FROM team_chat_messages m
         INNER JOIN team_chat_message_mentions mm
           ON mm.message_id = m.id
          AND mm.mentioned_user_id = $2
         WHERE m.room_id = r.id
           AND m.deleted_at IS NULL
           AND m.sender_user_id <> $2
           AND viewer_member.user_id IS NOT NULL
           AND m.created_at > COALESCE(viewer_member.last_read_at, to_timestamp(0))
       ) mentions ON true
       WHERE r.organization_id = $1
         AND ($3::boolean = true OR viewer_member.user_id IS NOT NULL)
       ORDER BY r.last_message_at DESC`,
      [organizationId, userId, includeAllRooms]
    );

    return result.rows.map((row) => mapInboxRow(row));
  }

  async getUnreadSummary(
    organizationId: string,
    userId: string,
    includeAllRooms: boolean
  ): Promise<TeamChatUnreadSummary> {
    const inbox = await this.getInbox(organizationId, userId, includeAllRooms);

    const totalUnreadCount = inbox.reduce((sum, item) => sum + item.unread_count, 0);
    const totalUnreadMentionsCount = inbox.reduce((sum, item) => sum + item.unread_mentions_count, 0);
    const roomsWithUnreadCount = inbox.filter(
      (item) => item.unread_count > 0 || item.unread_mentions_count > 0
    ).length;

    return {
      total_unread_count: totalUnreadCount,
      total_unread_mentions_count: totalUnreadMentionsCount,
      rooms_with_unread_count: roomsWithUnreadCount,
    };
  }
}
