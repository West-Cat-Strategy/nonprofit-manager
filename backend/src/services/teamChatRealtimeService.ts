import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { logger } from '@config/logger';
import type {
  TeamChatEventName,
} from '@modules/teamChat/types/events';
import type {
  TeamChatRoomType,
  TeamMessengerPresenceState,
  TeamMessengerTypingEvent,
} from '@modules/teamChat/types/contracts';

type TeamChatRealtimeChannel = 'messages' | 'presence' | 'typing' | 'read' | 'members';

const DEFAULT_TEAM_CHAT_CHANNELS: TeamChatRealtimeChannel[] = [
  'messages',
  'presence',
  'typing',
  'read',
  'members',
];
const HEARTBEAT_INTERVAL_MS = 25_000;
const TYPING_TTL_MS = 5_000;
const EVENT_CHANNELS: Record<TeamChatEventName, TeamChatRealtimeChannel> = {
  'team_chat.message.created': 'messages',
  'team_chat.room.read': 'read',
  'team_chat.member.added': 'members',
  'team_chat.member.removed': 'members',
  'team_chat.room.bootstrapped': 'members',
  'team_chat.presence.updated': 'presence',
  'team_chat.typing.updated': 'typing',
};

interface TeamChatRealtimeClient {
  id: string;
  organizationId: string;
  userId: string;
  channels: Set<TeamChatRealtimeChannel>;
  roomTypes: Set<TeamChatRoomType>;
  roomIds?: Set<string>;
  res: Response;
  heartbeat: NodeJS.Timeout;
}

interface TypingStateEntry {
  organizationId: string;
  roomId: string;
  userId: string;
  timeout: NodeJS.Timeout;
  expiresAt: string;
}

const clients = new Map<string, TeamChatRealtimeClient>();
const typingState = new Map<string, TypingStateEntry>();

const writeSseEvent = (res: Response, eventName: string, payload: unknown): boolean => {
  try {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    return true;
  } catch (error) {
    logger.warn('Failed to write team chat SSE event', { error, eventName });
    return false;
  }
};

const parseRequestedChannels = (
  raw: string | undefined,
  allowedChannels = DEFAULT_TEAM_CHAT_CHANNELS
): Set<TeamChatRealtimeChannel> => {
  if (!raw) {
    return new Set<TeamChatRealtimeChannel>(allowedChannels);
  }

  const normalized = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (normalized.length === 0) {
    return new Set<TeamChatRealtimeChannel>(allowedChannels);
  }

  const channels = new Set<TeamChatRealtimeChannel>();
  for (const value of normalized) {
    if (!allowedChannels.includes(value as TeamChatRealtimeChannel)) {
      throw new Error(`Unsupported team messenger channel "${value}"`);
    }
    channels.add(value as TeamChatRealtimeChannel);
  }

  return channels;
};

const getActiveConnectionCount = (organizationId: string, userId: string): number =>
  Array.from(clients.values()).filter(
    (client) => client.organizationId === organizationId && client.userId === userId
  ).length;

const broadcastPresence = (
  organizationId: string,
  payload: TeamMessengerPresenceState
): void => {
  for (const [clientId, client] of clients.entries()) {
    if (
      client.organizationId !== organizationId ||
      !client.channels.has('presence')
    ) {
      continue;
    }

    if (!writeSseEvent(client.res, 'team_chat.presence.updated', payload)) {
      cleanupClient(clientId);
    }
  }
};

const clearTypingEntry = (typingKey: string): void => {
  const entry = typingState.get(typingKey);
  if (!entry) {
    return;
  }

  clearTimeout(entry.timeout);
  typingState.delete(typingKey);
};

const broadcastTyping = (
  organizationId: string,
  participantUserIds: string[],
  payload: TeamMessengerTypingEvent
): void => {
  const allowedUsers = new Set(participantUserIds);
  for (const [clientId, client] of clients.entries()) {
    if (
      client.organizationId !== organizationId ||
      !client.channels.has('typing') ||
      !allowedUsers.has(client.userId) ||
      (client.roomIds && !client.roomIds.has(payload.room_id))
    ) {
      continue;
    }

    if (!writeSseEvent(client.res, 'team_chat.typing.updated', payload)) {
      cleanupClient(clientId);
    }
  }
};

const cleanupClient = (clientId: string): void => {
  const client = clients.get(clientId);
  if (!client) {
    return;
  }

  clearInterval(client.heartbeat);
  clients.delete(clientId);

  if (getActiveConnectionCount(client.organizationId, client.userId) === 0) {
    broadcastPresence(client.organizationId, {
      user_id: client.userId,
      status: 'offline',
      occurred_at: new Date().toISOString(),
    });
  }
};

