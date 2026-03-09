import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import {
  Event,
  EventRegistration,
  EventStatus,
  EventType,
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
} from '@app-types/event';
import {
  EVENT_CHECKIN_WINDOW_AFTER_MINUTES,
  EVENT_CHECKIN_WINDOW_BEFORE_MINUTES,
  EventCheckInWindowEventRow,
  EventParticipantSupport,
  QueryValue,
  recordActivityEventSafely,
  slugifyPublicEvent,
} from './shared';
import { EventRegistrationService } from './eventRegistrationService';

export class EventPublicService {
  private readonly support: EventParticipantSupport;
  private readonly registrations: EventRegistrationService;

  constructor(
    private readonly pool: Pool,
    registrations: EventRegistrationService,
    support: EventParticipantSupport = new EventParticipantSupport(pool)
  ) {
    this.registrations = registrations;
    this.support = support;
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

  async getPublicEventBySlug(ownerUserId: string, slug: string): Promise<PublicEventDetail | null> {
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

    return {
      ...match,
      slug: normalizedSlug,
      is_registration_open:
        match.status !== EventStatus.CANCELLED &&
        match.status !== EventStatus.COMPLETED &&
        (!match.capacity || match.registered_count < match.capacity),
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

    let contactId = await this.support.resolveContactIdByIdentity(this.pool, {
      email: data.email,
      phone: data.phone,
    });
    let createdContact = false;

    if (!contactId) {
      contactId = await this.support.createWalkInContact(this.pool, {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        createdBy: event.created_by,
      });
      createdContact = true;
    }

    try {
      const registration = await this.registrations.registerContact({
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
      if (
        error instanceof Error &&
        error.message === 'Contact is already registered for this event'
      ) {
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
    if (!row || !row.is_public || !row.public_checkin_enabled) {
      return null;
    }

    const checkinOpen = (() => {
      try {
        this.support.assertCheckInAllowed({
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

        await recordActivityEventSafely(
          {
            type: 'event_registration',
            title: 'Event registration',
            description: 'A public attendee was registered for an event',
            entityType: 'event',
            entityId: eventId,
            relatedEntityType: 'contact',
            relatedEntityId: contactId,
            sourceTable: 'event_registrations',
            sourceRecordId: createdRegistrationResult.rows[0].registration_id,
            metadata: {
              registrationId: createdRegistrationResult.rows[0].registration_id,
              source: 'public',
            },
          },
          client,
          {
            eventId,
            contactId,
            source: 'public-registration',
          }
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

      await recordActivityEventSafely(
        {
          type: 'event_check_in',
          title: 'Event attendee checked in',
          description: 'A public attendee checked in to an event',
          entityType: 'event',
          entityId: eventId,
          relatedEntityType: 'contact',
          relatedEntityId: contactId,
          sourceTable: 'event_registrations',
          sourceRecordId: checkedInResult.rows[0].registration_id,
          metadata: {
            registrationId: checkedInResult.rows[0].registration_id,
            source: 'public',
            createdRegistration,
          },
        },
        client,
        {
          eventId,
          contactId,
          source: 'public-check-in',
        }
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
}
