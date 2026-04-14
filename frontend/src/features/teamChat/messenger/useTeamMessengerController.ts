import { createClientMessageId } from '../../messaging/composer';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling';
import { teamMessengerApiClient } from '../api/teamMessengerApi';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useTeamMessengerRealtimeStream } from './useTeamMessengerRealtimeStream';
import { useTeamMessengerDockState } from './useTeamMessengerDockState';
import { useTeamMessengerRealtimeHandlers } from './useTeamMessengerRealtimeHandlers';
import {
  applyPresence,
  buildConversationMap,
  buildOptimisticMessage,
  mergeConversationSummary,
  mergeRenderableMessages,
  toRenderableMessage,
} from './teamMessengerState';
import type {
  TeamMessengerContact,
  TeamMessengerConversationDetail,
  TeamMessengerConversationMemberUpdateDTO,
  TeamMessengerConversationMessageCreateDTO,
  TeamMessengerConversationSummary,
  TeamMessengerConversationUpdateDTO,
  TeamMessengerGroupConversationCreateDTO,
  TeamMessengerStreamStatus,
} from './types';

interface TeamMessengerCurrentUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface TeamMessengerControllerValue {
  loading: boolean;
  conversations: TeamMessengerConversationSummary[];
  contacts: TeamMessengerContact[];
  selectedRoomId: string | null;
  setSelectedRoomId: (roomId: string | null) => void;
  openRoomIds: string[];
  visibleRoomIds: string[];
  minimizedRoomIds: string[];
  unreadCount: number;
  streamStatus: TeamMessengerStreamStatus;
  launcherOpen: boolean;
  setLauncherOpen: (open: boolean) => void;
  conversationDetails: Record<string, TeamMessengerConversationDetail | undefined>;
  typingByRoomId: Record<string, string[]>;
  openConversation: (roomId: string) => Promise<void>;
  closeConversation: (roomId: string) => void;
  toggleMinimized: (roomId: string) => void;
  refresh: () => Promise<void>;
  startDirectConversation: (participantUserId: string) => Promise<void>;
  createGroupConversation: (payload: TeamMessengerGroupConversationCreateDTO) => Promise<void>;
  sendMessage: (roomId: string, payload: TeamMessengerConversationMessageCreateDTO) => Promise<void>;
  retryMessage: (roomId: string, messageId: string) => Promise<void>;
  markConversationRead: (roomId: string, messageId?: string) => Promise<void>;
  updateTyping: (roomId: string, isTyping: boolean) => Promise<void>;
  updateConversation: (roomId: string, payload: TeamMessengerConversationUpdateDTO) => Promise<void>;
  addConversationMember: (
    roomId: string,
    payload: TeamMessengerConversationMemberUpdateDTO
  ) => Promise<void>;
  removeConversationMember: (roomId: string, userId: string) => Promise<void>;
  getPresenceStatus: (userId: string | null | undefined) => 'online' | 'offline';
}

interface UseTeamMessengerControllerOptions {
  enabled: boolean;
  user: TeamMessengerCurrentUser | null;
}

