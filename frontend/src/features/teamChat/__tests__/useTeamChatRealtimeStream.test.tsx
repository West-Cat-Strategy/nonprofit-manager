import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTeamChatRealtimeStream } from '../hooks/useTeamChatRealtimeStream';

const originalEventSource = globalThis.EventSource;

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  withCredentials: boolean;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();
  private listeners = new Map<string, Array<(event: Event) => void>>();

  constructor(url: string | URL, init?: EventSourceInit) {
    this.url = String(url);
    this.withCredentials = init?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const listenerFn =
      typeof listener === 'function' ? listener : (event: Event) => listener.handleEvent(event);
    const existing = this.listeners.get(type) || [];
    existing.push(listenerFn);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const listenerFn =
      typeof listener === 'function' ? listener : (event: Event) => listener.handleEvent(event);
    const existing = this.listeners.get(type);
    if (!existing) {
      return;
    }
    this.listeners.set(
      type,
      existing.filter((entry) => entry !== listenerFn)
    );
  }

  dispatch(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    for (const listener of this.listeners.get(type) || []) {
      listener(event);
    }
  }
}

const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

describe('useTeamChatRealtimeStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    vi.stubEnv('VITE_TEAM_CHAT_REALTIME_ENABLED', 'true');
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/api');
    Object.defineProperty(globalThis, 'EventSource', {
      configurable: true,
      value: MockEventSource,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(globalThis, 'EventSource', {
      configurable: true,
      value: originalEventSource,
    });
  });

  it('keeps a single stream open when rerendered with new callbacks', async () => {
    const firstOnConnected = vi.fn();
    const secondOnConnected = vi.fn();
    const firstOnEvent = vi.fn();
    const secondOnEvent = vi.fn();

    const { rerender, unmount } = renderHook(
      ({ onConnected, onEvent }) =>
        useTeamChatRealtimeStream({
          endpointPath: '/v2/team-chat/messenger/stream',
          channels: ['messages'],
          eventNames: ['team_chat.message.created'],
          enabled: true,
          onConnected,
          onEvent,
        }),
      {
        wrapper,
        initialProps: {
          onConnected: firstOnConnected,
          onEvent: firstOnEvent,
        },
      }
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    rerender({
      onConnected: secondOnConnected,
      onEvent: secondOnEvent,
    });

    expect(MockEventSource.instances).toHaveLength(1);
    const stream = MockEventSource.instances[0];
    expect(stream.url).toBe(
      'https://api.example.test/api/v2/team-chat/messenger/stream?channels=messages'
    );
    expect(stream.close).not.toHaveBeenCalled();

    stream.dispatch('connected', {
      connection_id: 'conn-1',
      channels: ['messages'],
      online_user_ids: ['user-1'],
    });
    stream.dispatch('team_chat.message.created', {
      event_id: 'event-1',
      occurred_at: '2026-03-15T12:00:00.000Z',
      room_id: 'room-1',
      room_type: 'direct',
      actor_user_id: 'user-1',
      client_message_id: null,
      message: {
        id: 'message-1',
        room_id: 'room-1',
        sender_user_id: 'user-1',
        sender_first_name: 'Casey',
        sender_last_name: 'Agent',
        body: 'Hello from SSE',
        parent_message_id: null,
        client_message_id: null,
        metadata: null,
        created_at: '2026-03-15T12:00:00.000Z',
        edited_at: null,
        deleted_at: null,
        mention_user_ids: [],
      },
      room: {
        room_id: 'room-1',
        room_type: 'direct',
        title: 'Casey Agent',
        status: 'active',
        last_message_at: '2026-03-15T12:00:00.000Z',
        last_message_preview: 'Hello from SSE',
        message_count: 1,
        member_count: 2,
        unread_count: 0,
        unread_mentions_count: 0,
        counterpart_user_id: 'user-1',
        counterpart_first_name: 'Casey',
        counterpart_last_name: 'Agent',
        counterpart_email: 'casey@example.com',
      },
    });

    expect(firstOnConnected).not.toHaveBeenCalled();
    expect(firstOnEvent).not.toHaveBeenCalled();
    expect(secondOnConnected).toHaveBeenCalledTimes(1);
    expect(secondOnConnected).toHaveBeenCalledWith({
      connection_id: 'conn-1',
      channels: ['messages'],
      online_user_ids: ['user-1'],
    });
    expect(secondOnEvent).toHaveBeenCalledTimes(1);
    expect(secondOnEvent).toHaveBeenCalledWith(
      'team_chat.message.created',
      expect.objectContaining({
        room_id: 'room-1',
        actor_user_id: 'user-1',
      })
    );

    unmount();
    expect(stream.close).toHaveBeenCalledTimes(1);
  });
});
