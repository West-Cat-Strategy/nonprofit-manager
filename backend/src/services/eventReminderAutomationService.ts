/**
 * Event Reminder Automation Service
 * Stores and manages scheduled reminder automations for events.
 */

import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  CreateEventReminderAutomationDTO,
  EventReminderAutomation,
  EventReminderAttemptStatus,
  EventReminderTimingType,
  SyncEventReminderAutomationsDTO,
  UpdateEventReminderAutomationDTO,
} from '@app-types/event';

type QueryValue = string | number | boolean | Date | null | Record<string, unknown>;

const PROCESSING_STALE_TIMEOUT_MINUTES = 10;

export interface ClaimedEventReminderAutomation extends EventReminderAutomation {
  due_at: Date;
  event_start_date: Date;
  event_status: string;
}

export interface AutomationAttemptResult {
  status: EventReminderAttemptStatus;
  summary: Record<string, unknown>;
  error?: string | null;
}

interface EventReminderAutomationRow {
  id: string;
  event_id: string;
  timing_type: EventReminderTimingType;
  relative_minutes_before: number | null;
  absolute_send_at: Date | null;
  send_email: boolean;
  send_sms: boolean;
  custom_message: string | null;
  timezone: string;
  is_active: boolean;
  processing_started_at: Date | null;
  attempted_at: Date | null;
  attempt_status: EventReminderAttemptStatus | null;
  attempt_summary: Record<string, unknown> | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  modified_by: string | null;
}

interface ClaimedReminderRow extends EventReminderAutomationRow {
  due_at: Date;
  event_start_date: Date;
  event_status: string;
}

interface NormalizedReminderInput {
  timingType: EventReminderTimingType;
  relativeMinutesBefore: number | null;
  absoluteSendAt: Date | null;
  sendEmail: boolean;
  sendSms: boolean;
  customMessage: string | null;
  timezone: string;
}

const mapRow = (row: EventReminderAutomationRow): EventReminderAutomation => ({
  id: row.id,
  event_id: row.event_id,
  timing_type: row.timing_type,
  relative_minutes_before: row.relative_minutes_before,
  absolute_send_at: row.absolute_send_at,
  send_email: row.send_email,
  send_sms: row.send_sms,
  custom_message: row.custom_message,
  timezone: row.timezone,
  is_active: row.is_active,
  processing_started_at: row.processing_started_at,
  attempted_at: row.attempted_at,
  attempt_status: row.attempt_status,
  attempt_summary: row.attempt_summary,
  last_error: row.last_error,
  created_at: row.created_at,
  updated_at: row.updated_at,
  created_by: row.created_by,
  modified_by: row.modified_by,
});

const mapClaimedRow = (row: ClaimedReminderRow): ClaimedEventReminderAutomation => ({
  ...mapRow(row),
  due_at: row.due_at,
  event_start_date: row.event_start_date,
  event_status: row.event_status,
});

const parseOptionalDate = (value: Date | string | undefined): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Absolute send time must be a valid datetime');
  }
  return date;
};

const normalizeReminderInput = (
  dto: CreateEventReminderAutomationDTO | UpdateEventReminderAutomationDTO,
  current?: EventReminderAutomation
): NormalizedReminderInput => {
  const timingType = (dto.timingType ?? current?.timing_type) as EventReminderTimingType | undefined;

  if (!timingType) {
    throw new Error('Timing type is required');
  }

  const sendEmail = dto.sendEmail ?? current?.send_email ?? true;
  const sendSms = dto.sendSms ?? current?.send_sms ?? true;
  if (!sendEmail && !sendSms) {
    throw new Error('At least one reminder channel must be enabled');
  }

  const timezone = (dto.timezone ?? current?.timezone ?? 'UTC').trim();
  if (!timezone) {
    throw new Error('Timezone is required');
  }

  const customMessageRaw = dto.customMessage ?? current?.custom_message ?? null;
  const customMessage = customMessageRaw ? customMessageRaw.trim() : null;
  if (customMessage && customMessage.length > 500) {
    throw new Error('Custom message must be 500 characters or less');
  }

  let relativeMinutesBefore = dto.relativeMinutesBefore ?? current?.relative_minutes_before ?? null;
  let absoluteSendAt = parseOptionalDate(dto.absoluteSendAt as Date | string | undefined) ??
    current?.absolute_send_at ??
    null;

  if (timingType === 'relative') {
    if (!relativeMinutesBefore || relativeMinutesBefore <= 0) {
      throw new Error('Relative timing requires a positive number of minutes');
    }
    absoluteSendAt = null;
  } else if (timingType === 'absolute') {
    if (!absoluteSendAt) {
      throw new Error('Absolute timing requires an exact send datetime');
    }
    relativeMinutesBefore = null;
  }

  return {
    timingType,
    relativeMinutesBefore,
    absoluteSendAt,
    sendEmail,
    sendSms,
    customMessage,
    timezone,
  };
};

