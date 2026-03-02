import { Pool } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  CompleteFollowUpDTO,
  CreateFollowUpDTO,
  FollowUp,
  FollowUpFilters,
  FollowUpSummary,
  FollowUpWithEntity,
  UpdateFollowUpDTO,
} from '@app-types/followUp';

type FollowUpRow = FollowUpWithEntity & {
  reminder_minutes_before?: number | null;
  assigned_email?: string | null;
};

const STALE_PROCESSING_MINUTES = 10;

const toIsoDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toISOString().slice(0, 10);
};

const toIsoTime = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return value.slice(0, 5);
};

const combineDateTime = (date: string, time?: string | null): Date => {
  const normalizedTime = time ? `${time}:00` : '23:59:59';
  return new Date(`${date}T${normalizedTime}Z`);
};

const computeNextScheduledDate = (date: string, frequency: FollowUp['frequency']): string | null => {
  if (frequency === 'once') return null;
  const current = new Date(`${date}T00:00:00Z`);

  if (frequency === 'daily') current.setUTCDate(current.getUTCDate() + 1);
  if (frequency === 'weekly') current.setUTCDate(current.getUTCDate() + 7);
  if (frequency === 'biweekly') current.setUTCDate(current.getUTCDate() + 14);
  if (frequency === 'monthly') current.setUTCMonth(current.getUTCMonth() + 1);

  return current.toISOString().slice(0, 10);
};

const mapRow = (row: FollowUpRow): FollowUpWithEntity => ({
  ...row,
  scheduled_date: toIsoDate(row.scheduled_date) || '',
  scheduled_time: toIsoTime(row.scheduled_time || null),
  frequency_end_date: toIsoDate(row.frequency_end_date || null),
  completed_date: row.completed_date ? new Date(row.completed_date).toISOString() : null,
  created_at: new Date(row.created_at).toISOString(),
  updated_at: new Date(row.updated_at).toISOString(),
});

export class FollowUpService {
  constructor(private readonly db: Pool) {}

