import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { Pool } from 'pg';
import {
  CheckInOptions,
  CheckInResult,
  CreateRegistrationDTO,
  EventCheckInSettings,
  EventRegistration,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  RegistrationFilters,
  RegistrationStatus,
  RotateEventCheckInPinResult,
  UpdateEventCheckInSettingsDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { PASSWORD } from '@config/constants';
import { activityEventService } from '@services/activityEventService';
import {
  EventCheckInWindowEventRow,
  EventParticipantSupport,
  QueryValue,
} from './shared';

export class EventRegistrationService {
  private readonly support: EventParticipantSupport;

  constructor(
    private readonly pool: Pool,
    support: EventParticipantSupport = new EventParticipantSupport(pool)
  ) {
    this.support = support;
  }

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
      paramCount += 1;
    }

    if (filters.checked_in !== undefined) {
      conditions.push(`er.checked_in = $${paramCount}`);
      params.push(filters.checked_in);
    }

    const result = await this.pool.query(
      `SELECT
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
       WHERE ${conditions.join(' AND ')}
       ORDER BY er.created_at DESC`,
      params
    );

    return result.rows;
  }

  async getContactRegistrations(
    contactId: string,
    scope?: DataScopeFilter
  ): Promise<EventRegistration[]> {
    const conditions: string[] = ['er.contact_id = $1'];
    const params: QueryValue[] = [contactId];

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`e.created_by = ANY($${params.length + 1}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const result = await this.pool.query(
      `SELECT
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
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.start_date DESC`,
      params
    );

    return result.rows;
  }

  async getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    const result = await this.pool.query(
      `SELECT
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
       LIMIT 1`,
      [registrationId]
    );

    return result.rows[0] ?? null;
  }

  async getRegistrationByToken(eventId: string, token: string): Promise<EventRegistration | null> {
    const result = await this.pool.query(
      `SELECT
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
       LIMIT 1`,
      [eventId, token]
    );

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

    const result = await this.pool.query(
      `SELECT
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
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      params
    );

    return result.rows[0] ?? null;
  }

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

      await activityEventService.recordEvent(
        {
          type: 'event_registration',
          title: 'Event registration',
          description: 'A contact registered for an event',
          userName: contact_id,
          entityType: 'event',
          entityId: event_id,
          relatedEntityType: 'contact',
          relatedEntityId: contact_id,
          metadata: {
            registrationId: result.rows[0].registration_id,
            registrationStatus: registration_status,
          },
        },
        client
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
        paramCount += 1;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(registrationId);

    const result = await this.pool.query(
      `UPDATE event_registrations
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
         updated_at`,
      values
    );

    return result.rows[0];
  }

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
        return { success: false, message: 'Registration not found' };
      }

      if (registrationRow.checked_in) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Already checked in' };
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
        return { success: false, message: 'Event not found' };
      }

      try {
        this.support.assertCheckInAllowed(eventRow);
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

      await activityEventService.recordEvent(
        {
          type: 'event_check_in',
          title: 'Event attendee checked in',
          description: 'An attendee was checked in to an event',
          userId: checkedInBy,
          entityType: 'event',
          entityId: registrationRow.event_id,
          relatedEntityType: 'contact',
          relatedEntityId: result.rows[0].contact_id,
          metadata: {
            registrationId,
            method,
          },
        },
        client
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

    return { ...settings, pin };
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

      this.support.assertCheckInAllowed(eventRow);

      let createdContact = false;
      let contactId = await this.support.resolveContactIdByIdentity(client, {
        email: data.email,
        phone: data.phone,
      });

      if (!contactId) {
        contactId = await this.support.createWalkInContact(client, {
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

        await activityEventService.recordEvent(
          {
            type: 'event_registration',
            title: 'Event registration',
            description: 'A walk-in attendee was registered for an event',
            userId: checkedInBy,
            entityType: 'event',
            entityId: eventId,
            relatedEntityType: 'contact',
            relatedEntityId: contactId,
            metadata: {
              registrationId: createdRegistrationResult.rows[0].registration_id,
              walkIn: true,
            },
          },
          client
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
         SET attended_count = attended_count + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [eventId]
      );

      await activityEventService.recordEvent(
        {
          type: 'event_check_in',
          title: 'Event attendee checked in',
          description: 'A walk-in attendee was checked in to an event',
          userId: checkedInBy,
          entityType: 'event',
          entityId: eventId,
          relatedEntityType: 'contact',
          relatedEntityId: contactId,
          metadata: {
            registrationId: checkedInResult.rows[0].registration_id,
            walkIn: true,
            createdRegistration,
          },
        },
        client
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
}