export async function listEventReminderAutomations(
  eventId: string
): Promise<EventReminderAutomation[]> {
  const result = await pool.query<EventReminderAutomationRow>(
    `SELECT *
     FROM event_reminder_automations
     WHERE event_id = $1
     ORDER BY created_at ASC`,
    [eventId]
  );

  return result.rows.map(mapRow);
}

export async function createEventReminderAutomation(
  eventId: string,
  dto: CreateEventReminderAutomationDTO,
  userId: string
): Promise<EventReminderAutomation> {
  const normalized = normalizeReminderInput(dto);

  const result = await pool.query<EventReminderAutomationRow>(
    `INSERT INTO event_reminder_automations (
       event_id,
       timing_type,
       relative_minutes_before,
       absolute_send_at,
       send_email,
       send_sms,
       custom_message,
       timezone,
       is_active,
       created_by,
       modified_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9)
     RETURNING *`,
    [
      eventId,
      normalized.timingType,
      normalized.relativeMinutesBefore,
      normalized.absoluteSendAt,
      normalized.sendEmail,
      normalized.sendSms,
      normalized.customMessage,
      normalized.timezone,
      userId,
    ]
  );

  return mapRow(result.rows[0]);
}

export async function updateEventReminderAutomation(
  eventId: string,
  automationId: string,
  dto: UpdateEventReminderAutomationDTO,
  userId: string
): Promise<EventReminderAutomation> {
  const currentResult = await pool.query<EventReminderAutomationRow>(
    `SELECT *
     FROM event_reminder_automations
     WHERE id = $1 AND event_id = $2`,
    [automationId, eventId]
  );

  if (currentResult.rows.length === 0) {
    throw new Error('Reminder automation not found');
  }

  const current = mapRow(currentResult.rows[0]);
  if (current.attempted_at) {
    throw new Error('Attempted reminder automations cannot be edited');
  }

  const normalized = normalizeReminderInput(dto, current);
  const isActive = dto.isActive ?? current.is_active;

  const result = await pool.query<EventReminderAutomationRow>(
    `UPDATE event_reminder_automations
     SET timing_type = $1,
         relative_minutes_before = $2,
         absolute_send_at = $3,
         send_email = $4,
         send_sms = $5,
         custom_message = $6,
         timezone = $7,
         is_active = $8,
         modified_by = $9,
         updated_at = NOW()
     WHERE id = $10
       AND event_id = $11
       AND attempted_at IS NULL
     RETURNING *`,
    [
      normalized.timingType,
      normalized.relativeMinutesBefore,
      normalized.absoluteSendAt,
      normalized.sendEmail,
      normalized.sendSms,
      normalized.customMessage,
      normalized.timezone,
      isActive,
      userId,
      automationId,
      eventId,
    ]
  );

  if (result.rows.length === 0) {
    throw new Error('Attempted reminder automations cannot be edited');
  }

  return mapRow(result.rows[0]);
}

