import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import {
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
} from '@app-types/event';
import {
  EVENT_CHECKIN_WINDOW_AFTER_MINUTES,
  EVENT_CHECKIN_WINDOW_BEFORE_MINUTES,
  EventParticipantSupport,
  QueryValue,
  slugifyPublicEvent,
} from './shared';
import { EventOccurrenceService } from './eventOccurrenceService';
import { EventRegistrationService } from './eventRegistrationService';

interface PublicEventSeriesRow {
  event_id: string;
  series_id: string;
  series_name: string;
  event_name: string;
  description: string | null;
  event_type: EventType;
  status: EventStatus;
  is_public: boolean;
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
  registered_count: number;
  occurrence_count: number;
  next_occurrence_id: string | null;
  next_occurrence_start_date: Date | null;
  next_occurrence_end_date: Date | null;
  next_occurrence_status: EventStatus | null;
  next_occurrence_name: string | null;
  next_occurrence_index: number | null;
}

export class EventPublicService {
  private readonly support: EventParticipantSupport;
  private readonly occurrences: EventOccurrenceService;

  constructor(
    private readonly pool: Pool,
    private readonly registrations: EventRegistrationService,
    support: EventParticipantSupport = new EventParticipantSupport(pool),
    occurrences: EventOccurrenceService = new EventOccurrenceService(pool)
  ) {
    this.registrations = registrations;
    this.support = support;
    this.occurrences = occurrences;
  }

  private async getSeriesRow(eventId: string): Promise<PublicEventSeriesRow | null> {
    const result = await this.pool.query<PublicEventSeriesRow>(
      `SELECT
         e.id as event_id,
         e.id as series_id,
         e.name as series_name,
         e.name as event_name,
         e.description,
         e.event_type,
         e.status,
         e.is_public,
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
         COALESCE(occurrence_counts.occurrence_count, 0)::int as occurrence_count,
         next_occurrence.occurrence_id as next_occurrence_id,
         next_occurrence.start_date as next_occurrence_start_date,
         next_occurrence.end_date as next_occurrence_end_date,
         next_occurrence.status as next_occurrence_status,
         next_occurrence.occurrence_name as next_occurrence_name,
         next_occurrence.occurrence_index as next_occurrence_index
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
           eo.status,
           eo.event_name as occurrence_name,
           eo.sequence_index + 1 as occurrence_index
         FROM event_occurrences eo
         WHERE eo.event_id = e.id
           AND eo.status <> 'cancelled'
         ORDER BY
           CASE WHEN eo.end_date >= NOW() THEN 0 ELSE 1 END,
           CASE WHEN eo.end_date >= NOW() THEN eo.start_date END ASC NULLS LAST,
           CASE WHEN eo.end_date < NOW() THEN eo.start_date END DESC NULLS LAST
         LIMIT 1
       ) next_occurrence ON true
       WHERE e.id = $1
       LIMIT 1`,
      [eventId]
    );

    return result.rows[0] ?? null;
  }

  private toPublicListItem(row: PublicEventSeriesRow): PublicEventListItem {
    const occurrenceLabel =
      row.occurrence_count > 1
        ? row.next_occurrence_name && row.next_occurrence_name !== row.event_name
          ? row.next_occurrence_name
          : row.next_occurrence_index
            ? `Occurrence ${row.next_occurrence_index}`
            : null
        : null;

    return {
      event_id: row.event_id,
      slug: slugifyPublicEvent(row.event_name),
      series_id: row.series_id,
      series_name: row.series_name,
      event_name: row.event_name,
      description: row.description,
      event_type: row.event_type,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      occurrence_id: row.next_occurrence_id,
      occurrence_name: row.next_occurrence_name,
      occurrence_label: occurrenceLabel,
      occurrence_index: row.next_occurrence_index,
      occurrence_count: row.occurrence_count,
      occurrence_start_date: row.next_occurrence_start_date,
      occurrence_end_date: row.next_occurrence_end_date,
      location_name: row.location_name,
      city: row.city,
      state_province: row.state_province,
      country: row.country,
      capacity: row.capacity,
      waitlist_enabled: row.waitlist_enabled,
      registered_count: row.registered_count,
      next_occurrence_id: row.next_occurrence_id,
      next_occurrence_start_date: row.next_occurrence_start_date,
      next_occurrence_end_date: row.next_occurrence_end_date,
      next_occurrence_status: row.next_occurrence_status,
    };
  }

