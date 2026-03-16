import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type TeamChatRealtimeStreamStatus = 'disabled' | 'connecting' | 'connected' | 'error';

const resolveApiBaseUrl = (): string => {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

interface UseTeamChatRealtimeStreamOptions<TPayload> {
  endpointPath: string;
  channels: readonly string[];
  eventNames: readonly string[];
  enabled?: boolean;
  onConnected?: (payload: { connection_id: string; channels: string[]; online_user_ids?: string[] }) => void;
  onEvent?: (eventName: string, payload: TPayload) => void;
}

export function useTeamChatRealtimeStream<TPayload>({
  endpointPath,
  channels,
  eventNames,
  enabled = true,
  onConnected,
  onEvent,
}: UseTeamChatRealtimeStreamOptions<TPayload>): TeamChatRealtimeStreamStatus {
  const [status, setStatus] = useState<TeamChatRealtimeStreamStatus>('disabled');
  const streamRef = useRef<EventSource | null>(null);
  const realtimeEnabled = import.meta.env.VITE_TEAM_CHAT_REALTIME_ENABLED !== 'false';
  const channelKey = useMemo(() => channels.join(','), [channels]);
  const eventKey = useMemo(() => eventNames.join(','), [eventNames]);

  const streamUrl = useMemo(() => {
    const base = resolveApiBaseUrl();
    const params = new URLSearchParams();
    if (channelKey) {
      params.set('channels', channelKey);
    }

    return `${base}${endpointPath}${params.toString() ? `?${params.toString()}` : ''}`;
  }, [channelKey, endpointPath]);

  useEffect(() => {
    if (!enabled || !realtimeEnabled) {
      setStatus('disabled');
      return;
    }

    setStatus('connecting');
    const stream = new EventSource(streamUrl, { withCredentials: true });
    streamRef.current = stream;

    stream.onopen = () => {
      setStatus('connected');
    };

    stream.onerror = () => {
      setStatus('error');
    };

    stream.addEventListener('connected', (event) => {
      if (!onConnected || !(event instanceof MessageEvent)) {
        return;
      }

      try {
        onConnected(
          JSON.parse(event.data) as {
            connection_id: string;
            channels: string[];
            online_user_ids?: string[];
          }
        );
      } catch {
        // Ignore malformed payloads.
      }
    });

    for (const eventName of eventNames) {
      stream.addEventListener(eventName, (event) => {
        if (!onEvent || !(event instanceof MessageEvent)) {
          return;
        }

        try {
          onEvent(eventName, JSON.parse(event.data) as TPayload);
        } catch {
          // Ignore malformed payloads.
        }
      });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, [enabled, eventKey, eventNames, onConnected, onEvent, realtimeEnabled, streamUrl]);

  return status;
}
