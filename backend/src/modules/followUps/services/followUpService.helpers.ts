import type { Pool } from 'pg';
import type {
  FollowUp,
  FollowUpWithEntity,
} from '@app-types/followUp';

export const STALE_PROCESSING_MINUTES = 10;

export const toIsoDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toISOString().slice(0, 10);
};

export const toIsoTime = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return value.slice(0, 5);
};

export const normalizeDateInput = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return trimmed;
};

export const normalizeTimeInput = (value?: string | null): string => {
  if (!value) return '23:59:59';

  const trimmed = value.trim();
  if (!trimmed) return '23:59:59';

  const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, hours, minutes, seconds] = match;
    return `${hours}:${minutes}:${seconds || '00'}`;
  }

  return trimmed;
};

export const combineDateTime = (date: string | Date, time?: string | null): Date => {
  const normalizedDate = normalizeDateInput(date);
  const normalizedTime = normalizeTimeInput(time);
  return new Date(`${normalizedDate}T${normalizedTime}Z`);
};

export const computeNextScheduledDate = (
  date: string | Date,
  frequency: FollowUp['frequency']
): string | null => {
  if (frequency === 'once') return null;
  const current = new Date(`${normalizeDateInput(date)}T00:00:00Z`);

  if (frequency === 'daily') current.setUTCDate(current.getUTCDate() + 1);
  if (frequency === 'weekly') current.setUTCDate(current.getUTCDate() + 7);
  if (frequency === 'biweekly') current.setUTCDate(current.getUTCDate() + 14);
  if (frequency === 'monthly') current.setUTCMonth(current.getUTCMonth() + 1);

  return current.toISOString().slice(0, 10);
};

export type FollowUpQueryRow = {
  id: string;
  organization_id: string;
  entity_type: FollowUp['entity_type'];
  entity_id: string;
  title: string;
  description: string | null;
  scheduled_date: string | Date;
  scheduled_time: string | null;
  frequency: FollowUp['frequency'];
  frequency_end_date: string | Date | null;
  method: FollowUp['method'] | null;
  status: FollowUp['status'];
  completed_date: string | Date | null;
  completed_notes: string | null;
  assigned_to: string | null;
  assigned_to_name?: string | null;
  reminder_minutes_before: number | null;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  case_number?: string | null;
  case_title?: string | null;
  case_priority?: string | null;
  contact_name?: string | null;
  direct_contact_name?: string | null;
  task_subject?: string | null;
  task_priority?: string | null;
  total_count?: string | number;
  assigned_email?: string | null;
};

export const mapFollowUpRow = (row: FollowUpQueryRow): FollowUpWithEntity => {
  const base: FollowUp = {
    id: row.id,
    organization_id: row.organization_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    title: row.title,
    description: row.description,
    scheduled_date: toIsoDate(row.scheduled_date) || '',
    scheduled_time: toIsoTime(row.scheduled_time || null),
    frequency: row.frequency,
    frequency_end_date: toIsoDate(row.frequency_end_date || null),
    method: row.method,
    status: row.status,
    completed_date: row.completed_date ? new Date(row.completed_date).toISOString() : null,
    completed_notes: row.completed_notes,
    assigned_to: row.assigned_to,
    assigned_to_name: row.assigned_to_name || undefined,
    reminder_minutes_before: row.reminder_minutes_before,
    created_by: row.created_by,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };

  return {
    ...base,
    case_number: row.case_number || undefined,
    case_title: row.case_title || undefined,
    case_priority: row.case_priority || undefined,
    contact_name: row.contact_name || undefined,
    direct_contact_name: row.direct_contact_name || undefined,
    task_subject: row.task_subject || undefined,
    task_priority: row.task_priority || undefined,
  };
};

export const upsertNotificationForFollowUp = async (
  db: Pool,
  followUpId: string
): Promise<void> => {
  const followUpResult = await db.query<FollowUpQueryRow>(
    `SELECT fu.id,
            fu.organization_id,
            fu.scheduled_date,
            fu.scheduled_time,
            fu.reminder_minutes_before,
            fu.status,
            fu.assigned_to,
            u.email AS assigned_email
     FROM follow_ups fu
     LEFT JOIN users u ON u.id = fu.assigned_to
     WHERE fu.id = $1
     LIMIT 1`,
    [followUpId]
  );

  const followUp = followUpResult.rows[0];
  if (!followUp) return;

  if (
    followUp.status !== 'scheduled' ||
    followUp.reminder_minutes_before === null ||
    followUp.reminder_minutes_before === undefined
  ) {
    await db.query(
      `DELETE FROM follow_up_notifications
       WHERE follow_up_id = $1
         AND status IN ('pending', 'processing')`,
      [followUpId]
    );
    return;
  }

  const scheduledAt = combineDateTime(
    followUp.scheduled_date,
    followUp.scheduled_time || null
  );
  const reminderAt = new Date(
    scheduledAt.getTime() - followUp.reminder_minutes_before * 60 * 1000
  );

  await db.query(
    `INSERT INTO follow_up_notifications (
       organization_id,
       follow_up_id,
       scheduled_for,
       status,
       recipient_email
     )
     VALUES ($1, $2, $3, 'pending', $4)
     ON CONFLICT (follow_up_id)
     DO UPDATE
       SET scheduled_for = EXCLUDED.scheduled_for,
           status = 'pending',
           processing_started_at = NULL,
           recipient_email = EXCLUDED.recipient_email,
           error_message = NULL,
           updated_at = NOW()`,
    [
      followUp.organization_id,
      followUpId,
      reminderAt.toISOString(),
      followUp.assigned_email || null,
    ]
  );
};