export async function cancelEventReminderAutomation(
  eventId: string,
  automationId: string,
  userId: string
): Promise<EventReminderAutomation> {
  const currentResult = await pool.query<EventReminderAutomationRow>(
    `SELECT *
     FROM event_reminder_automations
     WHERE id = $1 AND event_id = $2`,
    [automationId, eventId]
  );

  if (currentResult.rows.length === 0) {
    throw new Error('Reminder automation not found');
  }

  if (currentResult.rows[0].attempted_at) {
    throw new Error('Attempted reminder automations cannot be cancelled');
  }

  const result = await pool.query<EventReminderAutomationRow>(
    `UPDATE event_reminder_automations
     SET is_active = false,
         attempt_status = 'cancelled',
         modified_by = $1,
         updated_at = NOW()
     WHERE id = $2
       AND event_id = $3
       AND attempted_at IS NULL
     RETURNING *`,
    [userId, automationId, eventId]
  );

  if (result.rows.length === 0) {
    throw new Error('Attempted reminder automations cannot be cancelled');
  }

  return mapRow(result.rows[0]);
}

export async function syncPendingEventReminderAutomations(
  eventId: string,
  dto: SyncEventReminderAutomationsDTO,
  userId: string
): Promise<EventReminderAutomation[]> {
  const items = dto.items || [];

  // Cancel all still-pending automations for this event.
  await pool.query(
    `UPDATE event_reminder_automations
     SET is_active = false,
         attempt_status = 'cancelled',
         modified_by = $1,
         updated_at = NOW()
     WHERE event_id = $2
       AND attempted_at IS NULL
       AND is_active = true`,
    [userId, eventId]
  );

  const created: EventReminderAutomation[] = [];

  for (const item of items) {
    const automation = await createEventReminderAutomation(eventId, item, userId);
    created.push(automation);
  }

  return created;
}

export async function claimDueAutomations(
  limit = 25
): Promise<ClaimedEventReminderAutomation[]> {
  const result = await pool.query<ClaimedReminderRow>(
    `WITH due AS (
       SELECT
         era.id,
         CASE
           WHEN era.timing_type = 'absolute' THEN era.absolute_send_at
           ELSE e.start_date - (era.relative_minutes_before * INTERVAL '1 minute')
         END AS due_at
       FROM event_reminder_automations era
       INNER JOIN events e ON e.id = era.event_id
       WHERE era.is_active = true
         AND era.attempted_at IS NULL
         AND (
           era.processing_started_at IS NULL
           OR era.processing_started_at < NOW() - ($2::int * INTERVAL '1 minute')
         )
         AND e.status NOT IN ('cancelled', 'completed')
         AND e.start_date > NOW()
         AND (
           (era.timing_type = 'absolute' AND era.absolute_send_at <= NOW())
           OR (
             era.timing_type = 'relative'
             AND e.start_date - (era.relative_minutes_before * INTERVAL '1 minute') <= NOW()
           )
         )
       ORDER BY due_at ASC
       LIMIT $1
       FOR UPDATE OF era SKIP LOCKED
     ),
     claimed AS (
       UPDATE event_reminder_automations era
       SET processing_started_at = NOW(),
           updated_at = NOW()
       FROM due
       WHERE era.id = due.id
       RETURNING era.*
     )
     SELECT
       claimed.*,
       due.due_at,
       e.start_date AS event_start_date,
       e.status AS event_status
     FROM claimed
     INNER JOIN due ON due.id = claimed.id
     INNER JOIN events e ON e.id = claimed.event_id
     ORDER BY due.due_at ASC`,
    [limit, PROCESSING_STALE_TIMEOUT_MINUTES]
  );

  if (result.rows.length > 0) {
    logger.info('Claimed due event reminder automations', { count: result.rows.length });
  }

  return result.rows.map(mapClaimedRow);
}

export async function markAutomationAttemptResult(
  automationId: string,
  result: AutomationAttemptResult
): Promise<void> {
  const params: QueryValue[] = [
    result.status,
    result.summary,
    result.error || null,
    automationId,
  ];

  await pool.query(
    `UPDATE event_reminder_automations
     SET attempted_at = NOW(),
         attempt_status = $1,
         attempt_summary = $2::jsonb,
         last_error = $3,
         processing_started_at = NULL,
         is_active = false,
         updated_at = NOW()
     WHERE id = $4`,
    params
  );
}
