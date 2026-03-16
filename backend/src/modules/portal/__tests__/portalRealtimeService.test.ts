import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import {
  openPortalRealtimeStream,
  publishPortalThreadUpdated,
} from '@services/portalRealtimeService';

type CapturedEvent = {
  name: string;
  payload: Record<string, unknown>;
};

interface MockRealtimeClient {
  events: CapturedEvent[];
  close: () => void;
}

const createRealtimeClient = (input: {
  audience: 'portal' | 'admin';
  userId: string;
  contactId?: string | null;
  channels?: string;
}): MockRealtimeClient => {
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

  openPortalRealtimeStream({
    req,
    res,
    audience: input.audience,
    userId: input.userId,
    contactId: input.contactId ?? null,
    channelsRaw: input.channels,
  });

  return {
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

describe('portalRealtimeService', () => {
  const activeClients: MockRealtimeClient[] = [];

  beforeEach(() => {
    process.env.PORTAL_REALTIME_ENABLED = 'true';
    jest.useFakeTimers();
  });

  afterEach(() => {
    while (activeClients.length > 0) {
      activeClients.pop()?.close();
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('broadcasts enriched thread updates to portal and admin listeners with matching visibility', () => {
    const adminClient = createRealtimeClient({
      audience: 'admin',
      userId: 'staff-1',
      channels: 'conversations',
    });
    const portalClient = createRealtimeClient({
      audience: 'portal',
      userId: 'portal-user-1',
      contactId: 'contact-1',
      channels: 'messages',
    });
    const otherPortalClient = createRealtimeClient({
      audience: 'portal',
      userId: 'portal-user-2',
      contactId: 'contact-2',
      channels: 'messages',
    });
    activeClients.push(adminClient, portalClient, otherPortalClient);

    publishPortalThreadUpdated({
      entityId: 'thread-1',
      caseId: 'case-1',
      status: 'open',
      actorType: 'staff',
      source: 'admin.thread.reply',
      contactId: 'contact-1',
      action: 'message.created',
      clientMessageId: '12121212-1212-4212-8212-121212121212',
      thread: {
        id: 'thread-1',
        contact_id: 'contact-1',
        case_id: 'case-1',
        subject: 'Help needed',
        status: 'open',
        last_message_at: '2026-03-15T20:00:00.000Z',
        last_message_preview: 'Thanks for the update',
        case_number: 'CASE-1',
        case_title: 'Housing intake',
        pointperson_user_id: 'staff-1',
        pointperson_first_name: 'Alex',
        pointperson_last_name: 'Staff',
        portal_email: 'client@example.com',
        portal_unread_count: 1,
        staff_unread_count: 0,
      },
      message: {
        id: 'message-1',
        thread_id: 'thread-1',
        sender_type: 'staff',
        sender_portal_user_id: null,
        sender_user_id: 'staff-1',
        sender_display_name: 'Alex Staff',
        message_text: 'Thanks for the update',
        is_internal: false,
        client_message_id: '12121212-1212-4212-8212-121212121212',
        created_at: '2026-03-15T20:00:00.000Z',
        read_by_portal_at: null,
        read_by_staff_at: '2026-03-15T20:00:00.000Z',
      },
    });

    const adminEvent = adminClient.events.find((event) => event.name === 'portal.thread.updated');
    const portalEvent = portalClient.events.find((event) => event.name === 'portal.thread.updated');
    const otherPortalEvent = otherPortalClient.events.find(
      (event) => event.name === 'portal.thread.updated'
    );

    expect(adminEvent?.payload).toMatchObject({
      entity_id: 'thread-1',
      action: 'message.created',
      client_message_id: '12121212-1212-4212-8212-121212121212',
    });
    expect((adminEvent?.payload.thread as { staff_unread_count?: number })?.staff_unread_count).toBe(0);
    expect((portalEvent?.payload.thread as { portal_unread_count?: number })?.portal_unread_count).toBe(1);
    expect(otherPortalEvent).toBeUndefined();
  });
});
