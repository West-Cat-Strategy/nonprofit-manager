import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePortalRealtimeStream from '../usePortalRealtimeStream';

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

describe('usePortalRealtimeStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    vi.stubEnv('VITE_PORTAL_REALTIME_ENABLED', 'true');
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

  it('keeps a single stream open when the event callback identity changes', async () => {
    const firstOnEvent = vi.fn();
    const secondOnEvent = vi.fn();

    const { rerender, unmount } = renderHook(
      ({ onEvent }) =>
        usePortalRealtimeStream({
          endpointPath: '/v2/portal/stream',
          channels: ['messages'],
          enabled: true,
          onEvent,
        }),
      {
        wrapper,
        initialProps: { onEvent: firstOnEvent },
      }
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    rerender({ onEvent: secondOnEvent });

    expect(MockEventSource.instances).toHaveLength(1);
    const stream = MockEventSource.instances[0];
    expect(stream.url).toBe('https://api.example.test/api/v2/portal/stream?channels=messages');
    expect(stream.close).not.toHaveBeenCalled();

    stream.dispatch('portal.thread.updated', {
      event_id: 'event-1',
      occurred_at: '2026-03-15T12:00:00.000Z',
      entity_id: 'thread-1',
      case_id: 'case-1',
      status: 'updated',
      actor_type: 'staff',
      source: 'test',
      thread: null,
      message: null,
    });

    expect(firstOnEvent).not.toHaveBeenCalled();
    expect(secondOnEvent).toHaveBeenCalledTimes(1);
    expect(secondOnEvent).toHaveBeenCalledWith(
      'portal.thread.updated',
      expect.objectContaining({
        entity_id: 'thread-1',
        case_id: 'case-1',
      })
    );

    unmount();
    expect(stream.close).toHaveBeenCalledTimes(1);
  });
});