  async listPublicEventsByOwner(
    ownerUserId: string,
    query: PublicEventsQuery = {}
  ): Promise<PublicEventsListData> {
    const limit = query.limit ?? 12;
    const offset = query.offset ?? 0;
    const includePast = query.include_past ?? false;

    const where: string[] = [
      'e.created_by = $1',
      'e.is_public = true',
      "e.status IN ('planned', 'active', 'postponed')",
    ];
    const params: QueryValue[] = [ownerUserId];

    if (!includePast) {
      where.push('COALESCE(next_occurrence.end_date, e.end_date) >= NOW()');
    }

    if (query.event_type) {
      where.push(`e.event_type = $${params.length + 1}`);
      params.push(query.event_type);
    }

    if (query.search) {
      where.push(`(
        e.name ILIKE $${params.length + 1}
        OR COALESCE(e.description, '') ILIKE $${params.length + 1}
        OR COALESCE(e.location_name, '') ILIKE $${params.length + 1}
        OR COALESCE(e.city, '') ILIKE $${params.length + 1}
        OR COALESCE(e.state_province, '') ILIKE $${params.length + 1}
      )`);
      params.push(`%${query.search}%`);
    }

    const sortColumnMap: Record<NonNullable<PublicEventsQuery['sort_by']>, string> = {
      start_date: 'COALESCE(next_occurrence.start_date, e.start_date)',
      name: 'e.name',
      created_at: 'e.created_at',
    };
    const resolvedSortBy =
      query.sort_by && Object.prototype.hasOwnProperty.call(sortColumnMap, query.sort_by)
        ? query.sort_by
        : 'start_date';
    const resolvedSortOrder = query.sort_order === 'desc' ? 'DESC' : 'ASC';
    const whereClause = `WHERE ${where.join(' AND ')}`;

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

    const rowsResult = await this.pool.query<PublicEventSeriesRow>(
      `SELECT
         e.id as event_id,
         e.id as series_id,
         e.name as series_name,
         e.name as event_name,
         e.description,
         e.event_type,
         e.status,
         e.is_public,
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
         COALESCE(occurrence_counts.occurrence_count, 0)::int as occurrence_count,
         next_occurrence.occurrence_id as next_occurrence_id,
         next_occurrence.start_date as next_occurrence_start_date,
         next_occurrence.end_date as next_occurrence_end_date,
         next_occurrence.status as next_occurrence_status,
         next_occurrence.occurrence_name as next_occurrence_name,
         next_occurrence.occurrence_index as next_occurrence_index
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
           eo.status,
           eo.event_name as occurrence_name,
           eo.sequence_index + 1 as occurrence_index
         FROM event_occurrences eo
         WHERE eo.event_id = e.id
           AND eo.status <> 'cancelled'
         ORDER BY
           CASE WHEN eo.end_date >= NOW() THEN 0 ELSE 1 END,
           CASE WHEN eo.end_date >= NOW() THEN eo.start_date END ASC NULLS LAST,
           CASE WHEN eo.end_date < NOW() THEN eo.start_date END DESC NULLS LAST
         LIMIT 1
       ) next_occurrence ON true
       ${whereClause}
       ORDER BY ${sortColumnMap[resolvedSortBy]} ${resolvedSortOrder}, e.id ${resolvedSortOrder}
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      items: rowsResult.rows.map((row) => this.toPublicListItem(row)),
      page: {
        limit,
        offset,
        total,
        has_more: offset + rowsResult.rows.length < total,
      },
    };
  }

  async getPublicEventBySlug(ownerUserId: string, slug: string): Promise<PublicEventDetail | null> {
    const events = await this.listPublicEventsByOwner(ownerUserId, {
      include_past: true,
      limit: 100,
      offset: 0,
    });
    const match = events.items.find((item) => item.slug === slugifyPublicEvent(slug));
    if (!match) {
      return null;
    }

    const series = await this.getSeriesRow(match.event_id);
    if (!series) {
      return null;
    }

    const occurrences = await this.occurrences.getOccurrencesForEvent(match.event_id, {
      include_cancelled: true,
    });
    const defaultOccurrence =
      (match.occurrence_id
        ? occurrences.find((occurrence) => occurrence.occurrence_id === match.occurrence_id)
        : null) ?? occurrences[0] ?? null;

    const isRegistrationOpen =
      Boolean(defaultOccurrence) &&
      defaultOccurrence!.status !== EventStatus.CANCELLED &&
      defaultOccurrence!.status !== EventStatus.COMPLETED &&
      (!defaultOccurrence!.capacity ||
        defaultOccurrence!.registered_count < defaultOccurrence!.capacity ||
        defaultOccurrence!.waitlist_enabled);

    return {
      ...this.toPublicListItem(series),
      address_line1: series.address_line1,
      address_line2: series.address_line2,
      postal_code: series.postal_code,
      default_occurrence_id: defaultOccurrence?.occurrence_id ?? null,
      occurrences,
      is_registration_open: isRegistrationOpen,
    };
  }

  async submitPublicRegistration(
    eventId: string,
    data: PublicEventRegistrationDTO
  ): Promise<PublicEventRegistrationResult> {
    const series = await this.getSeriesRow(eventId);
    if (
      !series ||
      !series.is_public ||
      series.status === EventStatus.CANCELLED ||
      series.status === EventStatus.COMPLETED
    ) {
      throw new Error('Event registration is unavailable');
    }

    const defaultOccurrence = await this.occurrences.resolveOccurrence(eventId, data.occurrence_id);
    if (!defaultOccurrence) {
      throw new Error('Event not found');
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
        createdBy: null,
      });
      createdContact = true;
    }

    try {
      const registration = await this.registrations.registerContact(
        {
          event_id: eventId,
          occurrence_id: defaultOccurrence.occurrence_id,
          contact_id: contactId,
          registration_status: data.registration_status,
          enrollment_scope: data.enrollment_scope,
          send_confirmation_email: data.send_confirmation_email,
          notes: data.notes,
        },
        {
          source: 'public',
        }
      );

      return {
        status: 'registered',
        contact_id: contactId,
        registration,
        created_contact: createdContact,
        created_registration: true,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('already registered')) {
        const existing = await this.registrations.getContactRegistrations(contactId);
        const registration =
          existing.find((row) => row.event_id === eventId && row.occurrence_id === defaultOccurrence.occurrence_id) ??
          existing.find((row) => row.event_id === eventId) ??
          null;

        if (registration) {
          return {
            status: 'already_registered',
            contact_id: contactId,
            registration,
            created_contact: createdContact,
            created_registration: false,
          };
        }
      }

      if (error instanceof Error && error.message === 'Event is at full capacity') {
        throw Object.assign(new Error('Event is at full capacity'), { cause: error });
      }

      throw error;
    }
  }

  async getPublicCheckInInfo(eventId: string, occurrenceId?: string): Promise<PublicEventCheckInInfo | null> {
    const series = await this.getSeriesRow(eventId);
    if (
      !series ||
      !series.is_public ||
      series.status === EventStatus.CANCELLED ||
      series.status === EventStatus.COMPLETED
    ) {
      return null;
    }

    const occurrence = await this.occurrences.resolveOccurrence(
      eventId,
      occurrenceId ?? series.next_occurrence_id
    );
    if (!occurrence || !occurrence.public_checkin_enabled) {
      return null;
    }

    const checkinOpen = (() => {
      try {
        this.support.assertCheckInAllowed({
          id: occurrence.occurrence_id,
          start_date: occurrence.start_date,
          end_date: occurrence.end_date,
          status: occurrence.status,
          capacity: occurrence.capacity,
          registered_count: occurrence.registered_count,
        });
        return true;
      } catch {
        return false;
      }
    })();

    return {
      event_id: series.event_id,
      occurrence_id: occurrence.occurrence_id,
      series_id: series.series_id,
      series_name: series.series_name,
      event_name: series.event_name,
      description: series.description,
      event_type: series.event_type,
      status: occurrence.status,
      start_date: series.start_date,
      end_date: series.end_date,
      occurrence_name: occurrence.occurrence_name ?? occurrence.event_name,
      occurrence_label:
        series.occurrence_count > 1
          ? occurrence.occurrence_name && occurrence.occurrence_name !== series.event_name
            ? occurrence.occurrence_name
            : `Occurrence ${occurrence.occurrence_index ?? occurrence.sequence_index + 1}`
          : null,
      occurrence_index: occurrence.occurrence_index ?? occurrence.sequence_index + 1,
      occurrence_count: series.occurrence_count,
      occurrence_start_date: occurrence.start_date,
      occurrence_end_date: occurrence.end_date,
      location_name: occurrence.location_name ?? series.location_name,
      public_checkin_enabled: occurrence.public_checkin_enabled,
      public_checkin_pin_required: occurrence.public_checkin_pin_configured,
      checkin_open: checkinOpen,
      checkin_window_before_minutes: EVENT_CHECKIN_WINDOW_BEFORE_MINUTES,
      checkin_window_after_minutes: EVENT_CHECKIN_WINDOW_AFTER_MINUTES,
    };
  }

  async submitPublicCheckIn(
    eventId: string,
    data: PublicEventCheckInDTO
  ): Promise<PublicEventCheckInResult> {
    const series = await this.getSeriesRow(eventId);
    if (!series || !series.is_public) {
      throw new Error('Event not found');
    }

    const occurrence = await this.occurrences.resolveOccurrence(
      eventId,
      data.occurrence_id ?? series.next_occurrence_id
    );
    if (!occurrence) {
      throw new Error('Event not found');
    }

    const lockedOccurrenceResult = await this.pool.query<{
      id: string;
      event_id: string;
      start_date: Date;
      end_date: Date;
      status: EventStatus;
      capacity: number | null;
      registered_count: number;
      public_checkin_enabled: boolean;
      public_checkin_pin_hash: string | null;
    }>(
      `SELECT
         id,
         event_id,
         start_date,
         end_date,
         status,
         capacity,
         registered_count,
         public_checkin_enabled,
         public_checkin_pin_hash
       FROM event_occurrences
       WHERE id = $1
       FOR UPDATE`,
      [occurrence.occurrence_id]
    );

    const lockedOccurrence = lockedOccurrenceResult.rows[0];
    if (!lockedOccurrence || !lockedOccurrence.public_checkin_enabled) {
      throw new Error('Public check-in is not enabled for this event');
    }
    if (!lockedOccurrence.public_checkin_pin_hash) {
      throw new Error('Event check-in PIN is not configured');
    }

    const pinMatch = await bcrypt.compare(data.pin.trim(), lockedOccurrence.public_checkin_pin_hash);
    if (!pinMatch) {
      throw new Error('Invalid event check-in PIN');
    }

    this.support.assertCheckInAllowed({
      id: lockedOccurrence.id,
      start_date: lockedOccurrence.start_date,
      end_date: lockedOccurrence.end_date,
      status: lockedOccurrence.status,
      capacity: lockedOccurrence.capacity,
      registered_count: lockedOccurrence.registered_count,
    });

    let createdContact = false;
    let contactId = await this.support.resolveContactIdByIdentity(this.pool, {
      email: data.email,
      phone: data.phone,
    });

    if (!contactId) {
      contactId = await this.support.createWalkInContact(this.pool, {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        createdBy: null,
      });
      createdContact = true;
    }

    let createdRegistration = false;
    const currentRegistrations = await this.registrations.getContactRegistrations(contactId);
    let registration =
      currentRegistrations.find(
        (row) => row.event_id === eventId && row.occurrence_id === occurrence.occurrence_id
      ) ?? null;

    if (!registration) {
      registration = await this.registrations.registerContact(
        {
          event_id: eventId,
          occurrence_id: occurrence.occurrence_id,
          contact_id: contactId,
          registration_status: undefined,
          send_confirmation_email: true,
        },
        {
          source: 'public',
        }
      );
      createdRegistration = true;
    }

    if (registration.checked_in) {
      return {
        status: 'already_checked_in',
        contact_id: contactId,
        registration,
        created_contact: createdContact,
        created_registration: createdRegistration,
      };
    }

    const checkInResult = await this.registrations.checkInAttendee(registration.registration_id, {
      method: 'manual',
      checkedInBy: null,
    });

    if (!checkInResult.success || !checkInResult.registration) {
      throw new Error(checkInResult.message);
    }

    return {
      status: 'checked_in',
      contact_id: contactId,
      registration: checkInResult.registration,
      created_contact: createdContact,
      created_registration: createdRegistration,
    };
  }
}
