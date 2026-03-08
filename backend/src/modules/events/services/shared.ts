import { Pool } from 'pg';
import type { ReminderChannelSummary } from '@app-types/event';

export type QueryValue = string | number | boolean | Date | null | string[];

export interface EventReminderEventRow {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  location_name: string | null;
}

export interface EventReminderRecipientRow {
  registration_id: string;
  contact_name: string;
  contact_email: string | null;
  mobile_phone: string | null;
  phone: string | null;
  do_not_email: boolean;
  do_not_text: boolean;
}

export interface EventCheckInWindowEventRow {
  id: string;
  start_date: Date;
  end_date: Date;
  status: string;
  capacity: number | null;
  registered_count: number;
}

interface EventContactRow {
  id: string;
}

const parsePositiveMinutes = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

export const EVENT_CHECKIN_WINDOW_BEFORE_MINUTES = parsePositiveMinutes(
  process.env.EVENT_CHECKIN_WINDOW_BEFORE_MINUTES,
  180
);

export const EVENT_CHECKIN_WINDOW_AFTER_MINUTES = parsePositiveMinutes(
  process.env.EVENT_CHECKIN_WINDOW_AFTER_MINUTES,
  240
);

export const normalizePhone = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

export const slugifyPublicEvent = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const buildCheckInWindowMessage = (windowBefore: number, windowAfter: number): string =>
  `Check-in is available ${windowBefore} minutes before start until ${windowAfter} minutes after end`;

export const createChannelSummary = (
  requested: boolean,
  enabled: boolean
): ReminderChannelSummary => ({
  requested,
  enabled,
  attempted: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
});

export const formatReminderDate = (date: Date): string =>
  new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export class EventParticipantSupport {
  constructor(_pool: Pool) {}

  getCheckInWindowBounds(event: EventCheckInWindowEventRow): {
    openAt: Date;
    closeAt: Date;
  } {
    const openAt = new Date(event.start_date);
    openAt.setMinutes(openAt.getMinutes() - EVENT_CHECKIN_WINDOW_BEFORE_MINUTES);

    const closeAt = new Date(event.end_date);
    closeAt.setMinutes(closeAt.getMinutes() + EVENT_CHECKIN_WINDOW_AFTER_MINUTES);

    return { openAt, closeAt };
  }

  assertCheckInAllowed(
    event: EventCheckInWindowEventRow,
    now: Date = new Date(),
    enforceWindow: boolean = true
  ): void {
    if (event.status === 'cancelled' || event.status === 'completed') {
      throw new Error('Event is not accepting check-ins');
    }

    if (!enforceWindow) {
      return;
    }

    const { openAt, closeAt } = this.getCheckInWindowBounds(event);
    const nowMs = now.getTime();
    if (nowMs < openAt.getTime() || nowMs > closeAt.getTime()) {
      throw new Error(
        `${buildCheckInWindowMessage(
          EVENT_CHECKIN_WINDOW_BEFORE_MINUTES,
          EVENT_CHECKIN_WINDOW_AFTER_MINUTES
        )}.`
      );
    }
  }

  async resolveContactIdByIdentity(
    client: { query: Pool['query'] },
    identity: { email?: string; phone?: string }
  ): Promise<string | null> {
    const email = identity.email?.trim().toLowerCase();
    if (email) {
      const byEmail = await client.query<EventContactRow>(
        `SELECT id
         FROM contacts
         WHERE lower(email) = $1
         ORDER BY created_at ASC
         LIMIT 1`,
        [email]
      );
      if (byEmail.rows[0]?.id) {
        return byEmail.rows[0].id;
      }
    }

    const normalizedPhone = normalizePhone(identity.phone);
    if (normalizedPhone) {
      const byPhone = await client.query<EventContactRow>(
        `SELECT id
         FROM contacts
         WHERE regexp_replace(COALESCE(mobile_phone, ''), '[^0-9]', '', 'g') = $1
            OR regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $1
         ORDER BY created_at ASC
         LIMIT 1`,
        [normalizedPhone]
      );
      if (byPhone.rows[0]?.id) {
        return byPhone.rows[0].id;
      }
    }

    return null;
  }

  async createWalkInContact(
    client: { query: Pool['query'] },
    args: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      createdBy: string | null;
    }
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `INSERT INTO contacts (
        first_name,
        last_name,
        email,
        phone,
        mobile_phone,
        created_by,
        modified_by
      ) VALUES ($1, $2, $3, $4, $4, $5, $5)
      RETURNING id`,
      [
        args.firstName.trim(),
        args.lastName.trim(),
        args.email?.trim().toLowerCase() || null,
        args.phone?.trim() || null,
        args.createdBy,
      ]
    );

    return result.rows[0].id;
  }
}
