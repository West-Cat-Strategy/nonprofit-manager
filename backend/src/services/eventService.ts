/**
 * Event Service
 * Business logic for event management and registrations
 */

import { Pool } from 'pg';
import pool from '../config/database';
import {
  Event,
  CreateEventDTO,
  UpdateEventDTO,
  EventFilters,
  PaginationParams,
  PaginatedEvents,
  EventRegistration,
  CreateRegistrationDTO,
  UpdateRegistrationDTO,
  RegistrationFilters,
  CheckInResult,
} from '../types/event';

type QueryValue = string | number | boolean | Date | null;

export class EventService {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Get all events with filtering and pagination
   */
  async getEvents(
    filters: EventFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedEvents> {
    const { search, event_type, status, start_date, end_date } = filters;

    const { page = 1, limit = 20, sort_by = 'start_date', sort_order = 'desc' } = pagination;

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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM events ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT 
        id as event_id,
        name as event_name,
        description,
        event_type,
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
        registered_count,
        attended_count,
        created_at,
        updated_at,
        created_by,
        modified_by
      FROM events
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
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
  async getEventById(eventId: string): Promise<Event | null> {
    const query = `
      SELECT 
        id as event_id,
        name as event_name,
        description,
        event_type,
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
        registered_count,
        attended_count,
        created_at,
        updated_at,
        created_by,
        modified_by
      FROM events
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [eventId]);
    return result.rows[0] || null;
  }

  /**
   * Get event attendance summary for dashboard widgets
   */
  async getEventAttendanceSummary(referenceDate: Date = new Date()): Promise<{
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

    const [upcomingResult, monthResult] = await Promise.all([
      this.pool.query(upcomingQuery, [referenceDate]),
      this.pool.query(monthSummaryQuery, [startOfMonth, endOfMonth]),
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

    const query = `
      INSERT INTO events (
        name, description, event_type, status, start_date, end_date,
        location_name, address_line1, address_line2, city, state_province,
        postal_code, country, capacity, created_by, modified_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
      RETURNING 
        id as event_id,
        name as event_name,
        description,
        event_type,
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
    const fields: string[] = [];
    const values: QueryValue[] = [];
    let paramCount = 1;

    Object.entries(eventData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database
        const dbKey = key === 'event_name' ? 'name' : key;
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

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
    return result.rows[0];
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
      paramCount++;
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
  async getContactRegistrations(contactId: string): Promise<EventRegistration[]> {
    const query = `
      SELECT 
        er.id as registration_id,
        er.event_id,
        er.contact_id,
        er.registration_status,
        er.checked_in,
        er.check_in_time,
        er.notes,
        er.created_at,
        er.updated_at,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        e.name as event_name
      FROM event_registrations er
      JOIN contacts c ON er.contact_id = c.id
      JOIN events e ON er.event_id = e.id
      WHERE er.contact_id = $1
      ORDER BY e.start_date DESC
    `;

    const result = await this.pool.query(query, [contactId]);
    return result.rows;
  }

  /**
   * Register contact for event
   */
  async registerContact(registrationData: CreateRegistrationDTO): Promise<EventRegistration> {
    const { event_id, contact_id, registration_status = 'registered', notes } = registrationData;

    // Check if event has capacity
    const event = await this.getEventById(event_id);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.capacity && event.registered_count >= event.capacity) {
      throw new Error('Event is at full capacity');
    }

    // Check if contact is already registered
    const existingQuery = `
      SELECT id FROM event_registrations
      WHERE event_id = $1 AND contact_id = $2
    `;
    const existingResult = await this.pool.query(existingQuery, [event_id, contact_id]);

    if (existingResult.rows.length > 0) {
      throw new Error('Contact is already registered for this event');
    }

    // Create registration
    const insertQuery = `
      INSERT INTO event_registrations (event_id, contact_id, registration_status, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING 
        id as registration_id,
        event_id,
        contact_id,
        registration_status,
        checked_in,
        check_in_time,
        notes,
        created_at,
        updated_at
    `;

    const result = await this.pool.query(insertQuery, [
      event_id,
      contact_id,
      registration_status,
      notes || null,
    ]);

    // Update event registered count
    await this.pool.query(
      'UPDATE events SET registered_count = registered_count + 1 WHERE id = $1',
      [event_id]
    );

    return result.rows[0];
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
  async checkInAttendee(registrationId: string): Promise<CheckInResult> {
    try {
      const getQuery = `
        SELECT event_id, checked_in 
        FROM event_registrations 
        WHERE id = $1
      `;
      const registration = await this.pool.query(getQuery, [registrationId]);

      if (registration.rows.length === 0) {
        return {
          success: false,
          message: 'Registration not found',
        };
      }

      if (registration.rows[0].checked_in) {
        return {
          success: false,
          message: 'Already checked in',
        };
      }

      const updateQuery = `
        UPDATE event_registrations
        SET checked_in = true, check_in_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING 
          id as registration_id,
          event_id,
          contact_id,
          registration_status,
          checked_in,
          check_in_time,
          notes,
          created_at,
          updated_at
      `;

      const result = await this.pool.query(updateQuery, [registrationId]);

      // Update event attended count
      await this.pool.query('UPDATE events SET attended_count = attended_count + 1 WHERE id = $1', [
        registration.rows[0].event_id,
      ]);

      return {
        success: true,
        message: 'Successfully checked in',
        registration: result.rows[0],
      };
    } catch (error) {
      return {
        success: false,
        message: 'Check-in failed',
      };
    }
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(registrationId: string): Promise<void> {
    const getQuery = `
      SELECT event_id FROM event_registrations WHERE id = $1
    `;
    const result = await this.pool.query(getQuery, [registrationId]);

    if (result.rows.length === 0) {
      throw new Error('Registration not found');
    }

    const eventId = result.rows[0].event_id;

    const deleteQuery = `
      DELETE FROM event_registrations WHERE id = $1
    `;
    await this.pool.query(deleteQuery, [registrationId]);

    // Update event registered count
    await this.pool.query(
      'UPDATE events SET registered_count = GREATEST(registered_count - 1, 0) WHERE id = $1',
      [eventId]
    );
  }
}

export default new EventService();
