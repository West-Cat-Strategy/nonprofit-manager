import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClientMessageId } from '../../messaging/composer';
import { pickPreferredMessageVersion } from '../../messaging/messageMerge';
import { useAppSelector } from '../../../store/hooks';
import { teamMessengerApiClient } from '../api/teamMessengerApi';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling';
import { useTeamMessengerRealtimeStream } from './useTeamMessengerRealtimeStream';
import type {
  TeamMessengerConnectedPayload,
  TeamMessengerContact,
  TeamMessengerConversationDetail,
  TeamMessengerConversationMemberUpdateDTO,
  TeamMessengerConversationMessageCreateDTO,
  TeamMessengerConversationSummary,
  TeamMessengerConversationUpdateDTO,
  TeamMessengerGroupConversationCreateDTO,
  TeamMessengerMemberEventPayload,
  TeamMessengerMessageCreatedEventPayload,
  TeamMessengerPresenceState,
  TeamMessengerRenderableMessage,
  TeamMessengerRoomReadEventPayload,
  TeamMessengerStreamStatus,
  TeamMessengerTypingEvent,
} from './types';

const STORAGE_KEY = 'team_messenger_dock_state_v1';
const TEMP_PREFIX = 'temp-message-';
const teamChatEnabled = import.meta.env.VITE_TEAM_CHAT_ENABLED !== 'false';

interface TeamMessengerDockState {
  openRoomIds: string[];
  minimizedRoomIds: string[];
}

interface TeamMessengerContextValue {
  enabled: boolean;
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

const TeamMessengerContext = createContext<TeamMessengerContextValue | null>(null);

const loadDockState = (): TeamMessengerDockState => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return { openRoomIds: [], minimizedRoomIds: [] };
    }

    const parsed = JSON.parse(rawValue) as Partial<TeamMessengerDockState>;
    return {
      openRoomIds: Array.isArray(parsed.openRoomIds) ? parsed.openRoomIds.filter(Boolean) : [],
      minimizedRoomIds: Array.isArray(parsed.minimizedRoomIds)
        ? parsed.minimizedRoomIds.filter(Boolean)
        : [],
    };
  } catch {
    return { openRoomIds: [], minimizedRoomIds: [] };
  }
};

const sortMessages = (
  left: TeamMessengerRenderableMessage,
  right: TeamMessengerRenderableMessage
): number => {
  const leftTime = new Date(left.created_at).getTime();
  const rightTime = new Date(right.created_at).getTime();

  if (leftTime === rightTime) {
    return left.id.localeCompare(right.id);
  }

  return leftTime - rightTime;
};

const toRenderableMessage = (
  message: TeamMessengerRenderableMessage
): TeamMessengerRenderableMessage => ({
  ...message,
  optimistic: false,
  send_state: 'sent',
  send_error: null,
});

const mergeRenderableMessages = (
  messages: TeamMessengerRenderableMessage[]
): TeamMessengerRenderableMessage[] => {
  const byKey = new Map<string, TeamMessengerRenderableMessage>();

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

  return Array.from(byKey.values()).sort(sortMessages);
};