export function useTeamMessengerController({
  enabled,
  user,
}: UseTeamMessengerControllerOptions): TeamMessengerControllerValue {
  const [loading, setLoading] = useState(enabled);
  const [conversations, setConversations] = useState<TeamMessengerConversationSummary[]>([]);
  const [contacts, setContacts] = useState<TeamMessengerContact[]>([]);
  const [conversationDetails, setConversationDetails] = useState<
    Record<string, TeamMessengerConversationDetail | undefined>
  >({});
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, 'online' | 'offline'>>({});
  const [typingByRoomId, setTypingByRoomId] = useState<Record<string, string[]>>({});
  const { dockState, openDockRoom, closeDockRoom, toggleDockRoomMinimized, visibleRoomIds } =
    useTeamMessengerDockState();

  const getPresenceStatus = useCallback(
    (userId: string | null | undefined): 'online' | 'offline' => {
      if (!userId) {
        return 'offline';
      }

      return presenceByUserId[userId] || 'offline';
    },
    [presenceByUserId]
  );

  const refreshConversations = useCallback(async () => {
    if (!enabled) {
      startTransition(() => {
        setConversations([]);
      });
      return;
    }

    const nextConversations = await teamMessengerApiClient.listConversations();
    startTransition(() => {
      setConversations(nextConversations);
    });
  }, [enabled]);

  const refreshContacts = useCallback(async () => {
    if (!enabled) {
      startTransition(() => {
        setContacts([]);
        setPresenceByUserId({});
      });
      return;
    }

    const nextContacts = await teamMessengerApiClient.listContacts();
    startTransition(() => {
      setContacts(nextContacts);
    });
  }, [enabled]);

  const refreshConversation = useCallback(
    async (roomId: string): Promise<TeamMessengerConversationDetail> => {
      const detail = await teamMessengerApiClient.getConversation(roomId);
      startTransition(() => {
        setConversationDetails((current) => {
          const failedMessages =
            current[roomId]?.messages.filter((message) => message.send_state === 'failed') || [];
          return {
            ...buildConversationMap(current, detail),
            [roomId]: {
              ...detail,
              messages: mergeRenderableMessages([
                ...failedMessages,
                ...detail.messages.map((message) => toRenderableMessage(message)),
              ]),
            },
          };
        });
        setConversations((current) => mergeConversationSummary(current, detail.room));
      });
      return detail;
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await Promise.all([refreshConversations(), refreshContacts()]);
    } finally {
      setLoading(false);
    }
  }, [enabled, refreshContacts, refreshConversations]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const openConversation = useCallback(
    async (roomId: string) => {
      if (!enabled) {
        return;
      }

      await refreshConversation(roomId);
      setSelectedRoomId(roomId);
      openDockRoom(roomId);
    },
    [enabled, openDockRoom, refreshConversation]
  );

  const closeConversation = useCallback(
    (roomId: string) => {
      closeDockRoom(roomId);
      startTransition(() => {
        setSelectedRoomId((current) => (current === roomId ? null : current));
        setTypingByRoomId((current) => {
          const next = { ...current };
          delete next[roomId];
          return next;
        });
      });
    },
    [closeDockRoom]
  );

  const toggleMinimized = useCallback(
    (roomId: string) => {
      toggleDockRoomMinimized(roomId);
      setSelectedRoomId(roomId);
    },
    [toggleDockRoomMinimized]
  );

  const startDirectConversation = useCallback(
    async (participantUserId: string) => {
      const detail = await teamMessengerApiClient.startDirectConversation({
        participant_user_id: participantUserId,
      });

      startTransition(() => {
        setConversationDetails((current) => buildConversationMap(current, detail));
        setConversations((current) => mergeConversationSummary(current, detail.room));
      });

      await openConversation(detail.room.room_id);
      setLauncherOpen(false);
    },
    [openConversation]
  );

  const createGroupConversation = useCallback(
    async (payload: TeamMessengerGroupConversationCreateDTO) => {
      const detail = await teamMessengerApiClient.createGroupConversation(payload);
      startTransition(() => {
        setConversationDetails((current) => buildConversationMap(current, detail));
        setConversations((current) => mergeConversationSummary(current, detail.room));
      });
      await openConversation(detail.room.room_id);
      setLauncherOpen(false);
    },
    [openConversation]
  );

  const sendMessage = useCallback(
    async (roomId: string, payload: TeamMessengerConversationMessageCreateDTO) => {
      if (!user?.id) {
        return;
      }

      const trimmedBody = payload.body.trim();
      if (!trimmedBody) {
        return;
      }

      const clientMessageId = payload.client_message_id || createClientMessageId();
      const optimisticMessage = buildOptimisticMessage(
        roomId,
        {
          ...payload,
          body: trimmedBody,
          client_message_id: clientMessageId,
        },
        user
      );

      startTransition(() => {
        setConversationDetails((current) => {
          const detail = current[roomId];
          if (!detail) {
            return current;
          }

          return {
            ...current,
            [roomId]: {
              ...detail,
              messages: mergeRenderableMessages([...detail.messages, optimisticMessage]),
            },
          };
        });
      });

      try {
        const created = await teamMessengerApiClient.sendMessage(roomId, {
          ...payload,
          body: trimmedBody,
          client_message_id: clientMessageId,
        });

        startTransition(() => {
          setConversationDetails((current) => {
            const detail = current[roomId];
            if (!detail) {
              return current;
            }

            return {
              ...current,
              [roomId]: {
                ...detail,
                room: created.room || detail.room,
                messages: mergeRenderableMessages(
                  detail.messages.map((message) =>
                    message.client_message_id === created.message.client_message_id ||
                    message.id === created.message.id
                      ? toRenderableMessage(created.message)
                      : message
                  )
                ),
              },
            };
          });
          setConversations((current) =>
            created.room ? mergeConversationSummary(current, created.room) : current
          );
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send messenger message';
        startTransition(() => {
          setConversationDetails((current) => {
            const detail = current[roomId];
            if (!detail) {
              return current;
            }

            return {
              ...current,
              [roomId]: {
                ...detail,
                messages: mergeRenderableMessages(
                  detail.messages.map((entry) =>
                    entry.client_message_id === clientMessageId
                      ? {
                          ...entry,
                          send_state: 'failed',
                          send_error: message,
                          optimistic: true,
                        }
                      : entry
                  )
                ),
              },
            };
          });
        });
        throw error instanceof Error ? error : new Error(message);
      }
    },
    [user]
  );

  const retryMessage = useCallback(
    async (roomId: string, messageId: string) => {
      const detail = conversationDetails[roomId];
      const target = detail?.messages.find((message) => message.id === messageId);
      if (!target?.client_message_id) {
        return;
      }

      startTransition(() => {
        setConversationDetails((current) => {
          const currentDetail = current[roomId];
          if (!currentDetail) {
            return current;
          }

          return {
            ...current,
            [roomId]: {
              ...currentDetail,
              messages: mergeRenderableMessages(
                currentDetail.messages.map((message) =>
                  message.client_message_id === target.client_message_id
                    ? {
                        ...message,
                        send_state: 'sending',
                        send_error: null,
                        optimistic: true,
                      }
                    : message
                )
              ),
            },
          };
        });
      });

      await sendMessage(roomId, {
        body: target.body,
        parent_message_id: target.parent_message_id,
        mention_user_ids: target.mention_user_ids,
        client_message_id: target.client_message_id,
      });
    },
    [conversationDetails, sendMessage]
  );

  const markConversationRead = useCallback(
    async (roomId: string, messageId?: string) => {
      const result = await teamMessengerApiClient.markRead(
        roomId,
        messageId ? { message_id: messageId } : {}
      );

      startTransition(() => {
        setConversationDetails((current) => {
          const detail = current[roomId];
          if (!detail) {
            return current;
          }

          return {
            ...current,
            [roomId]: {
              ...detail,
              room: result.room || {
                ...detail.room,
                unread_count: result.unread_count,
                unread_mentions_count: result.unread_mentions_count,
              },
            },
          };
        });
        setConversations((current) => {
          const existing = current.find((entry) => entry.room_id === roomId);
          if (!existing) {
            return current;
          }

          return mergeConversationSummary(current, result.room || {
            ...existing,
            unread_count: result.unread_count,
            unread_mentions_count: result.unread_mentions_count,
          });
        });
      });
    },
    []
  );

  const updateTyping = useCallback(async (roomId: string, isTyping: boolean) => {
    await teamMessengerApiClient.updateTyping(roomId, {
      is_typing: isTyping,
    });
  }, []);

  const updateConversation = useCallback(
    async (roomId: string, payload: TeamMessengerConversationUpdateDTO) => {
      const detail = await teamMessengerApiClient.updateConversation(roomId, payload);
      startTransition(() => {
        setConversationDetails((current) => buildConversationMap(current, detail));
        setConversations((current) => mergeConversationSummary(current, detail.room));
      });
    },
    []
  );

  const addConversationMember = useCallback(
    async (roomId: string, payload: TeamMessengerConversationMemberUpdateDTO) => {
      const detail = await teamMessengerApiClient.addMember(roomId, payload);
      startTransition(() => {
        setConversationDetails((current) => buildConversationMap(current, detail));
        setConversations((current) => mergeConversationSummary(current, detail.room));
      });
    },
    []
  );

  const removeConversationMember = useCallback(async (roomId: string, userId: string) => {
    const detail = await teamMessengerApiClient.removeMember(roomId, userId);
    startTransition(() => {
      setConversationDetails((current) => buildConversationMap(current, detail));
      setConversations((current) => mergeConversationSummary(current, detail.room));
    });
  }, []);

  const { handleConnected, handleRealtimeEvent } = useTeamMessengerRealtimeHandlers({
    currentUserId: user?.id || null,
    selectedRoomId,
    setConversationDetails,
    setConversations,
    setPresenceByUserId,
    setTypingByRoomId,
  });

  const streamStatus = useTeamMessengerRealtimeStream({
    enabled,
    onConnected: handleConnected,
    onEvent: handleRealtimeEvent,
  });

  useEffect(() => {
    startTransition(() => {
      setContacts((current) => applyPresence(current, presenceByUserId));
    });
  }, [presenceByUserId]);

  useVisibilityPolling(refreshConversations, {
    enabled: enabled && streamStatus !== 'connected',
    intervalMs: 30000,
    runImmediately: false,
  });

  useVisibilityPolling(
    async () => {
      if (dockState.openRoomIds.length === 0 && !selectedRoomId) {
        return;
      }

      const roomIds = new Set([
        ...dockState.openRoomIds,
        ...(selectedRoomId ? [selectedRoomId] : []),
      ]);
      await Promise.all(Array.from(roomIds).map((roomId) => refreshConversation(roomId)));
    },
    {
      enabled: enabled && streamStatus !== 'connected',
      intervalMs: 15000,
      runImmediately: false,
    }
  );

  const unreadCount = useMemo(
    () =>
      conversations.reduce(
        (sum, conversation) =>
          sum + conversation.unread_count + conversation.unread_mentions_count,
        0
      ),
    [conversations]
  );

  return useMemo(
    () => ({
      loading,
      conversations,
      contacts,
      selectedRoomId,
      setSelectedRoomId,
      openRoomIds: dockState.openRoomIds,
      visibleRoomIds,
      minimizedRoomIds: dockState.minimizedRoomIds,
      unreadCount,
      streamStatus,
      launcherOpen,
      setLauncherOpen,
      conversationDetails,
      typingByRoomId,
      openConversation,
      closeConversation,
      toggleMinimized,
      refresh,
      startDirectConversation,
      createGroupConversation,
      sendMessage,
      retryMessage,
      markConversationRead,
      updateTyping,
      updateConversation,
      addConversationMember,
      removeConversationMember,
      getPresenceStatus,
    }),
    [
      addConversationMember,
      closeConversation,
      contacts,
      conversationDetails,
      conversations,
      createGroupConversation,
      dockState.minimizedRoomIds,
      dockState.openRoomIds,
      getPresenceStatus,
      launcherOpen,
      loading,
      markConversationRead,
      openConversation,
      refresh,
      removeConversationMember,
      retryMessage,
      selectedRoomId,
      sendMessage,
      startDirectConversation,
      streamStatus,
      toggleMinimized,
      typingByRoomId,
      unreadCount,
      updateConversation,
      updateTyping,
      visibleRoomIds,
    ]
  );
}
