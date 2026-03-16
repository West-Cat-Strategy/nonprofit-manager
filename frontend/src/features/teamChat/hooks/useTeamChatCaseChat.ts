import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createClientMessageId } from '../../messaging/composer';
import { pickPreferredMessageVersion } from '../../messaging/messageMerge';
import type { MessageSendState } from '../../messaging/types';
import { teamChatApiClient } from '../api/teamChatApi';
import { useTeamChatRealtimeStream } from './useTeamChatRealtimeStream';
import type {
  TeamChatMember,
  TeamChatMessage,
  TeamChatMessageCreateDTO,
  TeamChatRoomDetail,
} from '../types';
import type {
  TeamChatCaseMemberEventPayload,
  TeamChatCaseMessageCreatedEventPayload,
  TeamChatCaseReadEventPayload,
} from '../messenger/types';
import { useVisibilityPolling } from './useVisibilityPolling';

const TEMP_PREFIX = 'temp-message-';
const CASE_STREAM_EVENT_NAMES = [
  'team_chat.message.created',
  'team_chat.room.read',
  'team_chat.member.added',
  'team_chat.member.removed',
] as const;
const CASE_STREAM_CHANNELS = ['messages', 'read', 'members'] as const;

export type TeamChatCaseMessage = TeamChatMessage & {
  optimistic?: boolean;
  send_state?: MessageSendState;
  send_error?: string | null;
};

const sortByCreatedAt = (
  left: TeamChatCaseMessage,
  right: TeamChatCaseMessage
): number => {
  const leftTime = new Date(left.created_at).getTime();
  const rightTime = new Date(right.created_at).getTime();

  if (leftTime === rightTime) {
    return left.id.localeCompare(right.id);
  }

  return leftTime - rightTime;
};

const toStableMessage = (message: TeamChatMessage): TeamChatCaseMessage => ({
  ...message,
  optimistic: false,
  send_state: 'sent',
  send_error: null,
});

