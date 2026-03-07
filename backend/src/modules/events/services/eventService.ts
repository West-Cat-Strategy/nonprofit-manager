/**
 * Event Service
 * Business logic for event management and registrations
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import pool from '@config/database';
import { logger } from '@config/logger';
import { PASSWORD } from '@config/constants';
import {
  Event,
  EventCheckInSettings,
  EventStatus,
  EventType,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  CreateEventDTO,
  PublicEventCheckInDTO,
  PublicEventCheckInInfo,
  PublicEventCheckInResult,
  PublicEventDetail,
  PublicEventListItem,
  PublicEventRegistrationDTO,
  PublicEventRegistrationResult,
  PublicEventsListData,
  PublicEventsQuery,
  RegistrationStatus,
  RotateEventCheckInPinResult,
  UpdateEventCheckInSettingsDTO,
  UpdateEventDTO,
  EventFilters,
  PaginationParams,
  PaginatedEvents,
  EventRegistration,
  CreateRegistrationDTO,
  UpdateRegistrationDTO,
  RegistrationFilters,
  CheckInResult,
  CheckInOptions,
  SendEventRemindersDTO,
  SendEventRemindersContext,
  EventReminderSummary,
  ReminderChannelSummary,
} from '@app-types/event';
import { resolveSort } from '@utils/queryHelpers';
import type { DataScopeFilter } from '@app-types/dataScope';
import { sendMail } from '@services/emailService';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendSms } from '@services/twilioSmsService';
import { getTwilioSettings } from '@services/twilioSettingsService';
import { cancelPendingAutomationsForEvent } from '@services/eventReminderAutomationService';

type QueryValue = string | number | boolean | Date | null | string[];

interface EventReminderEventRow {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  location_name: string | null;
}

interface EventReminderRecipientRow {
  registration_id: string;
  contact_name: string;
  contact_email: string | null;
  mobile_phone: string | null;
  phone: string | null;
  do_not_email: boolean;
  do_not_text: boolean;
}

interface EventCheckInWindowEventRow {
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

const EVENT_CHECKIN_WINDOW_BEFORE_MINUTES = parsePositiveMinutes(
  process.env.EVENT_CHECKIN_WINDOW_BEFORE_MINUTES,
  180
);
const EVENT_CHECKIN_WINDOW_AFTER_MINUTES = parsePositiveMinutes(
  process.env.EVENT_CHECKIN_WINDOW_AFTER_MINUTES,
  240
);

const normalizePhone = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

const slugifyPublicEvent = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const buildCheckInWindowMessage = (windowBefore: number, windowAfter: number): string =>
  `Check-in is available ${windowBefore} minutes before start until ${windowAfter} minutes after end`;

const createChannelSummary = (
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

const formatReminderDate = (date: Date): string =>
  new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export class EventService {
  constructor(private pool: Pool) {}

  private getCheckInWindowBounds(event: EventCheckInWindowEventRow): {
    openAt: Date;
    closeAt: Date;
  } {
    const openAt = new Date(event.start_date);
    openAt.setMinutes(openAt.getMinutes() - EVENT_CHECKIN_WINDOW_BEFORE_MINUTES);

    const closeAt = new Date(event.end_date);
    closeAt.setMinutes(closeAt.getMinutes() + EVENT_CHECKIN_WINDOW_AFTER_MINUTES);

    return { openAt, closeAt };
  }

  private assertCheckInAllowed(
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
        `${buildCheckInWindowMessage(EVENT_CHECKIN_WINDOW_BEFORE_MINUTES, EVENT_CHECKIN_WINDOW_AFTER_MINUTES)}.`
      );
    }
  }

  private async resolveContactIdByIdentity(
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

  private async createWalkInContact(
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

  /**
   * Get all events with filtering and pagination
   */
  async getEvents(
    filters: EventFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedEvents> {
    const { search, event_type, status, is_public, start_date, end_date } = filters;

    const { page = 1, limit = 20, sort_by, sort_order } = pagination;

    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: QueryValue[] = [];
    let paramCount = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (event_type) {
      conditions.push(`event_type = $${paramCount}`);
      params.push(event_type);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (typeof is_public === 'boolean') {
      conditions.push(`is_public = $${paramCount}`);
      params.push(is_public);
      paramCount++;
    }

    if (start_date) {
      conditions.push(`start_date >= $${paramCount}`);
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      conditions.push(`end_date <= $${paramCount}`);
      params.push(end_date);
      paramCount++;
    }

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`created_by = ANY($${paramCount}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM events ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
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

  /**
   * Get event by ID
   */
  async getEventById(eventId: string, scope?: DataScopeFilter): Promise<Event | null> {
    const query = `
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
    const paramCount = 2;
    const conditions: string[] = [];

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`created_by = ANY($${paramCount}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const finalQuery =
      conditions.length > 0 ? `${query} AND ${conditions.join(' AND ')}` : query;
    const result = await this.pool.query(finalQuery, params);
    return result.rows[0] || null;
  }

  /**
   * Get event attendance summary for dashboard widgets
   */
  async getEventAttendanceSummary(
    referenceDate: Date = new Date(),
    scope?: DataScopeFilter
  ): Promise<{
    upcoming_events: number;
    total_this_month: number;
    avg_attendance: number;
  }> {
    const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const endOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);

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
        ? ` AND created_by = ANY($3::uuid[])`
        : '';

    const upcomingQueryScoped = `${upcomingQuery}${scopeCondition}`;
    const monthQueryScoped = `${monthSummaryQuery}${scopeCondition}`;

    const upcomingParams: QueryValue[] = [referenceDate];
    const monthParams: QueryValue[] = [startOfMonth, endOfMonth];

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      upcomingParams.push(scope.createdByUserIds);
      monthParams.push(scope.createdByUserIds);
    }

    const [upcomingResult, monthResult] = await Promise.all([
      this.pool.query(upcomingQueryScoped, upcomingParams),
      this.pool.query(monthQueryScoped, monthParams),
    ]);

    const upcoming_events = upcomingResult.rows[0]?.upcoming_events ?? 0;
    const total_this_month = monthResult.rows[0]?.total_this_month ?? 0;
    const avg_attendance = monthResult.rows[0]?.avg_attendance ?? 0;

    return {
      upcoming_events,
      total_this_month,
      avg_attendance,
    };
  }

  /**
   * Create new event
   */
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

    const query = `
      INSERT INTO events (
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
        modified_by
    `;

    const result = await this.pool.query(query, [
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
    ]);

    return result.rows[0];
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, eventData: UpdateEventDTO, userId: string): Promise<Event> {
    const normalizedData: UpdateEventDTO = { ...eventData };

    const fields: string[] = [];
    const values: QueryValue[] = [];
    let paramCount = 1;

    Object.entries(normalizedData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database
        const dbKey = key === 'event_name' ? 'name' : key;
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (normalizedData.is_recurring === false) {
      fields.push(`recurrence_pattern = $${paramCount}`);
      values.push(null);
      paramCount++;
      fields.push(`recurrence_interval = $${paramCount}`);
      values.push(null);
      paramCount++;
      fields.push(`recurrence_end_date = $${paramCount}`);
      values.push(null);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`modified_by = $${paramCount}`);
    values.push(userId);
    paramCount++;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(eventId);

    const query = `
      UPDATE events
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
        modified_by
    `;

    const result = await this.pool.query(query, values);
    const updated = result.rows[0] as Event | undefined;
    if (!updated) {
      throw new Error('Event not found');
    }

    if (updated.status === 'cancelled' || updated.status === 'completed') {
      await cancelPendingAutomationsForEvent(
        eventId,
        `event_status_${updated.status}`,
        userId
      );
    } else if (new Date(updated.start_date).getTime() <= Date.now()) {
      await cancelPendingAutomationsForEvent(eventId, 'event_start_passed', userId);
    }

    return updated;
  }

  /**
   * Delete event (soft delete by setting status to cancelled)
   */
  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const query = `
      UPDATE events
      SET status = 'cancelled', modified_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(query, [userId, eventId]);
    await cancelPendingAutomationsForEvent(eventId, 'event_deleted', userId);
  }

  // ==================== EVENT REGISTRATIONS ====================

  /**
   * Get registrations for an event
   */
  async getEventRegistrations(
    eventId: string,
    filters: RegistrationFilters = {}
  ): Promise<EventRegistration[]> {
    const conditions: string[] = ['er.event_id = $1'];
    const params: QueryValue[] = [eventId];
    let paramCount = 2;

    if (filters.registration_status) {
      conditions.push(`er.registration_status = $${paramCount}`);
      params.push(filters.registration_status);
      paramCount++;
    }

    if (filters.checked_in !== undefined) {
      conditions.push(`er.checked_in = $${paramCount}`);
      params.push(filters.checked_in);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT 
        er.id as registration_id,
        er.event_id,
        er.contact_id,
        er.registration_status,
        er.checked_in,
        er.check_in_time,
        er.checked_in_by,
        er.check_in_method,
        er.check_in_token,
        er.notes,
        er.created_at,
        er.updated_at,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        e.name as event_name
      FROM event_registrations er
      JOIN contacts c ON er.contact_id = c.id
      JOIN events e ON er.event_id = e.id
      WHERE ${whereClause}
      ORDER BY er.created_at DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get registrations for a contact
   */
  async getContactRegistrations(contactId: string, scope?: DataScopeFilter): Promise<EventRegistration[]> {
    const conditions: string[] = ['er.contact_id = $1'];
    const params: QueryValue[] = [contactId];

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`e.created_by = ANY($${params.length + 1}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT 
        er.id as registration_id,
        er.event_id,
        er.contact_id,
        er.registration_status,
        er.checked_in,
        er.check_in_time,
        er.checked_in_by,
        er.check_in_method,
        er.check_in_token,
        er.notes,
        er.created_at,
        er.updated_at,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        e.name as event_name
      FROM event_registrations er
      JOIN contacts c ON er.contact_id = c.id
      JOIN events e ON er.event_id = e.id
      WHERE ${whereClause}
      ORDER BY e.start_date DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get a registration by ID.
   */
  async getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    const query = `
      SELECT
        er.id as registration_id,
        er.event_id,
        er.contact_id,
        er.registration_status,
        er.checked_in,
        er.check_in_time,
        er.checked_in_by,
        er.check_in_method,
        er.check_in_token,
        er.notes,
        er.created_at,
        er.updated_at,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        e.name as event_name
      FROM event_registrations er
      JOIN contacts c ON er.contact_id = c.id
      JOIN events e ON er.event_id = e.id
      WHERE er.id = $1
      LIMIT 1
    `;

    const result = await this.pool.query(query, [registrationId]);
    return result.rows[0] ?? null;
  }

  /**
   * Get a registration by event + check-in token.
   */
  async getRegistrationByToken(eventId: string, token: string): Promise<EventRegistration | null> {
    const query = `
      SELECT
        er.id as registration_id,
        er.event_id,
        er.contact_id,
        er.registration_status,
        er.checked_in,
        er.check_in_time,
        er.checked_in_by,
        er.check_in_method,
        er.check_in_token,
        er.notes,
        er.created_at,
        er.updated_at,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        e.name as event_name
      FROM event_registrations er
      JOIN contacts c ON er.contact_id = c.id
      JOIN events e ON er.event_id = e.id
      WHERE er.event_id = $1
        AND er.check_in_token = $2
      LIMIT 1
    `;

    const result = await this.pool.query(query, [eventId, token]);
    return result.rows[0] ?? null;
  }

  async getRegistrationByTokenGlobal(
    token: string,
    scope?: DataScopeFilter
  ): Promise<EventRegistration | null> {
    const params: QueryValue[] = [token];
    const conditions: string[] = ['er.check_in_token = $1'];

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`e.created_by = ANY($${params.length + 1}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT
        er.id as registration_id,
        er.event_id,
        er.contact_id,
        er.registration_status,
        er.checked_in,
        er.check_in_time,
        er.checked_in_by,
        er.check_in_method,
        er.check_in_token,
        er.notes,
        er.created_at,
        er.updated_at,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        e.name as event_name
      FROM event_registrations er
      JOIN contacts c ON er.contact_id = c.id
      JOIN events e ON er.event_id = e.id
      WHERE ${whereClause}
      LIMIT 1
    `;

    const result = await this.pool.query(query, params);
    return result.rows[0] ?? null;
  }

  /**
   * Register contact for event
   */
  async registerContact(registrationData: CreateRegistrationDTO): Promise<EventRegistration> {
    const { event_id, contact_id, registration_status = 'registered', notes } = registrationData;
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const eventResult = await client.query<{
        id: string;
        capacity: number | null;
        registered_count: number;
      }>(
        `SELECT id, capacity, registered_count
         FROM events
         WHERE id = $1
         FOR UPDATE`,
        [event_id]
      );

      const event = eventResult.rows[0];
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.capacity && event.registered_count >= event.capacity) {
        throw new Error('Event is at full capacity');
      }

      const existingResult = await client.query(
        `SELECT id
         FROM event_registrations
         WHERE event_id = $1 AND contact_id = $2
         FOR UPDATE`,
        [event_id, contact_id]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Contact is already registered for this event');
      }

      const result = await client.query(
        `INSERT INTO event_registrations (event_id, contact_id, registration_status, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING
           id as registration_id,
           event_id,
           contact_id,
           registration_status,
           checked_in,
           check_in_time,
           checked_in_by,
           check_in_method,
           check_in_token,
           notes,
           created_at,
           updated_at`,
        [event_id, contact_id, registration_status, notes || null]
      );

      await client.query(
        `UPDATE events
         SET registered_count = registered_count + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [event_id]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update registration
   */
  async updateRegistration(
    registrationId: string,
    updateData: UpdateRegistrationDTO
  ): Promise<EventRegistration> {
    const fields: string[] = [];
    const values: QueryValue[] = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(registrationId);

    const query = `
      UPDATE event_registrations
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING
        id as registration_id,
        event_id,
        contact_id,
        registration_status,
        checked_in,
        check_in_time,
        checked_in_by,
        check_in_method,
        check_in_token,
        notes,
        created_at,
        updated_at
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Check in attendee
   */
  async checkInAttendee(
    registrationId: string,
    options: CheckInOptions = {}
  ): Promise<CheckInResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const registrationResult = await client.query<{
        event_id: string;
        checked_in: boolean;
      }>(
        `SELECT event_id, checked_in
         FROM event_registrations
         WHERE id = $1
         FOR UPDATE`,
        [registrationId]
      );

      const registrationRow = registrationResult.rows[0];
      if (!registrationRow) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Registration not found',
        };
      }

      if (registrationRow.checked_in) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Already checked in',
        };
      }

      const eventResult = await client.query<EventCheckInWindowEventRow>(
        `SELECT
           id,
           start_date,
           end_date,
           status,
           capacity,
           registered_count
         FROM events
         WHERE id = $1
         FOR UPDATE`,
        [registrationRow.event_id]
      );
      const eventRow = eventResult.rows[0];
      if (!eventRow) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Event not found',
        };
      }

      try {
        this.assertCheckInAllowed(eventRow);
      } catch (error) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Check-in is currently unavailable',
        };
      }

      const method = options.method || 'manual';
      const checkedInBy = options.checkedInBy ?? null;

      const result = await client.query(
        `UPDATE event_registrations
         SET checked_in = true,
             check_in_time = CURRENT_TIMESTAMP,
             checked_in_by = $2,
             check_in_method = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING
           id as registration_id,
           event_id,
           contact_id,
           registration_status,
           checked_in,
           check_in_time,
           checked_in_by,
           check_in_method,
           check_in_token,
           notes,
           created_at,
           updated_at`,
        [registrationId, checkedInBy, method]
      );

      await client.query(
        `UPDATE events
         SET attended_count = attended_count + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [registrationRow.event_id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Successfully checked in',
        registration: result.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(registrationId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query<{
        event_id: string;
        checked_in: boolean;
      }>(
        `SELECT event_id, checked_in
         FROM event_registrations
         WHERE id = $1
         FOR UPDATE`,
        [registrationId]
      );

      const registration = result.rows[0];
      if (!registration) {
        throw new Error('Registration not found');
      }

      await client.query(
        `SELECT id
         FROM events
         WHERE id = $1
         FOR UPDATE`,
        [registration.event_id]
      );

      await client.query('DELETE FROM event_registrations WHERE id = $1', [registrationId]);

      await client.query(
        `UPDATE events
         SET registered_count = GREATEST(registered_count - 1, 0),
             attended_count = CASE
               WHEN $2::boolean THEN GREATEST(attended_count - 1, 0)
               ELSE attended_count
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [registration.event_id, registration.checked_in]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEventCheckInSettings(eventId: string): Promise<EventCheckInSettings | null> {
    const result = await this.pool.query<EventCheckInSettings>(
      `SELECT
         id as event_id,
         public_checkin_enabled,
         (public_checkin_pin_hash IS NOT NULL) as public_checkin_pin_configured,
         public_checkin_pin_rotated_at
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    return result.rows[0] ?? null;
  }

  async updateEventCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null> {
    const result = await this.pool.query<EventCheckInSettings>(
      `UPDATE events
       SET
         public_checkin_enabled = $1,
         modified_by = $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING
         id as event_id,
         public_checkin_enabled,
         (public_checkin_pin_hash IS NOT NULL) as public_checkin_pin_configured,
         public_checkin_pin_rotated_at`,
      [data.public_checkin_enabled, userId, eventId]
    );

    return result.rows[0] ?? null;
  }

  async rotateEventCheckInPin(eventId: string, userId: string): Promise<RotateEventCheckInPinResult> {
    const pin = String(randomInt(100000, 1000000));
    const pinHash = await bcrypt.hash(pin, PASSWORD.BCRYPT_SALT_ROUNDS);

    const result = await this.pool.query<EventCheckInSettings>(
      `UPDATE events
       SET
         public_checkin_enabled = true,
         public_checkin_pin_hash = $1,
         public_checkin_pin_rotated_at = CURRENT_TIMESTAMP,
         modified_by = $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING
         id as event_id,
         public_checkin_enabled,
         (public_checkin_pin_hash IS NOT NULL) as public_checkin_pin_configured,
         public_checkin_pin_rotated_at`,
      [pinHash, userId, eventId]
    );

    const settings = result.rows[0];
    if (!settings) {
      throw new Error('Event not found');
    }

    return {
      ...settings,
      pin,
    };
  }

  async walkInCheckIn(
    eventId: string,
    data: EventWalkInCheckInDTO,
    checkedInBy: string
  ): Promise<EventWalkInCheckInResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const eventResult = await client.query<EventCheckInWindowEventRow>(
        `SELECT
           id,
           start_date,
           end_date,
           status,
           capacity,
           registered_count
         FROM events
         WHERE id = $1
         FOR UPDATE`,
        [eventId]
      );
      const eventRow = eventResult.rows[0];
      if (!eventRow) {
        throw new Error('Event not found');
      }

      this.assertCheckInAllowed(eventRow);

      let createdContact = false;
      let contactId = await this.resolveContactIdByIdentity(client, {
        email: data.email,
        phone: data.phone,
      });

      if (!contactId) {
        contactId = await this.createWalkInContact(client, {
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phone: data.phone,
          createdBy: checkedInBy,
        });
        createdContact = true;
      }

      const existingRegistrationResult = await client.query<EventRegistration>(
        `SELECT
           id as registration_id,
           event_id,
           contact_id,
           registration_status,
           checked_in,
           check_in_time,
           checked_in_by,
           check_in_method,
           check_in_token,
           notes,
           created_at,
           updated_at
         FROM event_registrations
         WHERE event_id = $1 AND contact_id = $2
         FOR UPDATE`,
        [eventId, contactId]
      );

      let createdRegistration = false;
      let registration: EventRegistration;

      if (existingRegistrationResult.rows.length === 0) {
        if (eventRow.capacity && eventRow.registered_count >= eventRow.capacity) {
          throw new Error('Event is at full capacity');
        }

        const createdRegistrationResult = await client.query<EventRegistration>(
          `INSERT INTO event_registrations (
             event_id,
             contact_id,
             registration_status,
             notes
           )
           VALUES ($1, $2, $3, $4)
           RETURNING
             id as registration_id,
             event_id,
             contact_id,
             registration_status,
             checked_in,
             check_in_time,
             checked_in_by,
             check_in_method,
             check_in_token,
             notes,
             created_at,
             updated_at`,
          [
            eventId,
            contactId,
            data.registration_status || RegistrationStatus.REGISTERED,
            data.notes?.trim() || null,
          ]
        );

        await client.query(
          `UPDATE events
           SET
             registered_count = registered_count + 1,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [eventId]
        );

        registration = createdRegistrationResult.rows[0];
        createdRegistration = true;
      } else {
        registration = existingRegistrationResult.rows[0];
      }

      if (registration.checked_in) {
        await client.query('COMMIT');
        return {
          status: 'already_checked_in',
          contact_id: contactId,
          registration,
          created_contact: createdContact,
          created_registration: createdRegistration,
        };
      }

      const checkedInResult = await client.query<EventRegistration>(
        `UPDATE event_registrations
         SET
           checked_in = true,
           check_in_time = CURRENT_TIMESTAMP,
           checked_in_by = $2,
           check_in_method = 'manual',
           registration_status = CASE
             WHEN registration_status IN ('cancelled', 'no_show') THEN 'registered'
             ELSE registration_status
           END,
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING
           id as registration_id,
           event_id,
           contact_id,
           registration_status,
           checked_in,
           check_in_time,
           checked_in_by,
           check_in_method,
           check_in_token,
           notes,
           created_at,
           updated_at`,
        [registration.registration_id, checkedInBy, data.notes?.trim() || null]
      );

      await client.query(
        `UPDATE events
         SET
           attended_count = attended_count + 1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [eventId]
      );

      await client.query('COMMIT');

      return {
        status: createdRegistration ? 'created_and_checked_in' : 'existing_checked_in',
        contact_id: contactId,
        registration: checkedInResult.rows[0],
        created_contact: createdContact,
        created_registration: createdRegistration,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPublicCheckInInfo(eventId: string): Promise<PublicEventCheckInInfo | null> {
    const result = await this.pool.query<{
      event_id: string;
      event_name: string;
      description: string | null;
      event_type: Event['event_type'];
      status: Event['status'];
      start_date: Date;
      end_date: Date;
      location_name: string | null;
      public_checkin_enabled: boolean;
      public_checkin_pin_required: boolean;
      is_public: boolean;
    }>(
      `SELECT
         id as event_id,
         name as event_name,
         description,
         event_type,
         status,
         start_date,
         end_date,
         location_name,
         public_checkin_enabled,
         (public_checkin_pin_hash IS NOT NULL) as public_checkin_pin_required,
         is_public
       FROM events
       WHERE id = $1`,
      [eventId]
    );
    const row = result.rows[0];
    if (!row) return null;
    if (!row.is_public || !row.public_checkin_enabled) return null;

    const checkinOpen =
      (() => {
        try {
          this.assertCheckInAllowed({
            id: row.event_id,
            start_date: row.start_date,
            end_date: row.end_date,
            status: row.status,
            capacity: null,
            registered_count: 0,
          });
          return true;
        } catch {
          return false;
        }
      })();

    return {
      event_id: row.event_id,
      event_name: row.event_name,
      description: row.description,
      event_type: row.event_type,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      location_name: row.location_name,
      public_checkin_enabled: row.public_checkin_enabled,
      public_checkin_pin_required: row.public_checkin_pin_required,
      checkin_open: checkinOpen,
      checkin_window_before_minutes: EVENT_CHECKIN_WINDOW_BEFORE_MINUTES,
      checkin_window_after_minutes: EVENT_CHECKIN_WINDOW_AFTER_MINUTES,
    };
  }

  async submitPublicCheckIn(
    eventId: string,
    data: PublicEventCheckInDTO
  ): Promise<PublicEventCheckInResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const eventResult = await client.query<
        EventCheckInWindowEventRow & {
          is_public: boolean;
          public_checkin_enabled: boolean;
          public_checkin_pin_hash: string | null;
        }
      >(
        `SELECT
           id,
           start_date,
           end_date,
           status,
           capacity,
           registered_count,
           is_public,
           public_checkin_enabled,
           public_checkin_pin_hash
         FROM events
         WHERE id = $1
         FOR UPDATE`,
        [eventId]
      );
      const eventRow = eventResult.rows[0];
      if (!eventRow) {
        throw new Error('Event not found');
      }
      if (!eventRow.is_public || !eventRow.public_checkin_enabled) {
        throw new Error('Public check-in is not enabled for this event');
      }
      if (!eventRow.public_checkin_pin_hash) {
        throw new Error('Event check-in PIN is not configured');
      }

      const pinMatch = await bcrypt.compare(data.pin.trim(), eventRow.public_checkin_pin_hash);
      if (!pinMatch) {
        throw new Error('Invalid event check-in PIN');
      }

      this.assertCheckInAllowed(eventRow);

      let createdContact = false;
      let contactId = await this.resolveContactIdByIdentity(client, {
        email: data.email,
        phone: data.phone,
      });

      if (!contactId) {
        contactId = await this.createWalkInContact(client, {
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phone: data.phone,
          createdBy: null,
        });
        createdContact = true;
      }

      const existingRegistrationResult = await client.query<EventRegistration>(
        `SELECT
           id as registration_id,
           event_id,
           contact_id,
           registration_status,
           checked_in,
           check_in_time,
           checked_in_by,
           check_in_method,
           check_in_token,
           notes,
           created_at,
           updated_at
         FROM event_registrations
         WHERE event_id = $1 AND contact_id = $2
         FOR UPDATE`,
        [eventId, contactId]
      );

      let createdRegistration = false;
      let registration: EventRegistration;

      if (existingRegistrationResult.rows.length === 0) {
        if (eventRow.capacity && eventRow.registered_count >= eventRow.capacity) {
          throw new Error('Event is at full capacity');
        }

        const createdRegistrationResult = await client.query<EventRegistration>(
          `INSERT INTO event_registrations (
             event_id,
             contact_id,
             registration_status
           )
           VALUES ($1, $2, $3)
           RETURNING
             id as registration_id,
             event_id,
             contact_id,
             registration_status,
             checked_in,
             check_in_time,
             checked_in_by,
             check_in_method,
             check_in_token,
             notes,
             created_at,
             updated_at`,
          [eventId, contactId, RegistrationStatus.REGISTERED]
        );

        await client.query(
          `UPDATE events
           SET
             registered_count = registered_count + 1,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [eventId]
        );

        registration = createdRegistrationResult.rows[0];
        createdRegistration = true;
      } else {
        registration = existingRegistrationResult.rows[0];
      }

      if (registration.checked_in) {
        await client.query('COMMIT');
        return {
          status: 'already_checked_in',
          contact_id: contactId,
          registration,
          created_contact: createdContact,
          created_registration: createdRegistration,
        };
      }

      const checkedInResult = await client.query<EventRegistration>(
        `UPDATE event_registrations
         SET
           checked_in = true,
           check_in_time = CURRENT_TIMESTAMP,
           checked_in_by = NULL,
           check_in_method = 'qr',
           registration_status = CASE
             WHEN registration_status IN ('cancelled', 'no_show') THEN 'registered'
             ELSE registration_status
           END,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING
           id as registration_id,
           event_id,
           contact_id,
           registration_status,
           checked_in,
           check_in_time,
           checked_in_by,
           check_in_method,
           check_in_token,
           notes,
           created_at,
           updated_at`,
        [registration.registration_id]
      );

      await client.query(
        `UPDATE events
         SET
           attended_count = attended_count + 1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [eventId]
      );

      await client.query('COMMIT');

      return {
        status: 'checked_in',
        contact_id: contactId,
        registration: checkedInResult.rows[0],
        created_contact: createdContact,
        created_registration: createdRegistration,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listPublicEventsByOwner(
    ownerUserId: string,
    query: PublicEventsQuery = {}
  ): Promise<PublicEventsListData> {
    const limit = query.limit ?? 12;
    const offset = query.offset ?? 0;
    const includePast = query.include_past ?? false;

    const where: string[] = [
      'created_by = $1',
      'is_public = true',
      "status IN ('planned', 'active', 'postponed')",
    ];
    const params: QueryValue[] = [ownerUserId];
    let paramCount = 2;

    if (!includePast) {
      where.push('end_date >= NOW()');
    }

    if (query.event_type) {
      where.push(`event_type = $${paramCount}`);
      params.push(query.event_type);
      paramCount += 1;
    }

    if (query.search) {
      where.push(`(
        name ILIKE $${paramCount}
        OR COALESCE(description, '') ILIKE $${paramCount}
        OR COALESCE(location_name, '') ILIKE $${paramCount}
        OR COALESCE(city, '') ILIKE $${paramCount}
        OR COALESCE(state_province, '') ILIKE $${paramCount}
      )`);
      params.push(`%${query.search}%`);
      paramCount += 1;
    }

    const sortColumnMap: Record<NonNullable<PublicEventsQuery['sort_by']>, string> = {
      start_date: 'start_date',
      name: 'name',
      created_at: 'created_at',
    };
    const resolvedSortBy =
      query.sort_by && Object.prototype.hasOwnProperty.call(sortColumnMap, query.sort_by)
        ? query.sort_by
        : 'start_date';
    const resolvedSortOrder = query.sort_order === 'desc' ? 'DESC' : 'ASC';
    const whereClause = `WHERE ${where.join(' AND ')}`;

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM events
       ${whereClause}`,
      params
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);

    const rowsResult = await this.pool.query<Omit<PublicEventListItem, 'slug'>>(
      `SELECT
         id as event_id,
         name as event_name,
         description,
         event_type,
         status,
         start_date,
         end_date,
         location_name,
         city,
         state_province,
         country,
         capacity,
         registered_count
       FROM events
       ${whereClause}
       ORDER BY ${sortColumnMap[resolvedSortBy]} ${resolvedSortOrder}
       LIMIT $${paramCount}
       OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return {
      items: rowsResult.rows.map((row) => ({
        ...row,
        slug: slugifyPublicEvent(row.event_name),
      })),
      page: {
        limit,
        offset,
        total,
        has_more: offset + rowsResult.rows.length < total,
      },
    };
  }

  async getPublicEventBySlug(
    ownerUserId: string,
    slug: string
  ): Promise<PublicEventDetail | null> {
    const normalizedSlug = slugifyPublicEvent(slug);
    const result = await this.pool.query<{
      event_id: string;
      event_name: string;
      description: string | null;
      event_type: EventType;
      status: EventStatus;
      start_date: Date;
      end_date: Date;
      location_name: string | null;
      city: string | null;
      state_province: string | null;
      country: string | null;
      address_line1: string | null;
      address_line2: string | null;
      postal_code: string | null;
      capacity: number | null;
      registered_count: number;
    }>(
      `SELECT
         id as event_id,
         name as event_name,
         description,
         event_type,
         status,
         start_date,
         end_date,
         location_name,
         city,
         state_province,
         country,
         address_line1,
         address_line2,
         postal_code,
         capacity,
         registered_count
       FROM events
       WHERE created_by = $1
         AND is_public = TRUE
         AND status != 'cancelled'
       ORDER BY start_date ASC`,
      [ownerUserId]
    );

    const match = result.rows.find((row) => slugifyPublicEvent(row.event_name) === normalizedSlug);
    if (!match) {
      return null;
    }

    const isRegistrationOpen =
      match.status !== EventStatus.CANCELLED &&
      match.status !== EventStatus.COMPLETED &&
      (!match.capacity || match.registered_count < match.capacity);

    return {
      ...match,
      slug: normalizedSlug,
      is_registration_open: isRegistrationOpen,
    };
  }

  async submitPublicRegistration(
    eventId: string,
    data: PublicEventRegistrationDTO
  ): Promise<PublicEventRegistrationResult> {
    const eventResult = await this.pool.query<{
      id: string;
      name: string;
      is_public: boolean;
      status: EventStatus;
      created_by: string | null;
    }>(
      `SELECT id, name, is_public, status, created_by
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    const event = eventResult.rows[0];
    if (!event || !event.is_public) {
      throw new Error('Event not found');
    }

    if (event.status === EventStatus.CANCELLED || event.status === EventStatus.COMPLETED) {
      throw new Error('Event registration is unavailable');
    }

    let contactId = await this.resolveContactIdByIdentity(this.pool, {
      email: data.email,
      phone: data.phone,
    });
    let createdContact = false;

    if (!contactId) {
      contactId = await this.createWalkInContact(this.pool, {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        createdBy: event.created_by,
      });
      createdContact = true;
    }

    try {
      const registration = await this.registerContact({
        event_id: eventId,
        contact_id: contactId,
        registration_status: data.registration_status,
        notes: data.notes,
      });

      return {
        status: 'registered',
        contact_id: contactId,
        registration: registration as EventRegistration,
        created_contact: createdContact,
        created_registration: true,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Contact is already registered for this event') {
        const existingResult = await this.pool.query<EventRegistration>(
          `SELECT
             id as registration_id,
             event_id,
             contact_id,
             registration_status,
             checked_in,
             check_in_time,
             checked_in_by,
             check_in_method,
             check_in_token,
             notes,
             created_at,
             updated_at
           FROM event_registrations
           WHERE event_id = $1 AND contact_id = $2`,
          [eventId, contactId]
        );

        if (existingResult.rows[0]) {
          return {
            status: 'already_registered',
            contact_id: contactId,
            registration: existingResult.rows[0],
            created_contact: createdContact,
            created_registration: false,
          };
        }
      }

      throw error;
    }
  }

  private async recordReminderDelivery(args: {
    eventId: string;
    registrationId: string;
    channel: 'email' | 'sms';
    recipient: string;
    status: 'sent' | 'failed' | 'skipped';
    errorMessage?: string;
    messagePreview: string;
    sentBy: string | null;
    triggerType: 'manual' | 'automated';
    automationId?: string | null;
  }): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO event_reminder_deliveries (
          event_id,
          registration_id,
          channel,
          recipient,
          delivery_status,
          error_message,
          message_preview,
          sent_by,
          trigger_type,
          automation_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          args.eventId,
          args.registrationId,
          args.channel,
          args.recipient,
          args.status,
          args.errorMessage || null,
          args.messagePreview.slice(0, 255),
          args.sentBy,
          args.triggerType,
          args.automationId || null,
        ]
      );
    } catch (error) {
      logger.warn('Failed to record event reminder delivery', {
        eventId: args.eventId,
        registrationId: args.registrationId,
        channel: args.channel,
        status: args.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send reminders to event registrants over email and/or SMS.
   */
  async sendEventReminders(
    eventId: string,
    reminderOptions: SendEventRemindersDTO,
    context: SendEventRemindersContext = {}
  ): Promise<EventReminderSummary> {
    const triggerType = context.triggerType ?? 'manual';
    const sentBy = context.sentBy ?? null;
    const automationId = context.automationId ?? null;
    const sendEmailChannel = reminderOptions.sendEmail ?? true;
    const sendSmsChannel = reminderOptions.sendSms ?? true;

    if (!sendEmailChannel && !sendSmsChannel) {
      throw new Error('At least one reminder channel must be enabled');
    }

    const eventResult = await this.pool.query<EventReminderEventRow>(
      `SELECT id, name, start_date, end_date, location_name
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      throw new Error('Event not found');
    }

    const event = eventResult.rows[0];
    const registrationsResult = await this.pool.query<EventReminderRecipientRow>(
      `SELECT
         er.id as registration_id,
         TRIM(CONCAT(c.first_name, ' ', c.last_name)) as contact_name,
         c.email as contact_email,
         c.mobile_phone,
         c.phone,
         COALESCE(c.do_not_email, false) as do_not_email,
         COALESCE(c.do_not_text, false) as do_not_text
       FROM event_registrations er
       JOIN contacts c ON c.id = er.contact_id
       WHERE er.event_id = $1
         AND er.registration_status IN ('registered', 'confirmed')
       ORDER BY er.created_at ASC`,
      [eventId]
    );

    const recipients = registrationsResult.rows;

    const [emailSettings, twilioSettings] = await Promise.all([
      sendEmailChannel ? getEmailSettings() : Promise.resolve(null),
      sendSmsChannel ? getTwilioSettings() : Promise.resolve(null),
    ]);

    const emailEnabled = Boolean(sendEmailChannel && emailSettings?.isConfigured);
    const smsEnabled = Boolean(sendSmsChannel && twilioSettings?.isConfigured);

    const warnings: string[] = [];
    if (sendEmailChannel && !emailEnabled) {
      warnings.push('Email reminders were requested, but SMTP is not configured.');
    }
    if (sendSmsChannel && !smsEnabled) {
      warnings.push('SMS reminders were requested, but Twilio is not configured.');
    }

    const emailSummary = createChannelSummary(sendEmailChannel, emailEnabled);
    const smsSummary = createChannelSummary(sendSmsChannel, smsEnabled);

    const dateLabel = formatReminderDate(event.start_date);
    const locationLabel = event.location_name ? ` at ${event.location_name}` : '';
    const customMessage = reminderOptions.customMessage?.trim();

    const baseMessage = `Reminder: ${event.name} starts ${dateLabel}${locationLabel}.`;
    const emailSubject = `Reminder: ${event.name} on ${new Date(event.start_date).toLocaleDateString('en-US')}`;
    const smsMessageRaw = customMessage ? `${baseMessage} ${customMessage}` : baseMessage;
    const smsMessage =
      smsMessageRaw.length > 320 ? `${smsMessageRaw.slice(0, 317)}...` : smsMessageRaw;

    const eligibleRegistrations = recipients.filter((recipient) => {
      const emailEligible =
        sendEmailChannel &&
        emailEnabled &&
        !recipient.do_not_email &&
        Boolean(recipient.contact_email);
      const smsEligible =
        sendSmsChannel &&
        smsEnabled &&
        !recipient.do_not_text &&
        Boolean(recipient.mobile_phone || recipient.phone);
      return emailEligible || smsEligible;
    }).length;

    for (const recipient of recipients) {
      const fallbackRecipient =
        recipient.contact_email ||
        recipient.mobile_phone ||
        recipient.phone ||
        recipient.contact_name ||
        'unknown';

      if (sendEmailChannel) {
        emailSummary.attempted++;
        const recipientEmail = recipient.contact_email?.trim() || '';

        if (!emailEnabled) {
          emailSummary.skipped++;
          await this.recordReminderDelivery({
            eventId,
            registrationId: recipient.registration_id,
            channel: 'email',
            recipient: recipientEmail || fallbackRecipient,
            status: 'skipped',
            errorMessage: 'SMTP not configured',
            messagePreview: baseMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else if (!recipientEmail) {
          emailSummary.skipped++;
          await this.recordReminderDelivery({
            eventId,
            registrationId: recipient.registration_id,
            channel: 'email',
            recipient: fallbackRecipient,
            status: 'skipped',
            errorMessage: 'Missing email address',
            messagePreview: baseMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else if (recipient.do_not_email) {
          emailSummary.skipped++;
          await this.recordReminderDelivery({
            eventId,
            registrationId: recipient.registration_id,
            channel: 'email',
            recipient: recipientEmail,
            status: 'skipped',
            errorMessage: 'Contact opted out of email',
            messagePreview: baseMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else {
          const greetingName = recipient.contact_name || 'there';
          const emailText = [
            `Hi ${greetingName},`,
            '',
            baseMessage,
            customMessage ? customMessage : '',
            '',
            'We look forward to seeing you.',
          ]
            .filter(Boolean)
            .join('\n');
          const emailHtml = `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#0f172a">Event Reminder</h2>
              <p>Hi ${greetingName},</p>
              <p>${baseMessage}</p>
              ${customMessage ? `<p>${customMessage}</p>` : ''}
              <p>We look forward to seeing you.</p>
            </div>
          `;

          const emailSent = await sendMail({
            to: recipientEmail,
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
          });

          if (emailSent) {
            emailSummary.sent++;
          } else {
            emailSummary.failed++;
          }

          await this.recordReminderDelivery({
            eventId,
            registrationId: recipient.registration_id,
            channel: 'email',
            recipient: recipientEmail,
            status: emailSent ? 'sent' : 'failed',
            errorMessage: emailSent ? undefined : 'Email send failed',
            messagePreview: baseMessage,
            sentBy,
            triggerType,
            automationId,
          });
        }
      }

      if (sendSmsChannel) {
        smsSummary.attempted++;
        const phone = recipient.mobile_phone || recipient.phone || '';

        if (!smsEnabled) {
          smsSummary.skipped++;
          await this.recordReminderDelivery({
            eventId,
            registrationId: recipient.registration_id,
            channel: 'sms',
            recipient: phone || fallbackRecipient,
            status: 'skipped',
            errorMessage: 'Twilio not configured',
            messagePreview: smsMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else if (!phone) {
          smsSummary.skipped++;
          await this.recordReminderDelivery({
            eventId,
            registrationId: recipient.registration_id,
            channel: 'sms',
            recipient: fallbackRecipient,
            status: 'skipped',
            errorMessage: 'Missing phone number',
            messagePreview: smsMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else if (recipient.do_not_text) {
          smsSummary.skipped++;
          await this.recordReminderDelivery({
            eventId,
            registrationId: recipient.registration_id,
            channel: 'sms',
            recipient: phone,
            status: 'skipped',
            errorMessage: 'Contact opted out of text messaging',
            messagePreview: smsMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else {
          const smsResult = await sendSms({
            to: phone,
            body: smsMessage,
          });

          if (smsResult.success) {
            smsSummary.sent++;
          } else {
            smsSummary.failed++;
          }

          await this.recordReminderDelivery({
            eventId,
            registrationId: recipient.registration_id,
            channel: 'sms',
            recipient: smsResult.normalizedTo || phone,
            status: smsResult.success ? 'sent' : 'failed',
            errorMessage: smsResult.success ? undefined : smsResult.error,
            messagePreview: smsMessage,
            sentBy,
            triggerType,
            automationId,
          });
        }
      }
    }

    return {
      eventId,
      eventName: event.name,
      eventStartDate: event.start_date,
      totalRegistrations: recipients.length,
      eligibleRegistrations,
      email: emailSummary,
      sms: smsSummary,
      warnings,
    };
  }
}

export default new EventService(pool);
