import { startTransition, useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  mergeConversationSummary,
  mergeConversationSummaryForEvent,
  mergeRenderableMessages,
  toRenderableMessage,
} from './teamMessengerState';
import type {
  TeamMessengerConnectedPayload,
  TeamMessengerConversationDetail,
  TeamMessengerConversationSummary,
  TeamMessengerMemberEventPayload,
  TeamMessengerMessageCreatedEventPayload,
  TeamMessengerPresenceState,
  TeamMessengerRoomReadEventPayload,
  TeamMessengerTypingEvent,
} from './types';

type SetState<T> = Dispatch<SetStateAction<T>>;

interface UseTeamMessengerRealtimeHandlersOptions {
  currentUserId: string | null;
  selectedRoomId: string | null;
  setConversationDetails: SetState<Record<string, TeamMessengerConversationDetail | undefined>>;
  setConversations: SetState<TeamMessengerConversationSummary[]>;
  setPresenceByUserId: SetState<Record<string, 'online' | 'offline'>>;
  setTypingByRoomId: SetState<Record<string, string[]>>;
}

export function useTeamMessengerRealtimeHandlers({
  currentUserId,
  selectedRoomId,
  setConversationDetails,
  setConversations,
  setPresenceByUserId,
  setTypingByRoomId,
}: UseTeamMessengerRealtimeHandlersOptions) {
  const handleConnected = useCallback((payload: TeamMessengerConnectedPayload) => {
    startTransition(() => {
      setPresenceByUserId((current) => {
        let hasChanges = false;
        const next: Record<string, 'online' | 'offline'> = { ...current };
        for (const userId of payload.online_user_ids) {
          if (next[userId] !== 'online') {
            next[userId] = 'online';
            hasChanges = true;
          }
        }
        return hasChanges ? next : current;
      });
    });
  }, [setPresenceByUserId]);

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
          setPresenceByUserId((current) =>
            current[presence.user_id] === presence.status
              ? current
              : {
                  ...current,
                  [presence.user_id]: presence.status,
                }
          );
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
                  messagePayload.actor_user_id === currentUserId
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
              currentUserId,
              isSelected: selectedRoomId === roomId,
              mentionUserIds: messagePayload.message.mention_user_ids,
            })
          );
        });
        return;
      }

      if (eventName === 'team_chat.room.read') {
        const readPayload = payload as TeamMessengerRoomReadEventPayload;
        if (readPayload.actor_user_id !== currentUserId) {
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
    [
      currentUserId,
      selectedRoomId,
      setConversationDetails,
      setConversations,
      setPresenceByUserId,
      setTypingByRoomId,
    ]
  );

  return {
    handleConnected,
    handleRealtimeEvent,
  };
}