const mergeMessages = (messages: TeamChatCaseMessage[]): TeamChatCaseMessage[] => {
  const byKey = new Map<string, TeamChatCaseMessage>();

  for (const message of messages) {
    const key =
      message.id.startsWith(TEMP_PREFIX) && message.client_message_id
        ? `client:${message.client_message_id}`
        : `id:${message.id}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, message);
      continue;
    }

    byKey.set(key, pickPreferredMessageVersion(existing, message));
  }

  return Array.from(byKey.values()).sort(sortByCreatedAt);
};

const buildOptimisticMessage = (
  roomId: string | null,
  payload: TeamChatMessageCreateDTO,
  sender: { id: string; firstName?: string | null; lastName?: string | null }
): TeamChatCaseMessage => ({
  id: `${TEMP_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  room_id: roomId || '',
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

const isRealMessage = (message: TeamChatCaseMessage): boolean =>
  !message.id.startsWith(TEMP_PREFIX) && message.send_state === 'sent';

const reconcileCanonicalMessage = (
  current: TeamChatCaseMessage[],
  canonical: TeamChatMessage
): TeamChatCaseMessage[] => {
  const nextCanonical = toStableMessage(canonical);
  return mergeMessages(
    current.map((message) => {
      if (message.id === canonical.id) {
        return nextCanonical;
      }

      if (
        canonical.client_message_id &&
        message.client_message_id === canonical.client_message_id
      ) {
        return nextCanonical;
      }

      return message;
    }).concat(
      current.some(
        (message) =>
          message.id === canonical.id ||
          (canonical.client_message_id &&
            message.client_message_id === canonical.client_message_id)
      )
        ? []
        : [nextCanonical]
    )
  );
};

const markMessageFailed = (
  messages: TeamChatCaseMessage[],
  clientMessageId: string,
  error: string
): TeamChatCaseMessage[] =>
  mergeMessages(
    messages.map((message) =>
      message.client_message_id === clientMessageId
        ? {
            ...message,
            send_state: 'failed',
            send_error: error,
            optimistic: true,
          }
        : message
    )
  );

const markMessageSending = (
  messages: TeamChatCaseMessage[],
  clientMessageId: string
): TeamChatCaseMessage[] =>
  mergeMessages(
    messages.map((message) =>
      message.client_message_id === clientMessageId
        ? {
            ...message,
            send_state: 'sending',
            send_error: null,
            optimistic: true,
          }
        : message
    )
  );

export interface UseTeamChatCaseChatOptions {
  caseId: string;
  enabled: boolean;
  currentUserId?: string | null;
}

export interface UseTeamChatCaseChatResult {
  room: TeamChatRoomDetail['room'] | null;
  members: TeamChatMember[];
  messages: TeamChatCaseMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  streamStatus: 'disabled' | 'connecting' | 'connected' | 'error';
  refresh: () => Promise<void>;
  pollLatestMessages: () => Promise<void>;
  loadOlderMessages: () => Promise<number>;
  sendMessage: (
    payload: TeamChatMessageCreateDTO,
    sender: { id: string; firstName?: string | null; lastName?: string | null }
  ) => Promise<void>;
  retryMessage: (
    messageId: string,
    sender: { id: string; firstName?: string | null; lastName?: string | null }
  ) => Promise<void>;
  markRead: (messageId?: string) => Promise<void>;
  addMember: (userId: string, role?: TeamChatMember['membership_role']) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

export function useTeamChatCaseChat(
  options: UseTeamChatCaseChatOptions
): UseTeamChatCaseChatResult {
  const {
    caseId,
    enabled,
    currentUserId,
  } = options;
  const [room, setRoom] = useState<TeamChatRoomDetail['room'] | null>(null);
  const [members, setMembers] = useState<TeamChatMember[]>([]);
  const [messages, setMessages] = useState<TeamChatCaseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingCount, setSendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setRoom(null);
      setMembers([]);
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const detail = await teamChatApiClient.getCaseRoom(caseId);
      setRoom(detail.room);
      setMembers(detail.members);
      setMessages((current) => mergeMessages([
        ...current.filter((message) => message.send_state === 'failed'),
        ...detail.messages.map((message) => toStableMessage(message)),
      ]));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load case chat');
    } finally {
      setLoading(false);
    }
  }, [caseId, enabled]);

  const pollLatestMessages = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const latestRealMessage = [...messages].reverse().find(isRealMessage);
    if (!latestRealMessage) {
      await refresh();
      return;
    }

    try {
      const result = await teamChatApiClient.getCaseMessages(caseId, {
        limit: 100,
        after_message_id: latestRealMessage.id,
      });

      if (result.messages.length > 0) {
        setMessages((current) =>
          mergeMessages([
            ...current,
            ...result.messages.map((message) => toStableMessage(message)),
          ])
        );
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to poll latest messages');
    }
  }, [caseId, enabled, messages, refresh]);

  const loadOlderMessages = useCallback(async (): Promise<number> => {
    if (!enabled) {
      return 0;
    }

    const earliestRealMessage = messages.find(isRealMessage);
    if (!earliestRealMessage) {
      return 0;
    }

    try {
      const result = await teamChatApiClient.getCaseMessages(caseId, {
        limit: 50,
        before_message_id: earliestRealMessage.id,
      });

      if (result.messages.length > 0) {
        setMessages((current) =>
          mergeMessages([
            ...result.messages.map((message) => toStableMessage(message)),
            ...current,
          ])
        );
      }

      setError(null);
      return result.messages.length;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load older messages');
      return 0;
    }
  }, [caseId, enabled, messages]);

  const markRead = useCallback(
    async (messageId?: string) => {
      if (!enabled) {
        return;
      }

      try {
        const result = await teamChatApiClient.markCaseRead(
          caseId,
          messageId ? { message_id: messageId } : {}
        );

        setRoom((current) => result.room || (
          current
            ? {
                ...current,
                unread_count: result.unread_count,
                unread_mentions_count: result.unread_mentions_count,
              }
            : current
        ));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update read cursor');
      }
    },
    [caseId, enabled]
  );

  const sendMessage = useCallback(
    async (
      payload: TeamChatMessageCreateDTO,
      sender: { id: string; firstName?: string | null; lastName?: string | null }
    ) => {
      if (!enabled) {
        return;
      }

      const trimmedBody = payload.body.trim();
      if (!trimmedBody) {
        return;
      }

      const clientMessageId = payload.client_message_id || createClientMessageId();
      const optimisticMessage = buildOptimisticMessage(
        room?.room_id || null,
        {
          ...payload,
          body: trimmedBody,
          client_message_id: clientMessageId,
        },
        sender
      );

      setSendingCount((current) => current + 1);
      setError(null);
      setMessages((current) => mergeMessages([...current, optimisticMessage]));

      try {
        const created = await teamChatApiClient.sendCaseMessage(caseId, {
          ...payload,
          body: trimmedBody,
          client_message_id: clientMessageId,
        });

        setMessages((current) => reconcileCanonicalMessage(current, created.message));
        setRoom((current) => created.room || (
          current
            ? {
                ...current,
                room_id: created.room_id,
                last_message_at: created.message.created_at,
                last_message_preview: created.message.body.slice(0, 255),
                message_count: current.message_count + 1,
              }
            : current
        ));
        await markRead(created.message.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setMessages((current) => markMessageFailed(current, clientMessageId, message));
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setSendingCount((current) => Math.max(0, current - 1));
      }
    },
    [caseId, enabled, markRead, room?.room_id]
  );

  const retryMessage = useCallback(
    async (
      messageId: string,
      sender: { id: string; firstName?: string | null; lastName?: string | null }
    ) => {
      const target = messages.find((message) => message.id === messageId);
      const clientMessageId = target?.client_message_id;
      if (!clientMessageId) {
        return;
      }

      setMessages((current) => markMessageSending(current, clientMessageId));
      await sendMessage(
        {
          body: target.body,
          parent_message_id: target.parent_message_id,
          mention_user_ids: target.mention_user_ids,
          client_message_id: clientMessageId,
        },
        sender
      );
    },
    [messages, sendMessage]
  );

  const addMember = useCallback(
    async (userId: string, role?: TeamChatMember['membership_role']) => {
      if (!enabled) {
        return;
      }

      try {
        const updatedMembers = await teamChatApiClient.addCaseMember(caseId, {
          user_id: userId,
          membership_role: role,
        });
        setMembers(updatedMembers);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add room member');
      }
    },
    [caseId, enabled]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!enabled) {
        return;
      }

      try {
        const result = await teamChatApiClient.removeCaseMember(caseId, userId);
        setMembers(result.members);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove room member');
      }
    },
    [caseId, enabled]
  );

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const streamStatus = useTeamChatRealtimeStream<
    | TeamChatCaseMessageCreatedEventPayload
    | TeamChatCaseReadEventPayload
    | TeamChatCaseMemberEventPayload
  >({
    endpointPath: `/v2/team-chat/cases/${caseId}/stream`,
    channels: CASE_STREAM_CHANNELS,
    eventNames: CASE_STREAM_EVENT_NAMES,
    enabled,
    onEvent: (eventName, payload) => {
      if (eventName === 'team_chat.message.created') {
        const messagePayload = payload as TeamChatCaseMessageCreatedEventPayload;
        setMessages((current) => reconcileCanonicalMessage(current, messagePayload.message));
        setRoom(messagePayload.room);
        return;
      }

      if (eventName === 'team_chat.room.read') {
        const readPayload = payload as TeamChatCaseReadEventPayload;
        setRoom(readPayload.room);
        return;
      }

      const memberPayload = payload as TeamChatCaseMemberEventPayload;
      setMembers(memberPayload.members);
    },
  });

  useVisibilityPolling(pollLatestMessages, {
    enabled: enabled && streamStatus !== 'connected',
    intervalMs: 15000,
    runImmediately: false,
  });

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.sender_user_id === currentUserId) {
      return;
    }

    void markRead(latestMessage.id);
  }, [currentUserId, markRead, messages]);

  const stableMessages = useMemo(() => mergeMessages(messages), [messages]);

  return {
    room,
    members,
    messages: stableMessages,
    loading,
    sending: sendingCount > 0,
    error,
    streamStatus,
    refresh,
    pollLatestMessages,
    loadOlderMessages,
    sendMessage,
    retryMessage,
    markRead,
    addMember,
    removeMember,
  };
}
