import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { logger } from '@config/logger';

export type PortalRealtimeAudience = 'portal' | 'admin';
export type PortalRealtimeEventName =
  | 'portal.thread.updated'
  | 'portal.appointment.updated'
  | 'portal.slot.updated';
export type PortalRealtimeActorType = 'portal' | 'staff' | 'system';

type PortalRealtimeChannel = 'messages' | 'appointments' | 'conversations' | 'slots';

const CHANNELS_BY_AUDIENCE: Record<PortalRealtimeAudience, PortalRealtimeChannel[]> = {
  portal: ['messages', 'appointments'],
  admin: ['conversations', 'appointments', 'slots'],
};

const HEARTBEAT_INTERVAL_MS = 25_000;

interface PortalRealtimeClient {
  id: string;
  audience: PortalRealtimeAudience;
  userId: string;
  contactId: string | null;
  channels: Set<PortalRealtimeChannel>;
  res: Response;
  heartbeat: NodeJS.Timeout;
}

export interface PortalRealtimePayload {
  event_id: string;
  occurred_at: string;
  entity_id: string;
  case_id: string | null;
  status: string | null;
  actor_type: PortalRealtimeActorType;
  source: string;
  contact_id?: string | null;
}

export interface PortalRealtimeThreadSnapshot {
  id: string;
  contact_id: string;
  case_id: string | null;
  subject: string | null;
  status: string;
  last_message_at: string;
  last_message_preview: string | null;
  case_number: string | null;
  case_title: string | null;
  pointperson_user_id: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  portal_email: string | null;
  portal_unread_count: number;
  staff_unread_count: number;
}

export interface PortalRealtimeMessageSnapshot {
  id: string;
  thread_id: string;
  sender_type: 'portal' | 'staff' | 'system';
  sender_portal_user_id: string | null;
  sender_user_id: string | null;
  sender_display_name: string | null;
  message_text: string;
  is_internal: boolean;
  client_message_id: string | null;
  created_at: string;
  read_by_portal_at: string | null;
  read_by_staff_at: string | null;
}

export interface PortalThreadUpdatedRealtimePayload extends PortalRealtimePayload {
  action?: 'message.created' | 'thread.read' | 'thread.status.updated' | 'thread.updated';
  thread?: PortalRealtimeThreadSnapshot | null;
  message?: PortalRealtimeMessageSnapshot | null;
  client_message_id?: string | null;
}

const clients = new Map<string, PortalRealtimeClient>();

const writeSseEvent = (res: Response, eventName: string, payload: unknown): boolean => {
  try {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    return true;
  } catch (error) {
    logger.warn('Failed to write SSE event', { error, eventName });
    return false;
  }
};

const parseRequestedChannels = (
  raw: string | undefined,
  audience: PortalRealtimeAudience
): Set<PortalRealtimeChannel> => {
  const allowed = new Set<PortalRealtimeChannel>(CHANNELS_BY_AUDIENCE[audience]);
  if (!raw) {
    return new Set<PortalRealtimeChannel>(allowed);
  }

  const requested = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (requested.length === 0) {
    return new Set<PortalRealtimeChannel>(allowed);
  }

  const normalized = new Set<PortalRealtimeChannel>();
  for (const channel of requested) {
    if (!allowed.has(channel as PortalRealtimeChannel)) {
      throw new Error(`Unsupported channel "${channel}" for ${audience} stream`);
    }
    normalized.add(channel as PortalRealtimeChannel);
  }

  return normalized;
};

const cleanupClient = (clientId: string): void => {
  const client = clients.get(clientId);
  if (!client) return;

  clearInterval(client.heartbeat);
  clients.delete(clientId);
};

export const isPortalRealtimeEnabled = (): boolean =>
  process.env.PORTAL_REALTIME_ENABLED === 'true';

