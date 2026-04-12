import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PortalRealtimeEventName,
  PortalRealtimeEventPayload,
  PortalStreamStatus,
} from './types';

const EVENT_NAMES: PortalRealtimeEventName[] = [
  'portal.thread.updated',
  'portal.appointment.updated',
  'portal.slot.updated',
];

const resolveApiBaseUrl = (): string => {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

interface UsePortalRealtimeStreamOptions {
  endpointPath: string;
  channels: readonly string[];
  enabled?: boolean;
  onEvent?: (eventName: PortalRealtimeEventName, payload: PortalRealtimeEventPayload) => void;
}

export function usePortalRealtimeStream({
  endpointPath,
  channels,
  enabled = true,
  onEvent,
}: UsePortalRealtimeStreamOptions): PortalStreamStatus {
  const [status, setStatus] = useState<PortalStreamStatus>('disabled');
  const streamRef = useRef<EventSource | null>(null);
  const onEventRef = useRef<typeof onEvent>(onEvent);
  onEventRef.current = onEvent;
  const realtimeEnabled = import.meta.env.VITE_PORTAL_REALTIME_ENABLED === 'true';
  const channelKey = useMemo(() => channels.join(','), [channels]);

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
    let stream: EventSource;
    try {
      stream = new EventSource(streamUrl, { withCredentials: true });
    } catch {
      setStatus('error');
      return;
    }
    streamRef.current = stream;

    stream.onopen = () => {
      setStatus('connected');
    };

    stream.onerror = () => {
      setStatus('error');
    };

    for (const eventName of EVENT_NAMES) {
      stream.addEventListener(eventName, (event) => {
        const latestOnEvent = onEventRef.current;
        if (!latestOnEvent || !(event instanceof MessageEvent)) {
          return;
        }

        try {
          const payload = JSON.parse(event.data) as PortalRealtimeEventPayload;
          latestOnEvent(eventName, payload);
        } catch {
          // Ignore malformed event payloads.
        }
      });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, [enabled, realtimeEnabled, streamUrl]);

  return status;
}

export default usePortalRealtimeStream;
