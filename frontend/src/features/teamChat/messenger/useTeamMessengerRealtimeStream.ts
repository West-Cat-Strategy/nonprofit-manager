import { useTeamChatRealtimeStream } from '../hooks/useTeamChatRealtimeStream';
import type {
  TeamMessengerConnectedPayload,
  TeamMessengerMessageCreatedEventPayload,
  TeamMessengerMemberEventPayload,
  TeamMessengerPresenceState,
  TeamMessengerRoomReadEventPayload,
  TeamMessengerStreamStatus,
  TeamMessengerTypingEvent,
} from './types';

const EVENT_NAMES = [
  'team_chat.message.created',
  'team_chat.room.read',
  'team_chat.member.added',
  'team_chat.member.removed',
  'team_chat.presence.updated',
  'team_chat.typing.updated',
] as const;
const MESSENGER_STREAM_CHANNELS = ['messages', 'presence', 'typing', 'read', 'members'] as const;

type TeamMessengerRealtimePayload =
  | TeamMessengerMessageCreatedEventPayload
  | TeamMessengerRoomReadEventPayload
  | TeamMessengerMemberEventPayload
  | TeamMessengerPresenceState
  | TeamMessengerTypingEvent;

interface UseTeamMessengerRealtimeStreamOptions {
  enabled?: boolean;
  onConnected?: (payload: TeamMessengerConnectedPayload) => void;
  onEvent?: (
    eventName: (typeof EVENT_NAMES)[number],
    payload: TeamMessengerRealtimePayload
  ) => void;
}

export function useTeamMessengerRealtimeStream({
  enabled = true,
  onConnected,
  onEvent,
}: UseTeamMessengerRealtimeStreamOptions): TeamMessengerStreamStatus {
  return useTeamChatRealtimeStream<TeamMessengerRealtimePayload>({
    endpointPath: '/v2/team-chat/messenger/stream',
    channels: MESSENGER_STREAM_CHANNELS,
    eventNames: EVENT_NAMES,
    enabled,
    onConnected: onConnected
      ? (payload) =>
          onConnected({
            ...payload,
            online_user_ids: payload.online_user_ids || [],
          })
      : undefined,
    onEvent: onEvent
      ? (eventName, payload) => {
          if (EVENT_NAMES.includes(eventName as (typeof EVENT_NAMES)[number])) {
            onEvent(eventName as (typeof EVENT_NAMES)[number], payload);
          }
        }
      : undefined,
  });
}
