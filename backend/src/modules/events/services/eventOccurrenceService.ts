import { Pool, type PoolClient } from 'pg';
import type {
  EventOccurrence,
  EventOccurrenceFilters,
  EventStatus,
  RecurrencePattern,
  UpdateEventOccurrenceDTO,
  EventMutationScope,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { QueryValue } from './shared';
import { createEventHttpError } from '../eventHttpErrors';

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

interface EventSeriesRow {
  event_id: string;
  event_name: string;
  description: string | null;
  status: EventStatus;
  start_date: Date;
  end_date: Date;
  location_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  capacity: number | null;
  waitlist_enabled: boolean;
  public_checkin_enabled: boolean;
  public_checkin_pin_hash: string | null;
  public_checkin_pin_rotated_at: Date | null;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_interval: number | null;
  recurrence_end_date: Date | null;
  is_recurring: boolean;
  created_by: string | null;
  modified_by: string | null;
}

const DEFAULT_RECURRENCE_HORIZON_DAYS = 365;
const MAX_GENERATED_OCCURRENCES = 366;

const OCCURRENCE_SELECT = `
  SELECT
    eo.id as occurrence_id,
    eo.event_id,
    eo.sequence_index,
    eo.sequence_index as occurrence_index,
    eo.event_id as series_id,
    eo.scheduled_start_date,
    eo.scheduled_end_date,
    eo.start_date,
    eo.end_date,
    eo.status,
    eo.event_name,
    eo.event_name as occurrence_name,
    eo.description,
    e.event_type,
    e.is_public,
    eo.location_name,
    eo.address_line1,
    eo.address_line2,
    eo.city,
    eo.state_province,
    eo.postal_code,
    eo.country,
    eo.capacity,
    eo.registered_count,
    eo.attended_count,
    eo.waitlist_enabled,
    eo.public_checkin_enabled,
    (eo.public_checkin_pin_hash IS NOT NULL) as public_checkin_pin_configured,
    (eo.public_checkin_pin_hash IS NOT NULL) as public_checkin_pin_required,
    eo.public_checkin_pin_rotated_at,
    eo.is_exception,
    eo.created_at,
    eo.updated_at,
    eo.created_by,
    eo.modified_by
  FROM event_occurrences eo
`;

const addRecurrence = (date: Date, pattern: RecurrencePattern, interval: number): Date => {
  const next = new Date(date);
  switch (pattern) {
    case 'daily':
      next.setUTCDate(next.getUTCDate() + interval);
      return next;
    case 'weekly':
      next.setUTCDate(next.getUTCDate() + interval * 7);
      return next;
    case 'monthly':
      next.setUTCMonth(next.getUTCMonth() + interval);
      return next;
    case 'yearly':
      next.setUTCFullYear(next.getUTCFullYear() + interval);
      return next;
    default:
      next.setUTCDate(next.getUTCDate() + interval);
      return next;
  }
};

const buildOccurrenceSchedule = (event: EventSeriesRow): Array<{
  sequenceIndex: number;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
}> => {
  const durationMs = new Date(event.end_date).getTime() - new Date(event.start_date).getTime();
  const schedule: Array<{
    sequenceIndex: number;
    scheduledStartDate: Date;
    scheduledEndDate: Date;
  }> = [];

  let currentStart = new Date(event.start_date);
  let sequenceIndex = 0;

  const endBoundary = event.is_recurring
    ? event.recurrence_end_date
      ? new Date(event.recurrence_end_date)
      : new Date(new Date(event.start_date).getTime() + DEFAULT_RECURRENCE_HORIZON_DAYS * 24 * 60 * 60 * 1000)
    : new Date(event.start_date);

  while (sequenceIndex === 0 || (event.is_recurring && currentStart <= endBoundary)) {
    schedule.push({
      sequenceIndex,
      scheduledStartDate: new Date(currentStart),
      scheduledEndDate: new Date(currentStart.getTime() + durationMs),
    });

    if (!event.is_recurring || !event.recurrence_pattern) {
      break;
    }

    sequenceIndex += 1;
    if (sequenceIndex >= MAX_GENERATED_OCCURRENCES) {
      break;
    }

    currentStart = addRecurrence(currentStart, event.recurrence_pattern, event.recurrence_interval || 1);
  }

  return schedule;
};

export class EventOccurrenceService {
  constructor(private readonly pool: Pool) {}

  private async getSeriesRow(eventId: string, queryable: Queryable = this.pool): Promise<EventSeriesRow | null> {
    const result = await queryable.query<EventSeriesRow>(
      `SELECT
         id as event_id,
         name as event_name,
         description,
         status,
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
         waitlist_enabled,
         public_checkin_enabled,
         public_checkin_pin_hash,
         public_checkin_pin_rotated_at,
         recurrence_pattern,
         recurrence_interval,
         recurrence_end_date,
         is_recurring,
         created_by,
         modified_by
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    return result.rows[0] ?? null;
  }

  async getOccurrenceById(
    occurrenceId: string,
    scope?: DataScopeFilter,
    queryable: Queryable = this.pool
  ): Promise<EventOccurrence | null> {
    const params: QueryValue[] = [occurrenceId];
    const conditions: string[] = ['eo.id = $1'];

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`e.created_by = ANY($${params.length + 1}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const result = await queryable.query<EventOccurrence>(
      `${OCCURRENCE_SELECT}
       INNER JOIN events e ON e.id = eo.event_id
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      params
    );

    return result.rows[0] ?? null;
  }

  async getOccurrencesForEvent(
    eventId: string,
    filters: EventOccurrenceFilters = {},
    scope?: DataScopeFilter,
    queryable: Queryable = this.pool
  ): Promise<EventOccurrence[]> {
    const params: QueryValue[] = [eventId];
    const conditions: string[] = ['eo.event_id = $1'];

    if (filters.start_date) {
      conditions.push(`eo.start_date >= $${params.length + 1}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`eo.end_date <= $${params.length + 1}`);
      params.push(filters.end_date);
    }

    if (!filters.include_cancelled) {
      conditions.push(`eo.status != 'cancelled'`);
    }

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`e.created_by = ANY($${params.length + 1}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const result = await queryable.query<EventOccurrence>(
      `${OCCURRENCE_SELECT}
       INNER JOIN events e ON e.id = eo.event_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY eo.start_date ASC`,
      params
    );

    return result.rows;
  }

  async listOccurrences(
    filters: EventOccurrenceFilters = {},
    scope?: DataScopeFilter,
    queryable: Queryable = this.pool
  ): Promise<EventOccurrence[]> {
    const conditions: string[] = [];
    const params: QueryValue[] = [];

    if (filters.event_id) {
      conditions.push(`eo.event_id = $${params.length + 1}`);
      params.push(filters.event_id);
    }

    if (filters.start_date) {
      conditions.push(`eo.end_date >= $${params.length + 1}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`eo.start_date <= $${params.length + 1}`);
      params.push(filters.end_date);
    }

    if (filters.search) {
      conditions.push(
        `(eo.event_name ILIKE $${params.length + 1} OR COALESCE(eo.description, '') ILIKE $${params.length + 1} OR COALESCE(eo.location_name, '') ILIKE $${params.length + 1})`
      );
      params.push(`%${filters.search}%`);
    }

    if (filters.event_type) {
      conditions.push(`e.event_type = $${params.length + 1}`);
      params.push(filters.event_type);
    }

    if (filters.status) {
      conditions.push(`eo.status = $${params.length + 1}`);
      params.push(filters.status);
    }

    if (typeof filters.is_public === 'boolean') {
      conditions.push(`e.is_public = $${params.length + 1}`);
      params.push(filters.is_public);
    }

    if (!filters.include_cancelled) {
      conditions.push(`eo.status != 'cancelled'`);
    }

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`e.created_by = ANY($${params.length + 1}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await queryable.query<EventOccurrence>(
      `${OCCURRENCE_SELECT}
       INNER JOIN events e ON e.id = eo.event_id
       ${whereClause}
       ORDER BY eo.start_date ASC`,
      params
    );

    return result.rows;
  }

  async resolveOccurrence(
    eventId: string,
    occurrenceId?: string | null,
    queryable: Queryable = this.pool
  ): Promise<EventOccurrence | null> {
    if (occurrenceId) {
      const occurrence = await this.getOccurrenceById(occurrenceId, undefined, queryable);
      if (occurrence && occurrence.event_id === eventId) {
        return occurrence;
      }
      return null;
    }

    const upcoming = await queryable.query<EventOccurrence>(
      `${OCCURRENCE_SELECT}
       INNER JOIN events e ON e.id = eo.event_id
       WHERE eo.event_id = $1
       ORDER BY
         CASE WHEN eo.end_date >= NOW() THEN 0 ELSE 1 END,
         CASE WHEN eo.end_date >= NOW() THEN eo.start_date END ASC NULLS LAST,
         CASE WHEN eo.end_date < NOW() THEN eo.start_date END DESC NULLS LAST
       LIMIT 1`,
      [eventId]
    );

    return upcoming.rows[0] ?? null;
  }

  async syncOccurrencesForEvent(eventId: string, queryable: Queryable = this.pool): Promise<void> {
    const event = await this.getSeriesRow(eventId, queryable);
    if (!event) {
      throw createEventHttpError('EVENT_NOT_FOUND', 404, 'Event not found');
    }

    const schedule = buildOccurrenceSchedule(event);
    const retainedScheduledStarts = schedule.map((item) => item.scheduledStartDate);

    for (const item of schedule) {
      await queryable.query(
        `INSERT INTO event_occurrences (
           event_id,
           sequence_index,
           scheduled_start_date,
           scheduled_end_date,
           start_date,
           end_date,
           status,
           event_name,
           description,
           location_name,
           address_line1,
           address_line2,
           city,
           state_province,
           postal_code,
           country,
           capacity,
           waitlist_enabled,
           public_checkin_enabled,
           public_checkin_pin_hash,
           public_checkin_pin_rotated_at,
           created_by,
           modified_by
         )
         VALUES (
           $1, $2, $3, $4, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
           $18, $19, $20, $21
         )
         ON CONFLICT (event_id, scheduled_start_date)
         DO UPDATE
         SET
           sequence_index = EXCLUDED.sequence_index,
           scheduled_end_date = EXCLUDED.scheduled_end_date,
           start_date = CASE WHEN event_occurrences.is_exception THEN event_occurrences.start_date ELSE EXCLUDED.start_date END,
           end_date = CASE WHEN event_occurrences.is_exception THEN event_occurrences.end_date ELSE EXCLUDED.end_date END,
           status = CASE WHEN event_occurrences.is_exception THEN event_occurrences.status ELSE EXCLUDED.status END,
           event_name = CASE WHEN event_occurrences.is_exception THEN event_occurrences.event_name ELSE EXCLUDED.event_name END,
           description = CASE WHEN event_occurrences.is_exception THEN event_occurrences.description ELSE EXCLUDED.description END,
           location_name = CASE WHEN event_occurrences.is_exception THEN event_occurrences.location_name ELSE EXCLUDED.location_name END,
           address_line1 = CASE WHEN event_occurrences.is_exception THEN event_occurrences.address_line1 ELSE EXCLUDED.address_line1 END,
           address_line2 = CASE WHEN event_occurrences.is_exception THEN event_occurrences.address_line2 ELSE EXCLUDED.address_line2 END,
           city = CASE WHEN event_occurrences.is_exception THEN event_occurrences.city ELSE EXCLUDED.city END,
           state_province = CASE WHEN event_occurrences.is_exception THEN event_occurrences.state_province ELSE EXCLUDED.state_province END,
           postal_code = CASE WHEN event_occurrences.is_exception THEN event_occurrences.postal_code ELSE EXCLUDED.postal_code END,
           country = CASE WHEN event_occurrences.is_exception THEN event_occurrences.country ELSE EXCLUDED.country END,
           capacity = CASE WHEN event_occurrences.is_exception THEN event_occurrences.capacity ELSE EXCLUDED.capacity END,
           waitlist_enabled = CASE WHEN event_occurrences.is_exception THEN event_occurrences.waitlist_enabled ELSE EXCLUDED.waitlist_enabled END,
           public_checkin_enabled = CASE WHEN event_occurrences.is_exception THEN event_occurrences.public_checkin_enabled ELSE EXCLUDED.public_checkin_enabled END,
           public_checkin_pin_hash = CASE WHEN event_occurrences.is_exception THEN event_occurrences.public_checkin_pin_hash ELSE EXCLUDED.public_checkin_pin_hash END,
           public_checkin_pin_rotated_at = CASE WHEN event_occurrences.is_exception THEN event_occurrences.public_checkin_pin_rotated_at ELSE EXCLUDED.public_checkin_pin_rotated_at END,
           modified_by = EXCLUDED.modified_by,
           updated_at = CURRENT_TIMESTAMP`,
        [
          event.event_id,
          item.sequenceIndex,
          item.scheduledStartDate,
          item.scheduledEndDate,
          event.status,
          event.event_name,
          event.description,
          event.location_name,
          event.address_line1,
          event.address_line2,
          event.city,
          event.state_province,
          event.postal_code,
          event.country,
          event.capacity,
          event.waitlist_enabled,
          event.public_checkin_enabled,
          event.public_checkin_pin_hash,
          event.public_checkin_pin_rotated_at,
          event.created_by,
          event.modified_by,
        ]
      );
    }

    await queryable.query(
      `DELETE FROM event_occurrences eo
       WHERE eo.event_id = $1
         AND NOT (eo.scheduled_start_date = ANY($2::timestamptz[]))
         AND NOT EXISTS (
           SELECT 1
           FROM event_registrations er
           WHERE er.occurrence_id = eo.id
         )`,
      [eventId, retainedScheduledStarts as unknown as QueryValue]
    );

    await this.recalculateEventCounts(eventId, queryable);
  }

  async recalculateOccurrenceCounts(occurrenceId: string, queryable: Queryable = this.pool): Promise<void> {
    await queryable.query(
      `UPDATE event_occurrences eo
       SET
         registered_count = COALESCE(counts.registered_count, 0),
         attended_count = COALESCE(counts.attended_count, 0),
         updated_at = CURRENT_TIMESTAMP
       FROM (
         SELECT
           er.occurrence_id,
           COUNT(*) FILTER (WHERE er.registration_status IN ('registered', 'confirmed'))::int AS registered_count,
           COUNT(*) FILTER (WHERE er.checked_in = true)::int AS attended_count
         FROM event_registrations er
         WHERE er.occurrence_id = $1
         GROUP BY er.occurrence_id
       ) counts
       WHERE eo.id = $1`,
      [occurrenceId]
    );

    await queryable.query(
      `UPDATE event_occurrences
       SET
         registered_count = 0,
         attended_count = 0,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND NOT EXISTS (
           SELECT 1 FROM event_registrations er WHERE er.occurrence_id = $1
         )`,
      [occurrenceId]
    );
  }

  async recalculateEventCounts(eventId: string, queryable: Queryable = this.pool): Promise<void> {
    await queryable.query(
      `UPDATE events e
       SET
         registered_count = COALESCE(counts.registered_count, 0),
         attended_count = COALESCE(counts.attended_count, 0),
         updated_at = CURRENT_TIMESTAMP
       FROM (
         SELECT
           eo.event_id,
           COALESCE(SUM(eo.registered_count), 0)::int AS registered_count,
           COALESCE(SUM(eo.attended_count), 0)::int AS attended_count
         FROM event_occurrences eo
         WHERE eo.event_id = $1
         GROUP BY eo.event_id
       ) counts
       WHERE e.id = $1`,
      [eventId]
    );

    await queryable.query(
      `UPDATE events
       SET
         registered_count = 0,
         attended_count = 0,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND NOT EXISTS (
           SELECT 1 FROM event_occurrences eo WHERE eo.event_id = $1
         )`,
      [eventId]
    );
  }

  async updateOccurrence(
    occurrenceId: string,
    data: UpdateEventOccurrenceDTO,
    scope: EventMutationScope,
    userId: string,
    queryable: Queryable = this.pool
  ): Promise<EventOccurrence | null> {
    const target = await this.getOccurrenceById(occurrenceId, undefined, queryable);
    if (!target) {
      throw createEventHttpError('OCCURRENCE_NOT_FOUND', 404, 'Occurrence not found');
    }

    const occurrenceFieldMap: Record<keyof UpdateEventOccurrenceDTO, string> = {
      event_name: 'event_name',
      description: 'description',
      status: 'status',
      start_date: 'start_date',
      end_date: 'end_date',
      location_name: 'location_name',
      address_line1: 'address_line1',
      address_line2: 'address_line2',
      city: 'city',
      state_province: 'state_province',
      postal_code: 'postal_code',
      country: 'country',
      capacity: 'capacity',
      waitlist_enabled: 'waitlist_enabled',
      public_checkin_enabled: 'public_checkin_enabled',
    };

    const eventFieldMap: Partial<Record<keyof UpdateEventOccurrenceDTO, string>> = {
      event_name: 'name',
      description: 'description',
      status: 'status',
      start_date: 'start_date',
      end_date: 'end_date',
      location_name: 'location_name',
      address_line1: 'address_line1',
      address_line2: 'address_line2',
      city: 'city',
      state_province: 'state_province',
      postal_code: 'postal_code',
      country: 'country',
      capacity: 'capacity',
      waitlist_enabled: 'waitlist_enabled',
    };

    if (scope === 'occurrence') {
      const fields: string[] = [];
      const values: QueryValue[] = [];
      let paramCount = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${occurrenceFieldMap[key as keyof UpdateEventOccurrenceDTO]} = $${paramCount}`);
          values.push(value as QueryValue);
          paramCount += 1;
        }
      });

      if (fields.length === 0) {
        throw createEventHttpError('VALIDATION_ERROR', 400, 'No fields to update');
      }

      fields.push(`is_exception = true`);
      fields.push(`modified_by = $${paramCount++}`);
      values.push(userId);
      values.push(occurrenceId);

      await queryable.query(
        `UPDATE event_occurrences
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramCount}`,
        values
      );

      return this.getOccurrenceById(occurrenceId, undefined, queryable);
    }

    const eventFields: string[] = [];
    const eventValues: QueryValue[] = [];
    let eventParamCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      const mappedKey = eventFieldMap[key as keyof UpdateEventOccurrenceDTO];
      if (mappedKey && value !== undefined) {
        eventFields.push(`${mappedKey} = $${eventParamCount}`);
        eventValues.push(value as QueryValue);
        eventParamCount += 1;
      }
    });

    if (eventFields.length > 0) {
      eventFields.push(`modified_by = $${eventParamCount++}`);
      eventValues.push(userId);
      eventValues.push(target.event_id);
      await queryable.query(
        `UPDATE events
         SET ${eventFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${eventParamCount}`,
        eventValues
      );
    }

    const occurrenceFields: string[] = [];
    const occurrenceValues: QueryValue[] = [];
    let occurrenceParamCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        occurrenceFields.push(`${occurrenceFieldMap[key as keyof UpdateEventOccurrenceDTO]} = $${occurrenceParamCount}`);
        occurrenceValues.push(value as QueryValue);
        occurrenceParamCount += 1;
      }
    });

    if (occurrenceFields.length > 0) {
      occurrenceFields.push(`modified_by = $${occurrenceParamCount++}`);
      occurrenceValues.push(userId);
      occurrenceValues.push(target.event_id);

      const whereParts = ['event_id = $' + occurrenceParamCount];
      if (scope === 'future_occurrences') {
        whereParts.push(`scheduled_start_date >= $${occurrenceParamCount + 1}`);
        occurrenceValues.push(target.scheduled_start_date);
      }

      await queryable.query(
        `UPDATE event_occurrences
         SET ${occurrenceFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE ${whereParts.join(' AND ')}`,
        occurrenceValues
      );
    }

    await this.syncOccurrencesForEvent(target.event_id, queryable);
    return this.getOccurrenceById(occurrenceId, undefined, queryable);
  }
}