const mergeConversationSummary = (
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

const mergeConversationSummaryForEvent = (
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
    unread_count:
      currentSummary?.unread_count || 0,
    unread_mentions_count:
      currentSummary?.unread_mentions_count || 0,
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

const buildConversationMap = (
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

const buildOptimisticMessage = (
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

const applyPresence = (
  contacts: TeamMessengerContact[],
  presenceByUserId: Record<string, 'online' | 'offline'>
): TeamMessengerContact[] =>
  contacts.map((contact) => ({
    ...contact,
    presence_status: presenceByUserId[contact.user_id] || contact.presence_status,
  }));

export function TeamMessengerProvider({ children }: { children: ReactNode }) {
  const { user } = useAppSelector((state) => state.auth);
  const enabled =
    teamChatEnabled &&
    Boolean(user?.id) &&
    ['admin', 'manager', 'staff'].includes((user?.role || '').toLowerCase());

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
  const [dockState, setDockState] = useState<TeamMessengerDockState>(() =>
    typeof window === 'undefined' ? { openRoomIds: [], minimizedRoomIds: [] } : loadDockState()
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dockState));
  }, [dockState]);

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
    void refresh();
  }, [refresh]);

  const openConversation = useCallback(
    async (roomId: string) => {
      if (!enabled) {
        return;
      }

      await refreshConversation(roomId);
      startTransition(() => {
        setSelectedRoomId(roomId);
        setDockState((current) => ({
          openRoomIds: [...current.openRoomIds.filter((entry) => entry !== roomId), roomId],
          minimizedRoomIds: current.minimizedRoomIds.filter((entry) => entry !== roomId),
        }));
      });
    },
    [enabled, refreshConversation]
  );

  const closeConversation = useCallback((roomId: string) => {
    startTransition(() => {
      setDockState((current) => ({
        openRoomIds: current.openRoomIds.filter((entry) => entry !== roomId),
        minimizedRoomIds: current.minimizedRoomIds.filter((entry) => entry !== roomId),
      }));
      setSelectedRoomId((current) => (current === roomId ? null : current));
      setTypingByRoomId((current) => {
        const next = { ...current };
        delete next[roomId];
        return next;
      });
    });
  }, []);

  const toggleMinimized = useCallback((roomId: string) => {
    startTransition(() => {
      setDockState((current) => {
        const minimized = current.minimizedRoomIds.includes(roomId);
        return {
          openRoomIds: minimized
            ? [...current.openRoomIds.filter((entry) => entry !== roomId), roomId]
            : current.openRoomIds,
          minimizedRoomIds: minimized
            ? current.minimizedRoomIds.filter((entry) => entry !== roomId)
            : [...current.minimizedRoomIds, roomId],
        };
      });
      setSelectedRoomId(roomId);
    });
  }, []);

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
        {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        }
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
          if (created.room) {
            setConversations((current) => mergeConversationSummary(current, created.room));
          }
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

  const handleConnected = useCallback((payload: TeamMessengerConnectedPayload) => {
    startTransition(() => {
      setPresenceByUserId((current) => {
        const next: Record<string, 'online' | 'offline'> = { ...current };
        for (const userId of payload.online_user_ids) {
          next[userId] = 'online';
        }
        return next;
      });
    });
  }, []);

  const handleRealtimeEvent = useCallback(
    (
      eventName: string,
      payload:
        | TeamMessengerMessageCreatedEventPayload
        | TeamMessengerRoomReadEventPayload
        | TeamMessengerMemberEventPayload
        | TeamMessengerPresenceState
        | TeamMessengerTypingEvent
    ) => {
      if (eventName === 'team_chat.presence.updated') {
        const presence = payload as TeamMessengerPresenceState;
        startTransition(() => {
          setPresenceByUserId((current) => ({
            ...current,
            [presence.user_id]: presence.status,
          }));
        });
        return;
      }

      if (eventName === 'team_chat.typing.updated') {
        const typing = payload as TeamMessengerTypingEvent;
        startTransition(() => {
          setTypingByRoomId((current) => {
            const existing = new Set(current[typing.room_id] || []);
            if (typing.is_typing) {
              existing.add(typing.user_id);
            } else {
              existing.delete(typing.user_id);
            }

            return {
              ...current,
              [typing.room_id]: Array.from(existing),
            };
          });
        });
        return;
      }

      const roomId =
        typeof payload === 'object' && payload && 'room_id' in payload
          ? String((payload as { room_id: string }).room_id)
          : null;

      if (!roomId) {
        return;
      }

      if (eventName === 'team_chat.message.created') {
        const messagePayload = payload as TeamMessengerMessageCreatedEventPayload;
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
                room:
                  messagePayload.actor_user_id === user?.id
                    ? messagePayload.room
                    : {
                        ...detail.room,
                        last_message_at: messagePayload.room.last_message_at,
                        last_message_preview: messagePayload.room.last_message_preview,
                        message_count: messagePayload.room.message_count,
                      },
                messages: mergeRenderableMessages([
                  ...detail.messages,
                  toRenderableMessage(messagePayload.message),
                ]),
              },
            };
          });
          setConversations((current) =>
            mergeConversationSummaryForEvent(current, messagePayload.room, {
              actorUserId: messagePayload.actor_user_id,
              currentUserId: user?.id || null,
              isSelected: selectedRoomId === roomId,
              mentionUserIds: messagePayload.message.mention_user_ids,
            })
          );
        });
        return;
      }

      if (eventName === 'team_chat.room.read') {
        const readPayload = payload as TeamMessengerRoomReadEventPayload;
        if (readPayload.actor_user_id !== user?.id) {
          return;
        }

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
                room: readPayload.room,
              },
            };
          });
          setConversations((current) => mergeConversationSummary(current, readPayload.room));
        });
        return;
      }

      const memberPayload = payload as TeamMessengerMemberEventPayload;
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
              room: {
                ...detail.room,
                ...memberPayload.room,
                unread_count: detail.room.unread_count,
                unread_mentions_count: detail.room.unread_mentions_count,
              },
              members: memberPayload.members,
            },
          };
        });
        setConversations((current) => {
          const existing = current.find((entry) => entry.room_id === roomId);
          if (!existing) {
            return current;
          }

          return mergeConversationSummary(current, {
            ...existing,
            ...memberPayload.room,
            unread_count: existing.unread_count,
            unread_mentions_count: existing.unread_mentions_count,
            member_count: memberPayload.members.length,
          });
        });
      });
    },
    [selectedRoomId, user?.id]
  );

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

  const visibleRoomIds = useMemo(() => {
    const openIds = dockState.openRoomIds.filter(
      (roomId) => !dockState.minimizedRoomIds.includes(roomId)
    );
    return openIds.slice(-3);
  }, [dockState.minimizedRoomIds, dockState.openRoomIds]);

  const unreadCount = useMemo(
    () =>
      conversations.reduce(
        (sum, conversation) =>
          sum + conversation.unread_count + conversation.unread_mentions_count,
        0
      ),
    [conversations]
  );

  const value = useMemo<TeamMessengerContextValue>(
    () => ({
      enabled,
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
      enabled,
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
      streamStatus,
      startDirectConversation,
      toggleMinimized,
      typingByRoomId,
      unreadCount,
      updateConversation,
      updateTyping,
      visibleRoomIds,
    ]
  );

  return (
    <TeamMessengerContext.Provider value={value}>
      {children}
    </TeamMessengerContext.Provider>
  );
}

export const useTeamMessenger = (): TeamMessengerContextValue => {
  const context = useContext(TeamMessengerContext);
  if (!context) {
    throw new Error('useTeamMessenger must be used within a TeamMessengerProvider');
  }
  return context;
};
