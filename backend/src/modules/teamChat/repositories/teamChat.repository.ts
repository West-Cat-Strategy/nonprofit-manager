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

const DEFAULT_MESSAGE_LIMIT = 50;

const normalizeCount = (value: unknown): number => Number(value || 0);
const isUniqueViolation = (error: unknown): boolean =>
  Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23505');

const mapRoomRow = (row: Record<string, unknown>): TeamChatRoomRecord => ({
  room_id: String(row.room_id),
  organization_id: String(row.organization_id),
  room_type: row.room_type as TeamChatRoomRecord['room_type'],
  case_id: row.case_id ? String(row.case_id) : null,
  title: row.title ? String(row.title) : null,
  direct_key: row.direct_key ? String(row.direct_key) : null,
  status: row.status as TeamChatRoomRecord['status'],
  created_by: row.created_by ? String(row.created_by) : null,
  last_message_at: String(row.last_message_at),
  last_message_preview: row.last_message_preview ? String(row.last_message_preview) : null,
  message_count: normalizeCount(row.message_count),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
  case_number: row.case_number ? String(row.case_number) : null,
  case_title: row.case_title ? String(row.case_title) : null,
});

const mapMemberRow = (row: Record<string, unknown>): TeamChatMember => ({
  room_id: String(row.room_id),
  user_id: String(row.user_id),
  membership_role: row.membership_role as TeamChatMember['membership_role'],
  source: row.source as TeamChatMember['source'],
  joined_at: String(row.joined_at),
  last_read_at: row.last_read_at ? String(row.last_read_at) : null,
  last_read_message_id: row.last_read_message_id ? String(row.last_read_message_id) : null,
  muted: Boolean(row.muted),
  first_name: row.first_name ? String(row.first_name) : null,
  last_name: row.last_name ? String(row.last_name) : null,
  email: row.email ? String(row.email) : null,
});

const mapMessageRow = (row: Record<string, unknown>): TeamChatMessage => ({
  id: String(row.id),
  room_id: String(row.room_id),
  sender_user_id: String(row.sender_user_id),
  sender_first_name: row.sender_first_name ? String(row.sender_first_name) : null,
  sender_last_name: row.sender_last_name ? String(row.sender_last_name) : null,
  body: String(row.body),
  parent_message_id: row.parent_message_id ? String(row.parent_message_id) : null,
  client_message_id: row.client_message_id ? String(row.client_message_id) : null,
  metadata: (row.metadata as Record<string, unknown> | null) || null,
  created_at: String(row.created_at),
  edited_at: row.edited_at ? String(row.edited_at) : null,
  deleted_at: row.deleted_at ? String(row.deleted_at) : null,
  mention_user_ids: Array.isArray(row.mention_user_ids)
    ? row.mention_user_ids.map((entry) => String(entry))
    : [],
});

const mapInboxRow = (row: Record<string, unknown>): TeamChatInboxItem => ({
  room_id: String(row.room_id),
  case_id: String(row.case_id),
  case_number: String(row.case_number),
  case_title: String(row.case_title),
  status: row.status as TeamChatInboxItem['status'],
  last_message_at: String(row.last_message_at),
  last_message_preview: row.last_message_preview ? String(row.last_message_preview) : null,
  message_count: normalizeCount(row.message_count),
  member_count: normalizeCount(row.member_count),
  unread_count: normalizeCount(row.unread_count),
  unread_mentions_count: normalizeCount(row.unread_mentions_count),
});

const mapMessengerConversationRow = (
  row: Record<string, unknown>
): TeamMessengerConversationSummary => ({
  room_id: String(row.room_id),
  room_type: row.room_type as TeamMessengerConversationSummary['room_type'],
  title: String(row.title),
  status: row.status as TeamMessengerConversationSummary['status'],
  last_message_at: String(row.last_message_at),
  last_message_preview: row.last_message_preview ? String(row.last_message_preview) : null,
  message_count: normalizeCount(row.message_count),
  member_count: normalizeCount(row.member_count),
  unread_count: normalizeCount(row.unread_count),
  unread_mentions_count: normalizeCount(row.unread_mentions_count),
  counterpart_user_id: row.counterpart_user_id ? String(row.counterpart_user_id) : null,
  counterpart_first_name: row.counterpart_first_name
    ? String(row.counterpart_first_name)
    : null,
  counterpart_last_name: row.counterpart_last_name ? String(row.counterpart_last_name) : null,
  counterpart_email: row.counterpart_email ? String(row.counterpart_email) : null,
});

const mapMessengerContactRow = (row: Record<string, unknown>): TeamMessengerContact => ({
  user_id: String(row.user_id),
  first_name: row.first_name ? String(row.first_name) : null,
  last_name: row.last_name ? String(row.last_name) : null,
  email: String(row.email),
  role: String(row.role),
  presence_status: 'offline',
});

export class TeamChatRepository
  implements TeamChatRepositoryPort, TeamMessengerRepositoryPort
{
  constructor(private readonly db: Pool = pool) {}

  private async getMessageByClientMessageId(input: {
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

    const membership = await this.getMembership(input.roomId, input.userId);
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

    const membership = await this.getMembership(roomId, userId);
    if (!membership) {
      throw new Error('Failed to upsert team chat membership');
    }

    return membership;
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

  async removeMembership(roomId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM team_chat_members
       WHERE room_id = $1
         AND user_id = $2`,
      [roomId, userId]
    );

    return (result.rowCount || 0) > 0;
  }

  async countOwners(roomId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT COUNT(*)::int AS owner_count
       FROM team_chat_members
       WHERE room_id = $1
         AND membership_role = 'owner'`,
      [roomId]
    );

    return normalizeCount(result.rows[0]?.owner_count);
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
      [roomId, title.trim()]
    );

    if (!result.rows[0]) {
      throw new Error('Messenger conversation not found');
    }

    return mapRoomRow(result.rows[0]);
  }

  async createMessage(input: {
    roomId: string;
    senderUserId: string;
    payload: TeamChatMessageCreateDTO;
  }): Promise<TeamChatMessage> {
    const trimmedBody = input.payload.body.trim();
    const clientMessageId = input.payload.client_message_id || null;
    const dedupedMentions = Array.from(
      new Set((input.payload.mention_user_ids || []).filter((id) => id && id !== input.senderUserId))
    );

    if (clientMessageId) {
      const existing = await this.getMessageByClientMessageId({
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

      const existing = await this.getMessageByClientMessageId({
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

    const created = await this.getMessageById(input.roomId, messageId);
    if (!created) {
      throw new Error('Failed to load created team chat message');
    }

    return created;
  }

  async listMessages(roomId: string, query: TeamChatMessageQuery): Promise<TeamChatMessageListResult> {
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

  async markRoomRead(input: {
    roomId: string;
    userId: string;
    messageId?: string;
  }): Promise<{ last_read_at: string; last_read_message_id: string | null }> {
    let resolvedMessageId: string | null = null;
    let resolvedReadAt: string;

    if (input.messageId) {
      const message = await this.getMessageById(input.roomId, input.messageId);
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
