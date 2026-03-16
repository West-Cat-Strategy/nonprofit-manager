export type TeamChatRoomType = 'case' | 'direct' | 'group';
export type TeamChatRoomStatus = 'active' | 'archived';
export type TeamChatMembershipRole = 'owner' | 'member' | 'observer';
export type TeamChatMembershipSource = 'manual' | 'case_assignee' | 'system';
export type TeamMessengerPresenceStatus = 'online' | 'offline';

export interface TeamChatCaseContext {
  case_id: string;
  case_number: string;
  case_title: string;
  assigned_to: string | null;
}

export interface TeamChatRoomRecord {
  room_id: string;
  organization_id: string;
  room_type: TeamChatRoomType;
  case_id: string | null;
  title: string | null;
  direct_key: string | null;
  status: TeamChatRoomStatus;
  created_by: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  case_number: string | null;
  case_title: string | null;
}

export interface TeamChatMember {
  room_id: string;
  user_id: string;
  membership_role: TeamChatMembershipRole;
  source: TeamChatMembershipSource;
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

export interface TeamChatMessageCreateDTO {
  body: string;
  parent_message_id?: string | null;
  client_message_id?: string;
  mention_user_ids?: string[];
}

export interface TeamChatMessageQuery {
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

export interface TeamMessengerConversationSummary {
  room_id: string;
  room_type: 'direct' | 'group';
  title: string;
  status: TeamChatRoomStatus;
  last_message_at: string;
  last_message_preview: string | null;
  message_count: number;
  member_count: number;
  unread_count: number;
  unread_mentions_count: number;
  counterpart_user_id: string | null;
  counterpart_first_name: string | null;
  counterpart_last_name: string | null;
  counterpart_email: string | null;
}

export interface TeamMessengerConversationDetail {
  room: TeamMessengerConversationSummary;
  members: TeamChatMember[];
  messages: TeamChatMessage[];
}

export interface TeamMessengerContact {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  presence_status: TeamMessengerPresenceStatus;
}

export interface TeamMessengerPresenceState {
  user_id: string;
  status: TeamMessengerPresenceStatus;
  occurred_at: string;
}

export interface TeamMessengerTypingEvent {
  room_id: string;
  user_id: string;
  is_typing: boolean;
  occurred_at: string;
  expires_at: string | null;
}

export interface TeamMessengerDirectConversationCreateDTO {
  participant_user_id: string;
}

export interface TeamMessengerGroupConversationCreateDTO {
  title: string;
  participant_user_ids: string[];
}

export interface TeamMessengerConversationUpdateDTO {
  title: string;
}

export interface TeamMessengerTypingDTO {
  is_typing: boolean;
}
