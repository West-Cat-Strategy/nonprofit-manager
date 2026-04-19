import { Pool } from 'pg';
import {
  CreateEventDTO,
  Event,
  EventFilters,
  EventMutationScope,
  EventOccurrence,
  PaginationParams,
  PaginatedEvents,
  UpdateEventOccurrenceDTO,
  UpdateEventDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { resolveSort } from '@utils/queryHelpers';
import { cancelPendingAutomationsForEvent } from '@services/eventReminderAutomationService';
import { EventOccurrenceService } from './eventOccurrenceService';
import { createEventHttpError } from '../eventHttpErrors';
import { QueryValue } from './shared';
import { appendAccountScopeCondition, setTransactionUserContext } from './tenancy';

const EVENT_SUMMARY_SELECT = `
  SELECT
    e.id as event_id,
    e.id as series_id,
    e.name as event_name,
    e.description,
    e.event_type,
    e.status,
    e.is_public,
    e.is_recurring,
    e.recurrence_pattern,
    e.recurrence_interval,
    e.recurrence_end_date,
    e.start_date,
    e.end_date,
    e.location_name,
    e.address_line1,
    e.address_line2,
    e.city,
    e.state_province,
    e.postal_code,
    e.country,
    e.capacity,
    e.waitlist_enabled,
    e.registered_count,
    e.attended_count,
    COALESCE(occurrence_counts.occurrence_count, 0)::int as occurrence_count,
    next_occurrence.occurrence_id as next_occurrence_id,
    next_occurrence.start_date as next_occurrence_start_date,
    next_occurrence.end_date as next_occurrence_end_date,
    next_occurrence.status as next_occurrence_status,
    e.created_at,
    e.updated_at,
    e.organization_id,
    e.created_by,
    e.modified_by
  FROM events e
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int as occurrence_count
    FROM event_occurrences eo_count
    WHERE eo_count.event_id = e.id
  ) occurrence_counts ON true
  LEFT JOIN LATERAL (
    SELECT
      eo.id as occurrence_id,
      eo.start_date,
      eo.end_date,
      eo.status
    FROM event_occurrences eo
    WHERE eo.event_id = e.id
      AND eo.status <> 'cancelled'
    ORDER BY
      CASE WHEN eo.end_date >= NOW() THEN 0 ELSE 1 END,
      CASE WHEN eo.end_date >= NOW() THEN eo.start_date END ASC NULLS LAST,
      CASE WHEN eo.end_date < NOW() THEN eo.start_date END DESC NULLS LAST
    LIMIT 1
  ) next_occurrence ON true
`;

export class EventCatalogService {
  private readonly occurrences: EventOccurrenceService;

  constructor(
    private readonly pool: Pool,
    occurrences?: EventOccurrenceService
  ) {
    this.occurrences = occurrences ?? new EventOccurrenceService(pool);
  }

  async getEvents(
    filters: EventFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedEvents> {
    const { search, event_type, status, is_public, start_date, end_date } = filters;
    const { page = 1, limit = 20, sort_by, sort_order } = pagination;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: QueryValue[] = [];
    let paramCount = 1;

    if (search) {
      conditions.push(
        `(e.name ILIKE $${paramCount} OR COALESCE(e.description, '') ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount += 1;
    }

    if (event_type) {
      conditions.push(`e.event_type = $${paramCount}`);
      params.push(event_type);
      paramCount += 1;
    }

    if (status) {
      conditions.push(`e.status = $${paramCount}`);
      params.push(status);
      paramCount += 1;
    }

    if (typeof is_public === 'boolean') {
      conditions.push(`e.is_public = $${paramCount}`);
      params.push(is_public);
      paramCount += 1;
    }

    if (start_date) {
      conditions.push(`COALESCE(next_occurrence.start_date, e.start_date) >= $${paramCount}`);
      params.push(start_date);
      paramCount += 1;
    }

    if (end_date) {
      conditions.push(`COALESCE(next_occurrence.end_date, e.end_date) <= $${paramCount}`);
      params.push(end_date);
      paramCount += 1;
    }

    appendAccountScopeCondition(conditions, params, scope, 'e.organization_id');

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM events e
       LEFT JOIN LATERAL (
         SELECT eo.start_date, eo.end_date
         FROM event_occurrences eo
         WHERE eo.event_id = e.id
           AND eo.status <> 'cancelled'
         ORDER BY
           CASE WHEN eo.end_date >= NOW() THEN 0 ELSE 1 END,
           CASE WHEN eo.end_date >= NOW() THEN eo.start_date END ASC NULLS LAST,
           CASE WHEN eo.end_date < NOW() THEN eo.start_date END DESC NULLS LAST
         LIMIT 1
       ) next_occurrence ON true
       ${whereClause}`,
      params
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);

    const sortColumnMap: Record<string, string> = {
      start_date: 'COALESCE(next_occurrence.start_date, e.start_date)',
      end_date: 'COALESCE(next_occurrence.end_date, e.end_date)',
      created_at: 'e.created_at',
      updated_at: 'e.updated_at',
      name: 'e.name',
      status: 'e.status',
      event_type: 'e.event_type',
    };
    const { sortColumn, sortOrder } = resolveSort(
      sort_by,
      sort_order,
      sortColumnMap,
      'COALESCE(next_occurrence.start_date, e.start_date)'
    );

    const dataResult = await this.pool.query<Event>(
      `${EVENT_SUMMARY_SELECT}
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}, e.id ${sortOrder}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return {
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getEventById(eventId: string, scope?: DataScopeFilter): Promise<Event | null> {
    const params: QueryValue[] = [eventId];
    const conditions = ['e.id = $1'];

    appendAccountScopeCondition(conditions, params, scope, 'e.organization_id');

    const result = await this.pool.query<Event>(
      `${EVENT_SUMMARY_SELECT}
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      params
    );

    const row = result.rows[0] ?? null;
    if (!row) {
      return null;
    }

    const occurrences = await this.occurrences.getOccurrencesForEvent(
      eventId,
      { include_cancelled: true },
      scope
    );
    return {
      ...row,
      occurrences,
    };
  }

  async getEventAttendanceSummary(
    referenceDate: Date = new Date(),
    scope?: DataScopeFilter
  ): Promise<{
    upcoming_events: number;
    total_this_month: number;
    avg_attendance: number;
  }> {
    const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const endOfMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const upcomingConditions = [
      'eo.start_date >= $1',
      "eo.status NOT IN ('cancelled', 'completed')",
    ];
    const monthConditions = ['eo.start_date >= $1', 'eo.start_date <= $2'];
    const upcomingParams: QueryValue[] = [referenceDate];
    const monthParams: QueryValue[] = [startOfMonth, endOfMonth];
    appendAccountScopeCondition(upcomingConditions, upcomingParams, scope, 'e.organization_id');
    appendAccountScopeCondition(monthConditions, monthParams, scope, 'e.organization_id');

    const [upcomingResult, monthResult] = await Promise.all([
      this.pool.query<{ upcoming_events: number }>(
        `SELECT COUNT(*)::int as upcoming_events
         FROM event_occurrences eo
         INNER JOIN events e ON e.id = eo.event_id
         WHERE ${upcomingConditions.join(' AND ')}`,
        upcomingParams
      ),
      this.pool.query<{ total_this_month: number; avg_attendance: number }>(
        `SELECT
           COUNT(*)::int as total_this_month,
           COALESCE(AVG(eo.attended_count), 0)::float as avg_attendance
         FROM event_occurrences eo
         INNER JOIN events e ON e.id = eo.event_id
         WHERE ${monthConditions.join(' AND ')}`,
        monthParams
      ),
    ]);

    return {
      upcoming_events: upcomingResult.rows[0]?.upcoming_events ?? 0,
      total_this_month: monthResult.rows[0]?.total_this_month ?? 0,
      avg_attendance: monthResult.rows[0]?.avg_attendance ?? 0,
    };
  }

  async createEvent(
    eventData: CreateEventDTO,
    userId: string,
    organizationId: string
  ): Promise<Event> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await setTransactionUserContext(client, userId);

      const {
        event_name,
        description,
        event_type,
        status = 'planned',
        is_public = false,
        is_recurring = false,
        recurrence_pattern,
        recurrence_interval,
        recurrence_end_date,
        start_date,
        end_date,
        location_name,
        address_line1,
        address_line2,
        city,
        state_province,
        postal_code,
        country,
        capacity,
        waitlist_enabled = true,
      } = eventData;

      const normalizedRecurrencePattern = is_recurring ? recurrence_pattern || null : null;
      const normalizedRecurrenceInterval = is_recurring ? recurrence_interval || 1 : null;
      const normalizedRecurrenceEndDate = is_recurring ? recurrence_end_date || null : null;

      const result = await client.query<{ event_id: string }>(
        `INSERT INTO events (
          organization_id,
          name, description, event_type, status, is_public, is_recurring, recurrence_pattern,
          recurrence_interval, recurrence_end_date, start_date, end_date,
          location_name, address_line1, address_line2, city, state_province,
          postal_code, country, capacity, waitlist_enabled, created_by, modified_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $22
        )
        RETURNING id as event_id`,
        [
          organizationId,
          event_name,
          description || null,
          event_type,
          status,
          is_public,
          is_recurring,
          normalizedRecurrencePattern,
          normalizedRecurrenceInterval,
          normalizedRecurrenceEndDate,
          start_date,
          end_date,
          location_name || null,
          address_line1 || null,
          address_line2 || null,
          city || null,
          state_province || null,
          postal_code || null,
          country || null,
          capacity || null,
          waitlist_enabled,
          userId,
        ]
      );

      const eventId = result.rows[0]?.event_id;
      if (!eventId) {
        throw new Error('Failed to create event');
      }

      await this.occurrences.syncOccurrencesForEvent(eventId, client);
      await client.query('COMMIT');

      const created = await this.getEventById(eventId, { accountIds: [organizationId] });
      if (!created) {
        throw createEventHttpError('EVENT_NOT_FOUND', 404, 'Event not found');
      }

      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateEvent(eventId: string, eventData: UpdateEventDTO, userId: string): Promise<Event> {
    const normalizedData: UpdateEventDTO = { ...eventData };
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await setTransactionUserContext(client, userId);

      const fields: string[] = [];
      const values: QueryValue[] = [];
      let paramCount = 1;

      Object.entries(normalizedData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key === 'event_name' ? 'name' : key} = $${paramCount}`);
          values.push(value as QueryValue);
          paramCount += 1;
        }
      });

      if (normalizedData.is_recurring === false) {
        fields.push(`recurrence_pattern = $${paramCount++}`);
        values.push(null);
        fields.push(`recurrence_interval = $${paramCount++}`);
        values.push(null);
        fields.push(`recurrence_end_date = $${paramCount++}`);
        values.push(null);
      }

      if (fields.length === 0) {
        throw createEventHttpError('VALIDATION_ERROR', 400, 'No fields to update');
      }

      fields.push(`modified_by = $${paramCount++}`);
      values.push(userId);
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(eventId);

      const result = await client.query<{ status: string; start_date: Date }>(
        `UPDATE events
         SET ${fields.join(', ')}
         WHERE id = $${paramCount}
         RETURNING status, start_date`,
        values
      );

      const updatedRow = result.rows[0];
      if (!updatedRow) {
        throw createEventHttpError('EVENT_NOT_FOUND', 404, 'Event not found');
      }

      await this.occurrences.syncOccurrencesForEvent(eventId, client);

      if (updatedRow.status === 'cancelled' || updatedRow.status === 'completed') {
        await cancelPendingAutomationsForEvent(
          eventId,
          `event_status_${updatedRow.status}`,
          userId
        );
      } else if (new Date(updatedRow.start_date).getTime() <= Date.now()) {
        await cancelPendingAutomationsForEvent(eventId, 'event_start_passed', userId);
      }

      await client.query('COMMIT');

      const updated = await this.getEventById(eventId);
      if (!updated) {
        throw createEventHttpError('EVENT_NOT_FOUND', 404, 'Event not found');
      }

      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await setTransactionUserContext(client, userId);

      await client.query(
        `UPDATE events
         SET status = 'cancelled', modified_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [userId, eventId]
      );

      await client.query(
        `UPDATE event_occurrences
         SET status = 'cancelled',
             modified_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE event_id = $2`,
        [userId, eventId]
      );

      await client.query('COMMIT');
      await cancelPendingAutomationsForEvent(eventId, 'event_deleted', userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listOccurrences(
    filters: {
      event_id?: string;
      start_date?: Date;
      end_date?: Date;
      include_cancelled?: boolean;
    } = {},
    scope?: DataScopeFilter
  ): Promise<EventOccurrence[]> {
    return this.occurrences.listOccurrences(filters, scope);
  }

  async getOccurrenceById(
    occurrenceId: string,
    scope?: DataScopeFilter
  ): Promise<EventOccurrence | null> {
    return this.occurrences.getOccurrenceById(occurrenceId, scope);
  }

  async updateOccurrence(
    occurrenceId: string,
    data: UpdateEventOccurrenceDTO,
    scope: EventMutationScope,
    userId: string
  ): Promise<EventOccurrence | null> {
    return this.occurrences.updateOccurrence(occurrenceId, data, scope, userId);
  }
}
