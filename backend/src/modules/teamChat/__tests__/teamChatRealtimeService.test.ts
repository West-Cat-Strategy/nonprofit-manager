import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { TeamChatEventName } from '../types/events';
import {
  openTeamChatRealtimeStream,
  publishTeamChatRoomEvent,
  publishTeamChatTypingState,
} from '@services/teamChatRealtimeService';

type CapturedEvent = {
  name: string;
  payload: Record<string, unknown>;
};

interface MockRealtimeClient {
  req: Request;
  res: Response;
  events: CapturedEvent[];
  close: () => void;
}

const createRealtimeClient = (
  organizationId: string,
  userId: string,
  channels = 'messages,presence,typing'
): MockRealtimeClient => {
  const events: CapturedEvent[] = [];
  let pendingEventName = '';
  const handlers = new Map<string, Array<() => void>>();

  const req = {
    on: jest.fn((event: string, handler: () => void) => {
      const existing = handlers.get(event) || [];
      existing.push(handler);
      handlers.set(event, existing);
      return req;
    }),
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn((chunk: string) => {
      const trimmed = chunk.trim();
      if (trimmed.startsWith('event:')) {
        pendingEventName = trimmed.slice('event:'.length).trim();
        return true;
      }

      if (trimmed.startsWith('data:')) {
        events.push({
          name: pendingEventName,
          payload: JSON.parse(trimmed.slice('data:'.length).trim()) as Record<string, unknown>,
        });
        return true;
      }

      return true;
    }),
  } as unknown as Response;

  openTeamChatRealtimeStream({
    req,
    res,
    organizationId,
    userId,
    channelsRaw: channels,
  });

  return {
    req,
    res,
    events,
    close: () => {
      for (const eventName of ['close', 'error']) {
        for (const handler of handlers.get(eventName) || []) {
          handler();
        }
      }
    },
  };
};

describe('teamChatRealtimeService', () => {
  const activeClients: MockRealtimeClient[] = [];

  beforeEach(() => {
    process.env.TEAM_CHAT_REALTIME_ENABLED = 'true';
    jest.useFakeTimers();
  });

  afterEach(() => {
    while (activeClients.length > 0) {
      activeClients.pop()?.close();
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('fans out room events only to allowed participants', () => {
    const alice = createRealtimeClient('org-1', 'alice');
    const bob = createRealtimeClient('org-1', 'bob');
    const casey = createRealtimeClient('org-1', 'casey');
    activeClients.push(alice, bob, casey);

    publishTeamChatRoomEvent({
      organizationId: 'org-1',
      participantUserIds: ['alice', 'bob'],
      roomId: 'room-1',
      roomType: 'direct',
      eventName: TeamChatEventName.MESSAGE_CREATED,
      payload: {
        room_id: 'room-1',
        message_id: 'message-1',
      },
    });

    expect(alice.events.some((event) => event.name === TeamChatEventName.MESSAGE_CREATED)).toBe(true);
    expect(bob.events.some((event) => event.name === TeamChatEventName.MESSAGE_CREATED)).toBe(true);
    expect(casey.events.some((event) => event.name === TeamChatEventName.MESSAGE_CREATED)).toBe(false);
  });

  it('expires typing state and broadcasts stop-typing to participants', () => {
    const alice = createRealtimeClient('org-2', 'alice');
    const bob = createRealtimeClient('org-2', 'bob');
    const outsider = createRealtimeClient('org-2', 'outsider', 'presence');
    activeClients.push(alice, bob, outsider);

    const typingEvent = publishTeamChatTypingState({
      organizationId: 'org-2',
      roomId: 'room-typing',
      userId: 'alice',
      participantUserIds: ['alice', 'bob'],
      isTyping: true,
    });

    expect(typingEvent.is_typing).toBe(true);
    expect(
      bob.events.filter((event) => event.name === 'team_chat.typing.updated').at(-1)?.payload
    ).toMatchObject({
      room_id: 'room-typing',
      user_id: 'alice',
      is_typing: true,
    });
    expect(outsider.events.some((event) => event.name === 'team_chat.typing.updated')).toBe(false);

    jest.advanceTimersByTime(5_000);

    expect(
      alice.events.filter((event) => event.name === 'team_chat.typing.updated').at(-1)?.payload
    ).toMatchObject({
      room_id: 'room-typing',
      user_id: 'alice',
      is_typing: false,
    });
    expect(
      bob.events.filter((event) => event.name === 'team_chat.typing.updated').at(-1)?.payload
    ).toMatchObject({
      room_id: 'room-typing',
      user_id: 'alice',
      is_typing: false,
    });
  });
});