export const isTeamChatRealtimeEnabled = (): boolean =>
  process.env.TEAM_CHAT_REALTIME_ENABLED !== 'false';

export const openTeamChatRealtimeStream = (input: {
  req: Request;
  res: Response;
  organizationId: string;
  userId: string;
  channelsRaw?: string;
  allowedChannels?: TeamChatRealtimeChannel[];
  roomTypes?: TeamChatRoomType[];
  roomIds?: string[];
}): void => {
  const channels = parseRequestedChannels(input.channelsRaw, input.allowedChannels);
  const roomTypes = new Set<TeamChatRoomType>(input.roomTypes || ['case', 'direct', 'group']);
  const roomIds = input.roomIds?.length ? new Set(input.roomIds) : undefined;

  input.res.status(200);
  input.res.setHeader('Content-Type', 'text/event-stream');
  input.res.setHeader('Cache-Control', 'no-cache, no-transform');
  input.res.setHeader('Connection', 'keep-alive');
  input.res.setHeader('X-Accel-Buffering', 'no');
  input.res.flushHeaders?.();

  const clientId = randomUUID();
  const heartbeat = setInterval(() => {
    if (!writeSseEvent(input.res, 'ping', { timestamp: new Date().toISOString() })) {
      cleanupClient(clientId);
    }
  }, HEARTBEAT_INTERVAL_MS);

  clients.set(clientId, {
    id: clientId,
    organizationId: input.organizationId,
    userId: input.userId,
    channels,
    roomTypes,
    roomIds,
    res: input.res,
    heartbeat,
  });

  const onlineUserIds = Array.from(
    new Set(
      Array.from(clients.values())
        .filter((client) => client.organizationId === input.organizationId)
        .map((client) => client.userId)
    )
  );

  writeSseEvent(input.res, 'connected', {
    connection_id: clientId,
    channels: Array.from(channels),
    online_user_ids: onlineUserIds,
  });

  broadcastPresence(input.organizationId, {
    user_id: input.userId,
    status: 'online',
    occurred_at: new Date().toISOString(),
  });

  input.req.on('close', () => cleanupClient(clientId));
  input.req.on('error', () => cleanupClient(clientId));
};

export const publishTeamChatRoomEvent = (input: {
  organizationId: string;
  participantUserIds: string[];
  roomId: string;
  roomType: TeamChatRoomType;
  eventName: TeamChatEventName;
  payload: Record<string, unknown>;
}): void => {
  const channel = EVENT_CHANNELS[input.eventName];
  const allowedUsers = new Set(input.participantUserIds);
  for (const [clientId, client] of clients.entries()) {
    if (
      client.organizationId !== input.organizationId ||
      !allowedUsers.has(client.userId) ||
      !client.channels.has(channel) ||
      !client.roomTypes.has(input.roomType) ||
      (client.roomIds && !client.roomIds.has(input.roomId))
    ) {
      continue;
    }

    if (
      !writeSseEvent(client.res, input.eventName, {
        event_id: randomUUID(),
        occurred_at: new Date().toISOString(),
        ...input.payload,
      })
    ) {
      cleanupClient(clientId);
    }
  }
};

export const publishTeamChatTypingState = (input: {
  organizationId: string;
  roomId: string;
  userId: string;
  participantUserIds: string[];
  isTyping: boolean;
}): TeamMessengerTypingEvent => {
  const typingKey = `${input.roomId}:${input.userId}`;
  clearTypingEntry(typingKey);

  const occurredAt = new Date().toISOString();
  let expiresAt: string | null = null;

  if (input.isTyping) {
    expiresAt = new Date(Date.now() + TYPING_TTL_MS).toISOString();
    const timeout = setTimeout(() => {
      typingState.delete(typingKey);
      broadcastTyping(input.organizationId, input.participantUserIds, {
        room_id: input.roomId,
        user_id: input.userId,
        is_typing: false,
        occurred_at: new Date().toISOString(),
        expires_at: null,
      });
    }, TYPING_TTL_MS);

    typingState.set(typingKey, {
      organizationId: input.organizationId,
      roomId: input.roomId,
      userId: input.userId,
      timeout,
      expiresAt,
    });
  }

  const payload: TeamMessengerTypingEvent = {
    room_id: input.roomId,
    user_id: input.userId,
    is_typing: input.isTyping,
    occurred_at: occurredAt,
    expires_at: expiresAt,
  };

  broadcastTyping(input.organizationId, input.participantUserIds, payload);
  return payload;
};
