import type {
  TeamChatAddMemberDTO,
  TeamChatInboxItem,
  TeamChatMarkReadDTO,
  TeamChatMember,
  TeamChatMessage,
  TeamChatMessageCreateDTO,
} from '../types';
import type { MessageSendState } from '../../messaging/types';

export type TeamMessengerStreamStatus = 'disabled' | 'connecting' | 'connected' | 'error';

export interface TeamMessengerConversationSummary {
  room_id: string;
  room_type: 'direct' | 'group';
  title: string;
  status: 'active' | 'archived';
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
  messages: TeamMessengerRenderableMessage[];
}

export type TeamMessengerRenderableMessage = TeamChatMessage & {
  send_state?: MessageSendState;
  send_error?: string | null;
  optimistic?: boolean;
};

export interface TeamMessengerContact {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  presence_status: 'online' | 'offline';
}

export interface TeamMessengerPresenceState {
  user_id: string;
  status: 'online' | 'offline';
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

export interface TeamMessengerConnectedPayload {
  connection_id: string;
  channels: string[];
  online_user_ids: string[];
}

export interface TeamMessengerMessageCreatedEventPayload {
  event_id: string;
  occurred_at: string;
  room_id: string;
  room_type: 'direct' | 'group';
  actor_user_id: string;
  client_message_id: string | null;
  message: TeamChatMessage;
  room: TeamMessengerConversationSummary;
}

export interface TeamMessengerRoomReadEventPayload {
  event_id: string;
  occurred_at: string;
  room_id: string;
  room_type: 'direct' | 'group';
  actor_user_id: string;
  last_read_at: string;
  last_read_message_id: string | null;
  room: TeamMessengerConversationSummary;
}

export interface TeamMessengerMemberEventPayload {
  event_id: string;
  occurred_at: string;
  room_id: string;
  room_type: 'direct' | 'group';
  actor_user_id: string;
  target_user_id: string;
  removed?: boolean;
  room: TeamMessengerConversationSummary;
  members: TeamChatMember[];
}

export interface TeamChatCaseMessageCreatedEventPayload {
  event_id: string;
  occurred_at: string;
  room_id: string;
  room_type: 'case';
  actor_user_id: string;
  client_message_id: string | null;
  message: TeamChatMessage;
  room: TeamChatInboxItem;
}

export interface TeamChatCaseReadEventPayload {
  event_id: string;
  occurred_at: string;
  room_id: string;
  room_type: 'case';
  actor_user_id: string;
  last_read_at: string;
  last_read_message_id: string | null;
  room: TeamChatInboxItem;
}

export interface TeamChatCaseMemberEventPayload {
  event_id: string;
  occurred_at: string;
  room_id: string;
  room_type: 'case';
  actor_user_id: string;
  target_user_id: string;
  removed?: boolean;
  members: TeamChatMember[];
}

export type TeamMessengerConversationMemberUpdateDTO = TeamChatAddMemberDTO;
export type TeamMessengerConversationReadDTO = TeamChatMarkReadDTO;
export type TeamMessengerConversationMessageCreateDTO = TeamChatMessageCreateDTO;