export const openPortalRealtimeStream = (input: {
  req: Request;
  res: Response;
  audience: PortalRealtimeAudience;
  userId: string;
  contactId?: string | null;
  channelsRaw?: string;
}): void => {
  const channels = parseRequestedChannels(input.channelsRaw, input.audience);

  input.res.status(200);
  input.res.setHeader('Content-Type', 'text/event-stream');
  input.res.setHeader('Cache-Control', 'no-cache, no-transform');
  input.res.setHeader('Connection', 'keep-alive');
  input.res.setHeader('X-Accel-Buffering', 'no');
  input.res.flushHeaders?.();

  const clientId = randomUUID();
  const heartbeat = setInterval(() => {
    const ok = writeSseEvent(input.res, 'ping', {
      timestamp: new Date().toISOString(),
    });
    if (!ok) {
      cleanupClient(clientId);
    }
  }, HEARTBEAT_INTERVAL_MS);

  const client: PortalRealtimeClient = {
    id: clientId,
    audience: input.audience,
    userId: input.userId,
    contactId: input.contactId ?? null,
    channels,
    res: input.res,
    heartbeat,
  };
  clients.set(clientId, client);

  writeSseEvent(input.res, 'connected', {
    connection_id: clientId,
    audience: input.audience,
    channels: Array.from(channels),
  });

  input.req.on('close', () => {
    cleanupClient(clientId);
  });
  input.req.on('error', () => {
    cleanupClient(clientId);
  });
};

const broadcast = (input: {
  eventName: PortalRealtimeEventName;
  payload: PortalRealtimePayload;
  channels: PortalRealtimeChannel[];
  contactId?: string | null;
}): void => {
  const requiredChannels = new Set(input.channels);
  for (const [clientId, client] of clients.entries()) {
    const subscribed = Array.from(requiredChannels).some((channel) =>
      client.channels.has(channel)
    );
    if (!subscribed) {
      continue;
    }

    if (client.audience === 'portal') {
      if (!input.contactId || client.contactId !== input.contactId) {
        continue;
      }
    }

    const ok = writeSseEvent(client.res, input.eventName, input.payload);
    if (!ok) {
      cleanupClient(clientId);
    }
  }
};

const buildPayload = (input: {
  entityId: string;
  caseId?: string | null;
  status?: string | null;
  actorType: PortalRealtimeActorType;
  source: string;
  contactId?: string | null;
}): PortalRealtimePayload => ({
  event_id: randomUUID(),
  occurred_at: new Date().toISOString(),
  entity_id: input.entityId,
  case_id: input.caseId ?? null,
  status: input.status ?? null,
  actor_type: input.actorType,
  source: input.source,
  contact_id: input.contactId ?? null,
});

export const publishPortalThreadUpdated = (input: {
  entityId: string;
  caseId?: string | null;
  status?: string | null;
  actorType: PortalRealtimeActorType;
  source: string;
  contactId?: string | null;
  action?: 'message.created' | 'thread.read' | 'thread.status.updated' | 'thread.updated';
  thread?: PortalRealtimeThreadSnapshot | null;
  message?: PortalRealtimeMessageSnapshot | null;
  clientMessageId?: string | null;
}): void => {
  const payload: PortalThreadUpdatedRealtimePayload = {
    ...buildPayload(input),
    action: input.action,
    thread: input.thread ?? null,
    message: input.message ?? null,
    client_message_id: input.clientMessageId ?? null,
  };
  broadcast({
    eventName: 'portal.thread.updated',
    payload,
    channels: ['messages', 'conversations'],
    contactId: input.contactId ?? null,
  });
};

export const publishPortalAppointmentUpdated = (input: {
  entityId: string;
  caseId?: string | null;
  status?: string | null;
  actorType: PortalRealtimeActorType;
  source: string;
  contactId?: string | null;
}): void => {
  const payload = buildPayload(input);
  broadcast({
    eventName: 'portal.appointment.updated',
    payload,
    channels: ['appointments'],
    contactId: input.contactId ?? null,
  });
};

export const publishPortalSlotUpdated = (input: {
  entityId: string;
  caseId?: string | null;
  status?: string | null;
  actorType: PortalRealtimeActorType;
  source: string;
  contactId?: string | null;
}): void => {
  const payload = buildPayload(input);
  broadcast({
    eventName: 'portal.slot.updated',
    payload,
    channels: ['appointments', 'slots'],
    contactId: input.contactId ?? null,
  });
};
