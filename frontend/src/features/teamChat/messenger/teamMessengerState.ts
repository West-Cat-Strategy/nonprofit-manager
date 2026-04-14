import type {
  TeamMessengerContact,
  TeamMessengerConversationDetail,
  TeamMessengerConversationMessageCreateDTO,
  TeamMessengerConversationSummary,
  TeamMessengerRenderableMessage,
} from './types';
import { pickPreferredMessageVersion } from '../../messaging/messageMerge';

export const STORAGE_KEY = 'team_messenger_dock_state_v1';
export const TEMP_PREFIX = 'temp-message-';

export interface TeamMessengerDockState {
  openRoomIds: string[];
  minimizedRoomIds: string[];
}

export const buildEmptyDockState = (): TeamMessengerDockState => ({
  openRoomIds: [],
  minimizedRoomIds: [],
});

export const loadDockState = (): TeamMessengerDockState => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return buildEmptyDockState();
    }

    const parsed = JSON.parse(rawValue) as Partial<TeamMessengerDockState>;
    return {
      openRoomIds: Array.isArray(parsed.openRoomIds) ? parsed.openRoomIds.filter(Boolean) : [],
      minimizedRoomIds: Array.isArray(parsed.minimizedRoomIds)
        ? parsed.minimizedRoomIds.filter(Boolean)
        : [],
    };
  } catch {
    return buildEmptyDockState();
  }
};

const sortMessages = (
  left: TeamMessengerRenderableMessage,
  right: TeamMessengerRenderableMessage
): number => {
  const leftTime = new Date(left.created_at).getTime();
  const rightTime = new Date(right.created_at).getTime();
  const leftId = typeof left.id === 'string' ? left.id : '';
  const rightId = typeof right.id === 'string' ? right.id : '';

  if (leftTime === rightTime) {
    return leftId.localeCompare(rightId);
  }

  return leftTime - rightTime;
};

export const toRenderableMessage = (
  message: TeamMessengerRenderableMessage
): TeamMessengerRenderableMessage => ({
  ...message,
  optimistic: false,
  send_state: 'sent',
  send_error: null,
});

export const mergeRenderableMessages = (
  messages: TeamMessengerRenderableMessage[]
): TeamMessengerRenderableMessage[] => {
  const byKey = new Map<string, TeamMessengerRenderableMessage>();

  for (const [index, message] of messages.entries()) {
    const messageId = typeof message.id === 'string' ? message.id : '';
    const key =
      messageId.startsWith(TEMP_PREFIX) && message.client_message_id
        ? `client:${message.client_message_id}`
        : messageId
          ? `id:${messageId}`
          : `fallback:${message.room_id}:${message.client_message_id || index}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, message);
      continue;
    }

    byKey.set(key, pickPreferredMessageVersion(existing, message));
  }

  return Array.from(byKey.values()).sort(sortMessages);
};

export const mergeConversationSummary = (
  conversations: TeamMessengerConversationSummary[],
  summary: TeamMessengerConversationSummary
): TeamMessengerConversationSummary[] => {
  const existingIndex = conversations.findIndex((conversation) => conversation.room_id === summary.room_id);
  if (existingIndex === -1) {
    return [summary, ...conversations];
  }

  const next = [...conversations];
  next.splice(existingIndex, 1);
  return [summary, ...next];
};

export const mergeConversationSummaryForEvent = (
  conversations: TeamMessengerConversationSummary[],
  summary: TeamMessengerConversationSummary,
  input: {
    actorUserId: string;
    currentUserId: string | null;
    isSelected: boolean;
    mentionUserIds?: string[];
  }
): TeamMessengerConversationSummary[] => {
  const currentSummary = conversations.find((entry) => entry.room_id === summary.room_id);
  const nextSummary: TeamMessengerConversationSummary = {
    ...(currentSummary || summary),
    ...summary,
    unread_count: currentSummary?.unread_count || 0,
    unread_mentions_count: currentSummary?.unread_mentions_count || 0,
  };

  if (input.actorUserId === input.currentUserId) {
    nextSummary.unread_count = 0;
    nextSummary.unread_mentions_count = 0;
  } else if (!input.isSelected) {
    nextSummary.unread_count = (currentSummary?.unread_count || 0) + 1;
    nextSummary.unread_mentions_count =
      (currentSummary?.unread_mentions_count || 0) +
      (input.currentUserId && input.mentionUserIds?.includes(input.currentUserId) ? 1 : 0);
  }

  return mergeConversationSummary(conversations, nextSummary);
};

export const buildConversationMap = (
  previous: Record<string, TeamMessengerConversationDetail | undefined>,
  detail: TeamMessengerConversationDetail
): Record<string, TeamMessengerConversationDetail | undefined> => ({
  ...previous,
  [detail.room.room_id]: {
    ...detail,
    messages: mergeRenderableMessages(
      detail.messages.map((message) => toRenderableMessage(message))
    ),
  },
});

export const buildOptimisticMessage = (
  roomId: string,
  payload: TeamMessengerConversationMessageCreateDTO,
  sender: { id: string; firstName?: string | null; lastName?: string | null }
): TeamMessengerRenderableMessage => ({
  id: `${TEMP_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  room_id: roomId,
  sender_user_id: sender.id,
  sender_first_name: sender.firstName || null,
  sender_last_name: sender.lastName || null,
  body: payload.body,
  parent_message_id: payload.parent_message_id || null,
  client_message_id: payload.client_message_id || null,
  metadata: null,
  created_at: new Date().toISOString(),
  edited_at: null,
  deleted_at: null,
  mention_user_ids: payload.mention_user_ids || [],
  optimistic: true,
  send_state: 'sending',
  send_error: null,
});

export const applyPresence = (
  contacts: TeamMessengerContact[],
  presenceByUserId: Record<string, 'online' | 'offline'>
): TeamMessengerContact[] => {
  let hasChanges = false;
  const nextContacts = contacts.map((contact) => {
    const nextPresence = presenceByUserId[contact.user_id] || contact.presence_status;
    if (nextPresence !== contact.presence_status) {
      hasChanges = true;
      return {
        ...contact,
        presence_status: nextPresence,
      };
    }

    return contact;
  });

  return hasChanges ? nextContacts : contacts;
};
