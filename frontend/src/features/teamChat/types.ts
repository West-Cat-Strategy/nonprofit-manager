export type TeamChatRoomStatus = 'active' | 'archived';
export type TeamChatMembershipRole = 'owner' | 'member' | 'observer';

export interface TeamChatMember {
  room_id: string;
  user_id: string;
  membership_role: TeamChatMembershipRole;
  source: 'manual' | 'case_assignee' | 'system';
  joined_at: string;
  last_read_at: string | null;
  last_read_message_id: string | null;
  muted: boolean;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface TeamChatMessage {
  id: string;
  room_id: string;
  sender_user_id: string;
  sender_first_name: string | null;
  sender_last_name: string | null;
  body: string;
  parent_message_id: string | null;
  client_message_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  mention_user_ids: string[];
}

export interface TeamChatInboxItem {
  room_id: string;
  case_id: string;
  case_number: string;
  case_title: string;
  status: TeamChatRoomStatus;
  last_message_at: string;
  last_message_preview: string | null;
  message_count: number;
  member_count: number;
  unread_count: number;
  unread_mentions_count: number;
}

export interface TeamChatUnreadSummary {
  total_unread_count: number;
  total_unread_mentions_count: number;
  rooms_with_unread_count: number;
}

export interface TeamChatRoomDetail {
  room: TeamChatInboxItem;
  members: TeamChatMember[];
  messages: TeamChatMessage[];
}

export interface TeamChatMessageListResult {
  room_id: string;
  messages: TeamChatMessage[];
  limit: number;
}

export interface TeamChatMessageCreateDTO {
  body: string;
  parent_message_id?: string | null;
  client_message_id?: string;
  mention_user_ids?: string[];
}

export interface TeamChatMessagesQuery {
  limit?: number;
  after_message_id?: string;
  before_message_id?: string;
}

export interface TeamChatMarkReadDTO {
  message_id?: string;
}

export interface TeamChatAddMemberDTO {
  user_id: string;
  membership_role?: TeamChatMembershipRole;
}

export interface TeamChatMarkReadResult {
  room_id: string;
  room?: TeamChatInboxItem;
  last_read_at: string;
  last_read_message_id: string | null;
  unread_count: number;
  unread_mentions_count: number;
}
