import { useCallback, useEffect, useMemo, useState } from 'react';
import { teamChatApiClient } from '../api/teamChatApi';
import type {
  TeamChatMember,
  TeamChatMessage,
  TeamChatMessageCreateDTO,
  TeamChatRoomDetail,
} from '../types';
import { useVisibilityPolling } from './useVisibilityPolling';

const TEMP_PREFIX = 'temp-message-';

const sortByCreatedAt = (left: TeamChatMessage, right: TeamChatMessage): number => {
  const leftTime = new Date(left.created_at).getTime();
  const rightTime = new Date(right.created_at).getTime();

  if (leftTime === rightTime) {
    return left.id.localeCompare(right.id);
  }

  return leftTime - rightTime;
};

const mergeMessages = (messages: TeamChatMessage[]): TeamChatMessage[] => {
  const byId = new Map<string, TeamChatMessage>();

  for (const message of messages) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values()).sort(sortByCreatedAt);
};

const buildOptimisticMessage = (
  payload: TeamChatMessageCreateDTO,
  sender: { id: string; firstName?: string | null; lastName?: string | null }
): TeamChatMessage => ({
  id: `${TEMP_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  room_id: '',
  sender_user_id: sender.id,
  sender_first_name: sender.firstName || null,
  sender_last_name: sender.lastName || null,
  body: payload.body,
  parent_message_id: payload.parent_message_id || null,
  metadata: {
    optimistic: true,
  },
  created_at: new Date().toISOString(),
  edited_at: null,
  deleted_at: null,
  mention_user_ids: payload.mention_user_ids || [],
});

const isRealMessage = (message: TeamChatMessage): boolean => !message.id.startsWith(TEMP_PREFIX);

export interface UseTeamChatCaseChatOptions {
  caseId: string;
  enabled: boolean;
}

export interface UseTeamChatCaseChatResult {
  room: TeamChatRoomDetail['room'] | null;
  members: TeamChatMember[];
  messages: TeamChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  pollLatestMessages: () => Promise<void>;
  loadOlderMessages: () => Promise<number>;
  sendMessage: (
    payload: TeamChatMessageCreateDTO,
    sender: { id: string; firstName?: string | null; lastName?: string | null }
  ) => Promise<void>;
  markRead: (messageId?: string) => Promise<void>;
  addMember: (userId: string, role?: TeamChatMember['membership_role']) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

export function useTeamChatCaseChat(
  options: UseTeamChatCaseChatOptions
): UseTeamChatCaseChatResult {
  const { caseId, enabled } = options;
  const [room, setRoom] = useState<TeamChatRoomDetail['room'] | null>(null);
  const [members, setMembers] = useState<TeamChatMember[]>([]);
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
      setMessages(mergeMessages(detail.messages));
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
        setMessages((current) => mergeMessages([...current, ...result.messages]));
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
        setMessages((current) => mergeMessages([...result.messages, ...current]));
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

        setRoom((current) =>
          current
            ? {
                ...current,
                unread_count: result.unread_count,
                unread_mentions_count: result.unread_mentions_count,
              }
            : current
        );
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

      setSending(true);
      setError(null);
      const optimisticMessage = buildOptimisticMessage(
        {
          ...payload,
          body: trimmedBody,
        },
        sender
      );

      setMessages((current) => mergeMessages([...current, optimisticMessage]));

      try {
        const created = await teamChatApiClient.sendCaseMessage(caseId, {
          ...payload,
          body: trimmedBody,
        });

        setMessages((current) =>
          mergeMessages(
            current.map((message) =>
              message.id === optimisticMessage.id
                ? {
                    ...created.message,
                    room_id: created.room_id,
                  }
                : message
            )
          )
        );

        setRoom((current) =>
          current
            ? {
                ...current,
                room_id: created.room_id,
                last_message_at: created.message.created_at,
                last_message_preview: created.message.body.slice(0, 255),
                message_count: current.message_count + 1,
              }
            : current
        );

        await markRead(created.message.id);
      } catch (err) {
        setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setSending(false);
      }
    },
    [caseId, enabled, markRead]
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

  useVisibilityPolling(pollLatestMessages, {
    enabled,
    intervalMs: 15000,
    runImmediately: false,
  });

  const stableMessages = useMemo(() => mergeMessages(messages), [messages]);

  return {
    room,
    members,
    messages: stableMessages,
    loading,
    sending,
    error,
    refresh,
    pollLatestMessages,
    loadOlderMessages,
    sendMessage,
    markRead,
    addMember,
    removeMember,
  };
}