  private async upsertNotificationForFollowUp(followUpId: string): Promise<void> {
    const followUpResult = await this.db.query<FollowUpRow>(
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
      await this.db.query(
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

    await this.db.query(
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
  }

  async getFollowUps(
    organizationId: string,
    filters: FollowUpFilters
  ): Promise<{
    data: FollowUpWithEntity[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: string[] = ['fu.organization_id = $1'];
    const values: unknown[] = [organizationId];

    const addFilter = (clause: string, value?: unknown): void => {
      if (value === undefined || value === null || value === '') return;
      values.push(value);
      where.push(clause.replace('?', `$${values.length}`));
    };

    addFilter('fu.entity_type = ?', filters.entity_type);
    addFilter('fu.entity_id = ?', filters.entity_id);

    if (filters.status && filters.status !== 'overdue') {
      addFilter('fu.status = ?', filters.status);
    }

    addFilter('fu.assigned_to = ?', filters.assigned_to);
    addFilter('fu.scheduled_date >= ?', filters.date_from);
    addFilter('fu.scheduled_date <= ?', filters.date_to);

    if (filters.status === 'overdue' || filters.overdue_only) {
      where.push(
        `fu.status = 'scheduled' AND (fu.scheduled_date::timestamp + COALESCE(fu.scheduled_time, '23:59:59'::time)) < NOW()`
      );
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const totalResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM follow_ups fu
       ${whereClause}`,
      values
    );

    const total = Number.parseInt(totalResult.rows[0]?.count || '0', 10);

    const rowsResult = await this.db.query<FollowUpRow>(
      `SELECT fu.*,
              assignee.first_name || ' ' || assignee.last_name AS assigned_to_name,
              c.case_number,
              c.title AS case_title,
              c.priority AS case_priority,
              con.first_name || ' ' || con.last_name AS contact_name,
              t.subject AS task_subject,
              t.priority AS task_priority
       FROM follow_ups fu
       LEFT JOIN users assignee ON assignee.id = fu.assigned_to
       LEFT JOIN cases c ON fu.entity_type = 'case' AND fu.entity_id = c.id
       LEFT JOIN contacts con ON c.contact_id = con.id
       LEFT JOIN tasks t ON fu.entity_type = 'task' AND fu.entity_id = t.id
       ${whereClause}
       ORDER BY fu.scheduled_date ASC, fu.scheduled_time ASC NULLS LAST, fu.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return {
      data: rowsResult.rows.map(mapRow),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowUpSummary(
    organizationId: string,
    filters: Omit<FollowUpFilters, 'page' | 'limit'>
  ): Promise<FollowUpSummary> {
    const where: string[] = ['organization_id = $1'];
    const values: unknown[] = [organizationId];

    const addFilter = (clause: string, value?: unknown): void => {
      if (value === undefined || value === null || value === '') return;
      values.push(value);
      where.push(clause.replace('?', `$${values.length}`));
    };

    addFilter('entity_type = ?', filters.entity_type);
    addFilter('entity_id = ?', filters.entity_id);
    addFilter('assigned_to = ?', filters.assigned_to);

    if (filters.date_from) addFilter('scheduled_date >= ?', filters.date_from);
    if (filters.date_to) addFilter('scheduled_date <= ?', filters.date_to);

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const result = await this.db.query<{
      total: string;
      scheduled: string;
      completed: string;
      cancelled: string;
      overdue: string;
      due_today: string;
      due_this_week: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'scheduled')::text AS scheduled,
         COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
         COUNT(*) FILTER (
           WHERE status = 'scheduled'
             AND (scheduled_date::timestamp + COALESCE(scheduled_time, '23:59:59'::time)) < NOW()
         )::text AS overdue,
         COUNT(*) FILTER (
           WHERE status = 'scheduled' AND scheduled_date = CURRENT_DATE
         )::text AS due_today,
         COUNT(*) FILTER (
           WHERE status = 'scheduled'
             AND scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         )::text AS due_this_week
       FROM follow_ups
       ${whereClause}`,
      values
    );

    const row = result.rows[0];
    return {
      total: Number.parseInt(row?.total || '0', 10),
      scheduled: Number.parseInt(row?.scheduled || '0', 10),
      completed: Number.parseInt(row?.completed || '0', 10),
      cancelled: Number.parseInt(row?.cancelled || '0', 10),
      overdue: Number.parseInt(row?.overdue || '0', 10),
      due_today: Number.parseInt(row?.due_today || '0', 10),
      due_this_week: Number.parseInt(row?.due_this_week || '0', 10),
    };
  }

  async getUpcomingFollowUps(
    organizationId: string,
    limit = 10
  ): Promise<FollowUpWithEntity[]> {
    const result = await this.db.query<FollowUpRow>(
      `SELECT fu.*,
              assignee.first_name || ' ' || assignee.last_name AS assigned_to_name,
              c.case_number,
              c.title AS case_title,
              c.priority AS case_priority,
              con.first_name || ' ' || con.last_name AS contact_name,
              t.subject AS task_subject,
              t.priority AS task_priority
       FROM follow_ups fu
       LEFT JOIN users assignee ON assignee.id = fu.assigned_to
       LEFT JOIN cases c ON fu.entity_type = 'case' AND fu.entity_id = c.id
       LEFT JOIN contacts con ON c.contact_id = con.id
       LEFT JOIN tasks t ON fu.entity_type = 'task' AND fu.entity_id = t.id
       WHERE fu.organization_id = $1
         AND fu.status = 'scheduled'
       ORDER BY fu.scheduled_date ASC, fu.scheduled_time ASC NULLS LAST
       LIMIT $2`,
      [organizationId, limit]
    );

    return result.rows.map(mapRow);
  }

  async getEntityFollowUps(
    organizationId: string,
    entityType: FollowUp['entity_type'],
    entityId: string
  ): Promise<FollowUp[]> {
    const result = await this.db.query<FollowUpRow>(
      `SELECT fu.*, assignee.first_name || ' ' || assignee.last_name AS assigned_to_name
       FROM follow_ups fu
       LEFT JOIN users assignee ON assignee.id = fu.assigned_to
       WHERE fu.organization_id = $1
         AND fu.entity_type = $2
         AND fu.entity_id = $3
       ORDER BY fu.scheduled_date ASC, fu.scheduled_time ASC NULLS LAST, fu.created_at DESC`,
      [organizationId, entityType, entityId]
    );

    return result.rows.map(mapRow);
  }

  async getFollowUpById(
    organizationId: string,
    followUpId: string
  ): Promise<FollowUp | null> {
    const result = await this.db.query<FollowUpRow>(
      `SELECT fu.*, assignee.first_name || ' ' || assignee.last_name AS assigned_to_name
       FROM follow_ups fu
       LEFT JOIN users assignee ON assignee.id = fu.assigned_to
       WHERE fu.organization_id = $1
         AND fu.id = $2
       LIMIT 1`,
      [organizationId, followUpId]
    );

    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async createFollowUp(
    organizationId: string,
    userId: string,
    data: CreateFollowUpDTO
  ): Promise<FollowUp> {
    const result = await this.db.query<FollowUpRow>(
      `INSERT INTO follow_ups (
         organization_id,
         entity_type,
         entity_id,
         title,
         description,
         scheduled_date,
         scheduled_time,
         frequency,
         frequency_end_date,
         method,
         assigned_to,
         reminder_minutes_before,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
       RETURNING *`,
      [
        organizationId,
        data.entity_type,
        data.entity_id,
        data.title,
        data.description || null,
        data.scheduled_date,
        data.scheduled_time || null,
        data.frequency || 'once',
        data.frequency_end_date || null,
        data.method || null,
        data.assigned_to || null,
        data.reminder_minutes_before ?? null,
        userId,
      ]
    );

    await this.upsertNotificationForFollowUp(result.rows[0].id);
    return mapRow(result.rows[0]);
  }

  async updateFollowUp(
    organizationId: string,
    followUpId: string,
    userId: string,
    data: UpdateFollowUpDTO
  ): Promise<FollowUp | null> {
    const updates: string[] = [];
    const values: unknown[] = [organizationId, followUpId];

    const addUpdate = (field: string, value: unknown): void => {
      values.push(value);
      updates.push(`${field} = $${values.length}`);
    };

    if (data.title !== undefined) addUpdate('title', data.title);
    if (data.description !== undefined) addUpdate('description', data.description);
    if (data.scheduled_date !== undefined) addUpdate('scheduled_date', data.scheduled_date);
    if (data.scheduled_time !== undefined) addUpdate('scheduled_time', data.scheduled_time);
    if (data.frequency !== undefined) addUpdate('frequency', data.frequency);
    if (data.frequency_end_date !== undefined) addUpdate('frequency_end_date', data.frequency_end_date);
    if (data.method !== undefined) addUpdate('method', data.method);
    if (data.status !== undefined && data.status !== 'overdue') addUpdate('status', data.status);
    if (data.assigned_to !== undefined) addUpdate('assigned_to', data.assigned_to);
    if (data.reminder_minutes_before !== undefined) {
      addUpdate('reminder_minutes_before', data.reminder_minutes_before);
    }

    if (updates.length === 0) {
      return this.getFollowUpById(organizationId, followUpId);
    }

    values.push(userId);
    updates.push(`modified_by = $${values.length}`);
    updates.push('updated_at = NOW()');

    const result = await this.db.query<FollowUpRow>(
      `UPDATE follow_ups
       SET ${updates.join(', ')}
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    await this.upsertNotificationForFollowUp(followUpId);
    return mapRow(result.rows[0]);
  }

  async completeFollowUp(
    organizationId: string,
    followUpId: string,
    userId: string,
    data: CompleteFollowUpDTO
  ): Promise<FollowUp | null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const currentResult = await client.query<FollowUpRow>(
        `SELECT *
         FROM follow_ups
         WHERE organization_id = $1
           AND id = $2
         LIMIT 1`,
        [organizationId, followUpId]
      );

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const current = currentResult.rows[0];

      const updateResult = await client.query<FollowUpRow>(
        `UPDATE follow_ups
         SET status = 'completed',
             completed_date = NOW(),
             completed_notes = $3,
             modified_by = $4,
             updated_at = NOW()
         WHERE organization_id = $1
           AND id = $2
         RETURNING *`,
        [organizationId, followUpId, data.completed_notes || null, userId]
      );

      await client.query(
        `DELETE FROM follow_up_notifications
         WHERE follow_up_id = $1
           AND status IN ('pending', 'processing')`,
        [followUpId]
      );

      const shouldScheduleNext =
        (data.schedule_next !== false && current.frequency !== 'once') ||
        Boolean(data.next_scheduled_date);

      if (shouldScheduleNext) {
        const nextDate =
          data.next_scheduled_date ||
          computeNextScheduledDate(current.scheduled_date, current.frequency);

        if (nextDate) {
          const endDate = current.frequency_end_date
            ? new Date(`${current.frequency_end_date}T00:00:00Z`)
            : null;
          const candidate = new Date(`${nextDate}T00:00:00Z`);

          if (!endDate || candidate <= endDate) {
            const insertedResult = await client.query<{ id: string }>(
              `INSERT INTO follow_ups (
                 organization_id,
                 entity_type,
                 entity_id,
                 title,
                 description,
                 scheduled_date,
                 scheduled_time,
                 frequency,
                 frequency_end_date,
                 method,
                 status,
                 assigned_to,
                 reminder_minutes_before,
                 created_by,
                 modified_by
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled', $11, $12, $13, $13)
               RETURNING id`,
              [
                current.organization_id,
                current.entity_type,
                current.entity_id,
                current.title,
                current.description || null,
                nextDate,
                current.scheduled_time || null,
                current.frequency,
                current.frequency_end_date || null,
                current.method || null,
                current.assigned_to || null,
                current.reminder_minutes_before ?? null,
                userId,
              ]
            );

            await this.upsertNotificationForFollowUp(insertedResult.rows[0].id);
          }
        }
      }

      await client.query('COMMIT');
      return mapRow(updateResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to complete follow-up', {
        error,
        organizationId,
        followUpId,
      });
      throw Object.assign(new Error('Failed to complete follow-up'), { cause: error });
    } finally {
      client.release();
    }
  }

  async cancelFollowUp(
    organizationId: string,
    followUpId: string,
    userId: string
  ): Promise<FollowUp | null> {
    const result = await this.db.query<FollowUpRow>(
      `UPDATE follow_ups
       SET status = 'cancelled',
           modified_by = $3,
           updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [organizationId, followUpId, userId]
    );

    if (result.rows.length === 0) return null;

    await this.db.query(
      `DELETE FROM follow_up_notifications
       WHERE follow_up_id = $1
         AND status IN ('pending', 'processing')`,
      [followUpId]
    );

    return mapRow(result.rows[0]);
  }

  async rescheduleFollowUp(
    organizationId: string,
    followUpId: string,
    userId: string,
    scheduledDate: string,
    scheduledTime?: string | null
  ): Promise<FollowUp | null> {
    const result = await this.db.query<FollowUpRow>(
      `UPDATE follow_ups
       SET scheduled_date = $3,
           scheduled_time = $4,
           status = 'scheduled',
           completed_date = NULL,
           completed_notes = NULL,
           modified_by = $5,
           updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [organizationId, followUpId, scheduledDate, scheduledTime || null, userId]
    );

    if (result.rows.length === 0) return null;

    await this.upsertNotificationForFollowUp(followUpId);
    return mapRow(result.rows[0]);
  }

  async deleteFollowUp(
    organizationId: string,
    followUpId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM follow_ups
       WHERE organization_id = $1
         AND id = $2
       RETURNING id`,
      [organizationId, followUpId]
    );

    return result.rows.length > 0;
  }

  async claimDueNotifications(batchSize: number): Promise<Array<{
    id: string;
    follow_up_id: string;
    organization_id: string;
    recipient_email: string | null;
  }>> {
    const result = await this.db.query<{
      id: string;
      follow_up_id: string;
      organization_id: string;
      recipient_email: string | null;
    }>(
      `WITH due AS (
         SELECT id
         FROM follow_up_notifications
         WHERE status IN ('pending', 'processing')
           AND scheduled_for <= NOW()
           AND (
             status = 'pending'
             OR (
               status = 'processing'
               AND processing_started_at < NOW() - INTERVAL '${STALE_PROCESSING_MINUTES} minutes'
             )
           )
         ORDER BY scheduled_for ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE follow_up_notifications n
       SET status = 'processing',
           processing_started_at = NOW(),
           attempt_count = attempt_count + 1,
           updated_at = NOW()
       FROM due
       WHERE n.id = due.id
       RETURNING n.id, n.follow_up_id, n.organization_id, n.recipient_email`,
      [batchSize]
    );

    return result.rows;
  }

  async markNotificationResult(
    notificationId: string,
    payload: { status: 'sent' | 'failed' | 'skipped'; errorMessage?: string | null }
  ): Promise<void> {
    await this.db.query(
      `UPDATE follow_up_notifications
       SET status = $2,
           sent_at = CASE WHEN $2 IN ('sent', 'skipped') THEN NOW() ELSE sent_at END,
           processing_started_at = NULL,
           error_message = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [notificationId, payload.status, payload.errorMessage || null]
    );
  }
}

export const followUpService = new FollowUpService(pool);
