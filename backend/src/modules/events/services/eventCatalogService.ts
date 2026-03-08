import { Pool } from 'pg';
import {
  CreateEventDTO,
  Event,
  EventFilters,
  PaginationParams,
  PaginatedEvents,
  UpdateEventDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { resolveSort } from '@utils/queryHelpers';
import { cancelPendingAutomationsForEvent } from '@services/eventReminderAutomationService';
import { QueryValue } from './shared';

export class EventCatalogService {
  constructor(private readonly pool: Pool) {}

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
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount += 1;
    }

    if (event_type) {
      conditions.push(`event_type = $${paramCount}`);
      params.push(event_type);
      paramCount += 1;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount += 1;
    }

    if (typeof is_public === 'boolean') {
      conditions.push(`is_public = $${paramCount}`);
      params.push(is_public);
      paramCount += 1;
    }

    if (start_date) {
      conditions.push(`start_date >= $${paramCount}`);
      params.push(start_date);
      paramCount += 1;
    }

    if (end_date) {
      conditions.push(`end_date <= $${paramCount}`);
      params.push(end_date);
      paramCount += 1;
    }

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`created_by = ANY($${paramCount}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.pool.query(`SELECT COUNT(*) FROM events ${whereClause}`, params);
    const total = Number.parseInt(countResult.rows[0].count, 10);

    const sortColumnMap: Record<string, string> = {
      start_date: 'start_date',
      end_date: 'end_date',
      created_at: 'created_at',
      updated_at: 'updated_at',
      name: 'name',
      status: 'status',
      event_type: 'event_type',
    };
    const { sortColumn, sortOrder } = resolveSort(sort_by, sort_order, sortColumnMap, 'start_date');

    const dataQuery = `
      SELECT
        id as event_id,
        name as event_name,
        description,
        event_type,
        status,
        is_public,
        is_recurring,
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
        registered_count,
        attended_count,
        created_at,
        updated_at,
        created_by,
        modified_by
      FROM events
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);
    const dataResult = await this.pool.query(dataQuery, params);

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
    const baseQuery = `
      SELECT
        id as event_id,
        name as event_name,
        description,
        event_type,
        status,
        is_public,
        is_recurring,
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
        registered_count,
        attended_count,
        created_at,
        updated_at,
        created_by,
        modified_by
      FROM events
      WHERE id = $1
    `;

    const params: QueryValue[] = [eventId];
    const conditions: string[] = [];

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`created_by = ANY($2::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const query = conditions.length > 0 ? `${baseQuery} AND ${conditions.join(' AND ')}` : baseQuery;
    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
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

    const upcomingQuery = `
      SELECT COUNT(*)::int as upcoming_events
      FROM events
      WHERE start_date >= $1
        AND status NOT IN ('cancelled', 'completed')
    `;

    const monthSummaryQuery = `
      SELECT
        COUNT(*)::int as total_this_month,
        COALESCE(AVG(attended_count), 0)::float as avg_attendance
      FROM events
      WHERE start_date >= $1
        AND start_date <= $2
    `;

    const scopeCondition =
      scope?.createdByUserIds && scope.createdByUserIds.length > 0
        ? ' AND created_by = ANY($3::uuid[])'
        : '';

    const upcomingParams: QueryValue[] = [referenceDate];
    const monthParams: QueryValue[] = [startOfMonth, endOfMonth];

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      upcomingParams.push(scope.createdByUserIds);
      monthParams.push(scope.createdByUserIds);
    }

    const [upcomingResult, monthResult] = await Promise.all([
      this.pool.query(`${upcomingQuery}${scopeCondition}`, upcomingParams),
      this.pool.query(`${monthSummaryQuery}${scopeCondition}`, monthParams),
    ]);

    return {
      upcoming_events: upcomingResult.rows[0]?.upcoming_events ?? 0,
      total_this_month: monthResult.rows[0]?.total_this_month ?? 0,
      avg_attendance: monthResult.rows[0]?.avg_attendance ?? 0,
    };
  }

  async createEvent(eventData: CreateEventDTO, userId: string): Promise<Event> {
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
    } = eventData;
    const normalizedRecurrencePattern = is_recurring ? recurrence_pattern || null : null;
    const normalizedRecurrenceInterval = is_recurring ? recurrence_interval || 1 : null;
    const normalizedRecurrenceEndDate = is_recurring ? recurrence_end_date || null : null;

    const result = await this.pool.query(
      `INSERT INTO events (
        name, description, event_type, status, is_public, is_recurring, recurrence_pattern,
        recurrence_interval, recurrence_end_date, start_date, end_date,
        location_name, address_line1, address_line2, city, state_province,
        postal_code, country, capacity, created_by, modified_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20
      )
      RETURNING
        id as event_id,
        name as event_name,
        description,
        event_type,
        status,
        is_public,
        is_recurring,
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
        registered_count,
        attended_count,
        created_at,
        updated_at,
        created_by,
        modified_by`,
      [
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
        userId,
      ]
    );

    return result.rows[0];
  }

  async updateEvent(eventId: string, eventData: UpdateEventDTO, userId: string): Promise<Event> {
    const normalizedData: UpdateEventDTO = { ...eventData };
    const fields: string[] = [];
    const values: QueryValue[] = [];
    let paramCount = 1;

    Object.entries(normalizedData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key === 'event_name' ? 'name' : key} = $${paramCount}`);
        values.push(value);
        paramCount += 1;
      }
    });

    if (normalizedData.is_recurring === false) {
      fields.push(`recurrence_pattern = $${paramCount}`);
      values.push(null);
      paramCount += 1;
      fields.push(`recurrence_interval = $${paramCount}`);
      values.push(null);
      paramCount += 1;
      fields.push(`recurrence_end_date = $${paramCount}`);
      values.push(null);
      paramCount += 1;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`modified_by = $${paramCount}`);
    values.push(userId);
    paramCount += 1;
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(eventId);

    const result = await this.pool.query(
      `UPDATE events
       SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING
         id as event_id,
         name as event_name,
         description,
         event_type,
         status,
         is_public,
         is_recurring,
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
         registered_count,
         attended_count,
         created_at,
         updated_at,
         created_by,
         modified_by`,
      values
    );

    const updated = result.rows[0] as Event | undefined;
    if (!updated) {
      throw new Error('Event not found');
    }

    if (updated.status === 'cancelled' || updated.status === 'completed') {
      await cancelPendingAutomationsForEvent(eventId, `event_status_${updated.status}`, userId);
    } else if (new Date(updated.start_date).getTime() <= Date.now()) {
      await cancelPendingAutomationsForEvent(eventId, 'event_start_passed', userId);
    }

    return updated;
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE events
       SET status = 'cancelled', modified_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [userId, eventId]
    );

    await cancelPendingAutomationsForEvent(eventId, 'event_deleted', userId);
  }
}
