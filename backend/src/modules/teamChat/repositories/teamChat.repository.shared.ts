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

const DEFAULT_MESSAGE_LIMIT = 50;

export interface TeamChatValidationPayload {
  roomId: string;
  senderUserId: string;
  clientMessageId: string;
}

export {
  DEFAULT_MESSAGE_LIMIT,
  mapInboxRow,
  mapMemberRow,
  mapMessageRow,
  mapMessengerConversationRow,
  mapMessengerContactRow,
  mapRoomRow,
  mapRoomRow as mapRoomRecord,
  normalizeCount,
  isUniqueViolation,
};

export type {
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
};
