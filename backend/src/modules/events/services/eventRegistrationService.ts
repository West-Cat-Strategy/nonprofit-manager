import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { Pool, type PoolClient } from 'pg';
import {
  CheckInOptions,
  CheckInResult,
  CreateRegistrationDTO,
  EventCheckInSettings,
  EventRegistration,
  EventRegistrationMutationContext,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  RegistrationStatus,
  RotateEventCheckInPinResult,
  UpdateEventCheckInSettingsDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { PASSWORD } from '@config/constants';
import { EventConfirmationService } from './eventConfirmationService';
import { EventOccurrenceService } from './eventOccurrenceService';
import {
  assertRegistrationCheckInAllowed,
  EventCheckInWindowEventRow,
  EventParticipantSupport,
  QueryValue,
  getRegistrationCountDelta,
  isRegistrationCountedAsActive,
  recordActivityEventSafely,
} from './shared';

interface EventRegistrationCaseLink {
  caseId: string | null;
  caseNumber: string | null;
  caseTitle: string | null;
}

interface EventRow {
  event_id: string;
  event_name: string;
}

interface LockedOccurrenceRow extends EventCheckInWindowEventRow {
  occurrence_id: string;
  event_id: string;
  occurrence_name: string;
  waitlist_enabled: boolean;
  public_checkin_enabled: boolean;
  public_checkin_pin_hash: string | null;
  public_checkin_pin_rotated_at: Date | null;
}

interface LockedRegistrationRow {
  registration_id: string;
  event_id: string;
  occurrence_id: string;
  contact_id: string;
  case_id: string | null;
  registration_status: RegistrationStatus;
  waitlist_position: number | null;
  checked_in: boolean;
  series_enrollment_id: string | null;
}

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

const REGISTRATION_SELECT = `
  SELECT
    er.id as registration_id,
    er.event_id,
    er.occurrence_id,
    er.contact_id,
    er.case_id,
    er.series_enrollment_id,
    er.registration_status,
    er.waitlist_position,
    er.checked_in,
    er.check_in_time,
    er.checked_in_by,
    er.check_in_method,
    er.check_in_token,
    er.confirmation_email_status,
    er.confirmation_email_sent_at,
    er.confirmation_email_error,
    er.confirmation_email_error as confirmation_email_last_error,
    er.notes,
    er.created_at,
    er.updated_at,
    TRIM(CONCAT(c.first_name, ' ', c.last_name)) as contact_name,
    c.email as contact_email,
    e.name as event_name,
    eo.event_name as occurrence_name,
    eo.sequence_index + 1 as occurrence_index,
    CASE
      WHEN occurrence_counts.occurrence_count > 1 THEN
        CASE
          WHEN eo.event_name IS NOT NULL AND eo.event_name <> e.name THEN eo.event_name
          ELSE CONCAT('Occurrence ', eo.sequence_index + 1)
        END
      ELSE NULL
    END as occurrence_label,
    eo.start_date as occurrence_start_date,
    eo.end_date as occurrence_end_date,
    eo.status as occurrence_status
  FROM event_registrations er
  INNER JOIN contacts c ON c.id = er.contact_id
  INNER JOIN events e ON e.id = er.event_id
  INNER JOIN event_occurrences eo ON eo.id = er.occurrence_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int as occurrence_count
    FROM event_occurrences eo_count
    WHERE eo_count.event_id = e.id
  ) occurrence_counts ON true
`;

export class EventRegistrationService {
  private readonly support: EventParticipantSupport;
  private readonly occurrences: EventOccurrenceService;
  private readonly confirmations: EventConfirmationService;

  constructor(
    private readonly pool: Pool,
    support: EventParticipantSupport = new EventParticipantSupport(pool),
    occurrences: EventOccurrenceService = new EventOccurrenceService(pool),
    confirmations: EventConfirmationService = new EventConfirmationService(pool)
  ) {
    this.support = support;
    this.occurrences = occurrences;
    this.confirmations = confirmations;
  }

  private buildRegistrationDescription(
    status: RegistrationStatus,
    options?: {
      previousStatus?: RegistrationStatus;
      action?: 'created' | 'updated' | 'promoted';
    }
  ): string {
    if (options?.action === 'promoted') {
      return `Promoted from waitlist to ${status}`;
    }

    if (options?.action === 'updated' && options.previousStatus) {
      return `Registration status changed from ${options.previousStatus} to ${status}`;
    }

    switch (status) {
      case RegistrationStatus.CONFIRMED:
        return 'Confirmed attendance for the event';
      case RegistrationStatus.WAITLISTED:
        return 'Added to the waitlist for the event';
      case RegistrationStatus.NO_SHOW:
        return 'Marked as no-show for the event';
      case RegistrationStatus.CANCELLED:
        return 'Registration cancelled for the event';
      default:
        return 'Registered for the event';
    }
  }

  private async resolveCaseLink(
    client: Queryable,
    caseId: string | null | undefined,
    contactId: string
  ): Promise<EventRegistrationCaseLink> {
    if (!caseId) {
      return {
        caseId: null,
        caseNumber: null,
        caseTitle: null,
      };
    }

    const result = await client.query<{
      id: string;
      case_number: string | null;
      title: string | null;
    }>(
      `SELECT id, case_number, title
       FROM cases
       WHERE id = $1
         AND contact_id = $2
       LIMIT 1`,
      [caseId, contactId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Case must belong to the same contact as the registration');
    }

    return {
      caseId: row.id,
      caseNumber: row.case_number,
      caseTitle: row.title,
    };
  }

  private async getEventRow(eventId: string, queryable: Queryable = this.pool): Promise<EventRow | null> {
    const result = await queryable.query<EventRow>(
      `SELECT id as event_id, name as event_name
       FROM events
       WHERE id = $1
       LIMIT 1`,
      [eventId]
    );

    return result.rows[0] ?? null;
  }

  private async getLockedOccurrence(
    eventId: string,
    occurrenceId: string,
    queryable: Queryable = this.pool
  ): Promise<LockedOccurrenceRow | null> {
    const result = await queryable.query<LockedOccurrenceRow>(
      `SELECT
         eo.id as occurrence_id,
         eo.event_id,
         eo.event_name as occurrence_name,
         eo.start_date,
         eo.end_date,
         eo.status,
         eo.capacity,
         eo.registered_count,
         eo.public_checkin_enabled,
         eo.public_checkin_pin_hash,
         eo.public_checkin_pin_rotated_at,
         eo.waitlist_enabled
       FROM event_occurrences eo
       WHERE eo.id = $1
         AND eo.event_id = $2
       FOR UPDATE`,
      [occurrenceId, eventId]
    );

    return result.rows[0] ?? null;
  }

  private async getRegistrationByIdInternal(
    registrationId: string,
    queryable: Queryable = this.pool
  ): Promise<EventRegistration | null> {
    const result = await queryable.query<EventRegistration>(
      `${REGISTRATION_SELECT}
       WHERE er.id = $1
       LIMIT 1`,
      [registrationId]
    );

    return result.rows[0] ?? null;
  }

  private async getExistingOccurrenceRegistration(
    occurrenceId: string,
    contactId: string,
    queryable: Queryable = this.pool,
    lock = false
  ): Promise<EventRegistration | null> {
    const lockClause = lock ? 'FOR UPDATE' : '';
    const result = await queryable.query<EventRegistration>(
      `${REGISTRATION_SELECT}
       WHERE er.occurrence_id = $1
         AND er.contact_id = $2
       ${lockClause}
       LIMIT 1`,
      [occurrenceId, contactId]
    );

    return result.rows[0] ?? null;
  }

  private async getNextWaitlistPosition(
    occurrenceId: string,
    queryable: Queryable = this.pool
  ): Promise<number> {
    const result = await queryable.query<{ next_position: number }>(
      `SELECT COALESCE(MAX(waitlist_position), 0)::int + 1 as next_position
       FROM event_registrations
       WHERE occurrence_id = $1
         AND registration_status = 'waitlisted'`,
      [occurrenceId]
    );

    return result.rows[0]?.next_position ?? 1;
  }

  private async determineRegistrationStatus(
    occurrence: LockedOccurrenceRow,
    requestedStatus: RegistrationStatus | undefined,
    queryable: Queryable
  ): Promise<{
    registrationStatus: RegistrationStatus;
    waitlistPosition: number | null;
  }> {
    const desiredStatus = requestedStatus ?? RegistrationStatus.REGISTERED;
    const wantsActiveStatus = desiredStatus === RegistrationStatus.REGISTERED || desiredStatus === RegistrationStatus.CONFIRMED;

    if (desiredStatus === RegistrationStatus.WAITLISTED) {
      return {
        registrationStatus: RegistrationStatus.WAITLISTED,
        waitlistPosition: await this.getNextWaitlistPosition(occurrence.occurrence_id, queryable),
      };
    }

    if (
      wantsActiveStatus &&
      occurrence.capacity &&
      occurrence.registered_count >= occurrence.capacity
    ) {
      if (!occurrence.waitlist_enabled) {
        throw new Error('Event is at full capacity');
      }

      return {
        registrationStatus: RegistrationStatus.WAITLISTED,
        waitlistPosition: await this.getNextWaitlistPosition(occurrence.occurrence_id, queryable),
      };
    }

    return {
      registrationStatus: desiredStatus,
      waitlistPosition: null,
    };
  }

  private async recalculateCounts(
    eventId: string,
    occurrenceId: string,
    queryable: Queryable
  ): Promise<void> {
    await this.occurrences.recalculateOccurrenceCounts(occurrenceId, queryable);
    await this.occurrences.recalculateEventCounts(eventId, queryable);
  }

  private async createSeriesEnrollment(
    client: Queryable,
    eventId: string,
    contactId: string,
    registrationStatus: RegistrationStatus,
    notes: string | null,
    userId: string | null
  ): Promise<string> {
    const result = await client.query<{ enrollment_id: string }>(
      `INSERT INTO event_series_enrollments (
         event_id,
         contact_id,
         registration_status,
         enrollment_scope,
         notes,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, 'series', $4, $5, $5)
       ON CONFLICT (event_id, contact_id)
       DO UPDATE
       SET registration_status = EXCLUDED.registration_status,
           enrollment_scope = 'series',
           notes = COALESCE(EXCLUDED.notes, event_series_enrollments.notes),
           modified_by = EXCLUDED.modified_by,
           updated_at = CURRENT_TIMESTAMP
       RETURNING id as enrollment_id`,
      [eventId, contactId, registrationStatus, notes, userId]
    );

    return result.rows[0]!.enrollment_id;
  }

  private async createRegistrationRecord(
    client: Queryable,
    args: {
      eventId: string;
      occurrenceId: string;
      contactId: string;
      caseId: string | null;
      registrationStatus: RegistrationStatus;
      waitlistPosition: number | null;
      notes: string | null;
      seriesEnrollmentId?: string | null;
    }
  ): Promise<EventRegistration> {
    const result = await client.query<{ registration_id: string }>(
      `INSERT INTO event_registrations (
         event_id,
         occurrence_id,
         contact_id,
         case_id,
         series_enrollment_id,
         registration_status,
         waitlist_position,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id as registration_id`,
      [
        args.eventId,
        args.occurrenceId,
        args.contactId,
        args.caseId,
        args.seriesEnrollmentId ?? null,
        args.registrationStatus,
        args.waitlistPosition,
        args.notes,
      ]
    );

    return (await this.getRegistrationByIdInternal(result.rows[0]!.registration_id, client)) as EventRegistration;
  }

  private async maybePromoteWaitlistedRegistration(
    client: Queryable,
    event: EventRow,
    occurrence: LockedOccurrenceRow,
    actorUserId: string | null,
    excludeRegistrationId?: string | null
  ): Promise<string | null> {
    if (!occurrence.waitlist_enabled) {
      return null;
    }

    const refreshedOccurrence = await this.getLockedOccurrence(
      occurrence.event_id,
      occurrence.occurrence_id,
      client
    );
    if (!refreshedOccurrence) {
      return null;
    }

    if (
      refreshedOccurrence.capacity &&
      refreshedOccurrence.registered_count >= refreshedOccurrence.capacity
    ) {
      return null;
    }

    const candidateResult = await client.query<{
      registration_id: string;
      contact_id: string;
      registration_status: RegistrationStatus;
      waitlist_position: number | null;
      case_id: string | null;
    }>(
      `SELECT
         er.id as registration_id,
         er.contact_id,
         er.registration_status,
         er.waitlist_position,
         er.case_id
       FROM event_registrations er
       WHERE er.occurrence_id = $1
         AND er.registration_status = 'waitlisted'
         AND ($2::uuid IS NULL OR er.id <> $2)
       ORDER BY er.waitlist_position ASC NULLS LAST, er.created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [occurrence.occurrence_id, excludeRegistrationId ?? null]
    );

    const candidate = candidateResult.rows[0];
    if (!candidate) {
      return null;
    }

    await client.query(
      `UPDATE event_registrations
       SET registration_status = 'registered',
           waitlist_position = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [candidate.registration_id]
    );

    const linkedCase = await this.resolveCaseLink(client, candidate.case_id, candidate.contact_id);
    await recordActivityEventSafely(
      {
        type: 'event_registration_updated',
        title: 'Event registration updated',
        description: this.buildRegistrationDescription(RegistrationStatus.REGISTERED, {
          previousStatus: RegistrationStatus.WAITLISTED,
          action: 'promoted',
        }),
        userId: actorUserId,
        entityType: 'event',
        entityId: event.event_id,
        relatedEntityType: 'contact',
        relatedEntityId: candidate.contact_id,
        sourceTable: 'event_registrations',
        sourceRecordId: candidate.registration_id,
        metadata: {
          eventId: event.event_id,
          eventName: event.event_name,
          registrationId: candidate.registration_id,
          previousStatus: RegistrationStatus.WAITLISTED,
          nextStatus: RegistrationStatus.REGISTERED,
          registrationStatus: RegistrationStatus.REGISTERED,
          caseId: linkedCase.caseId,
          caseNumber: linkedCase.caseNumber,
          caseTitle: linkedCase.caseTitle,
          source: 'waitlist-promotion',
        },
      },
      client,
      {
        eventId: event.event_id,
        contactId: candidate.contact_id,
        source: 'waitlist-promotion',
      }
    );

    await this.recalculateCounts(event.event_id, occurrence.occurrence_id, client);
    return candidate.registration_id;
  }

  private async listFutureSeriesOccurrences(
    eventId: string,
    fromDate: Date,
    queryable: Queryable
  ): Promise<LockedOccurrenceRow[]> {
    const result = await queryable.query<LockedOccurrenceRow>(
      `SELECT
         eo.id as occurrence_id,
         eo.event_id,
         eo.event_name as occurrence_name,
         eo.start_date,
         eo.end_date,
         eo.status,
         eo.capacity,
         eo.registered_count,
         eo.waitlist_enabled,
         eo.public_checkin_enabled,
         eo.public_checkin_pin_hash,
         eo.public_checkin_pin_rotated_at
       FROM event_occurrences eo
       WHERE eo.event_id = $1
         AND eo.end_date >= $2
         AND eo.status NOT IN ('cancelled', 'completed')
       ORDER BY eo.start_date ASC
       FOR UPDATE`,
      [eventId, fromDate]
    );

    return result.rows;
  }

  private async maybeSendConfirmationEmail(
    registrationId: string,
    sentBy: string | null,
    registrationStatus: RegistrationStatus,
    explicitPreference?: boolean
  ): Promise<void> {
    if (explicitPreference === false || !isRegistrationCountedAsActive(registrationStatus)) {
      return;
    }

    await this.confirmations.sendRegistrationConfirmationEmail(registrationId, sentBy);
  }

  async getEventRegistrations(
    eventId: string,
    filters: {
      occurrence_id?: string;
      registration_status?: RegistrationStatus;
      checked_in?: boolean;
    } = {}
  ): Promise<EventRegistration[]> {
    const conditions: string[] = ['er.event_id = $1'];
    const params: QueryValue[] = [eventId];

    if (filters.occurrence_id) {
      conditions.push(`er.occurrence_id = $${params.length + 1}`);
      params.push(filters.occurrence_id);
    }

    if (filters.registration_status) {
      conditions.push(`er.registration_status = $${params.length + 1}`);
      params.push(filters.registration_status);
    }

    if (filters.checked_in !== undefined) {
      conditions.push(`er.checked_in = $${params.length + 1}`);
      params.push(filters.checked_in);
    }

    const result = await this.pool.query<EventRegistration>(
      `${REGISTRATION_SELECT}
       WHERE ${conditions.join(' AND ')}
       ORDER BY eo.start_date ASC, er.created_at DESC`,
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

    const result = await this.pool.query<EventRegistration>(
      `${REGISTRATION_SELECT}
       WHERE ${conditions.join(' AND ')}
       ORDER BY eo.start_date DESC, er.created_at DESC`,
      params
    );

    return result.rows;
  }

  async getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    return this.getRegistrationByIdInternal(registrationId);
  }

  async getRegistrationByToken(eventId: string, token: string): Promise<EventRegistration | null> {
    const result = await this.pool.query<EventRegistration>(
      `${REGISTRATION_SELECT}
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

    const result = await this.pool.query<EventRegistration>(
      `${REGISTRATION_SELECT}
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      params
    );

    return result.rows[0] ?? null;
  }

  async registerContact(
    registrationData: CreateRegistrationDTO,
    context: EventRegistrationMutationContext = {}
  ): Promise<EventRegistration> {
    const {
      event_id,
      occurrence_id,
      contact_id,
      case_id,
      registration_status,
      enrollment_scope = 'occurrence',
      send_confirmation_email,
      notes,
    } = registrationData;
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const event = await this.getEventRow(event_id, client);
      if (!event) {
        throw new Error('Event not found');
      }

      const resolvedOccurrence = await this.occurrences.resolveOccurrence(event_id, occurrence_id, client);
      if (!resolvedOccurrence) {
        throw new Error('Occurrence not found');
      }

      const linkedCase = await this.resolveCaseLink(client, case_id, contact_id);
      const pendingConfirmationIds: string[] = [];

      if (enrollment_scope === 'series') {
        const futureOccurrences = await this.listFutureSeriesOccurrences(
          event_id,
          new Date(resolvedOccurrence.start_date),
          client
        );
        const enrollmentId = await this.createSeriesEnrollment(
          client,
          event_id,
          contact_id,
          registration_status ?? RegistrationStatus.REGISTERED,
          notes?.trim() || null,
          context.actorUserId ?? null
        );

        let primaryRegistration: EventRegistration | null = null;
        for (const candidate of futureOccurrences) {
          const existing = await this.getExistingOccurrenceRegistration(
            candidate.occurrence_id,
            contact_id,
            client,
            true
          );
          if (existing) {
            if (candidate.occurrence_id === resolvedOccurrence.occurrence_id) {
              primaryRegistration = existing;
            }
            continue;
          }

          const lockedCandidate = await this.getLockedOccurrence(event_id, candidate.occurrence_id, client);
          if (!lockedCandidate) {
            continue;
          }

          const { registrationStatus, waitlistPosition } = await this.determineRegistrationStatus(
            lockedCandidate,
            registration_status,
            client
          );
          const created = await this.createRegistrationRecord(client, {
            eventId: event_id,
            occurrenceId: lockedCandidate.occurrence_id,
            contactId: contact_id,
            caseId: linkedCase.caseId,
            registrationStatus,
            waitlistPosition,
            notes: notes?.trim() || null,
            seriesEnrollmentId: enrollmentId,
          });

          if (candidate.occurrence_id === resolvedOccurrence.occurrence_id || !primaryRegistration) {
            primaryRegistration = created;
          }

          await recordActivityEventSafely(
            {
              type: 'event_registration',
              title: 'Event registration',
              description: this.buildRegistrationDescription(registrationStatus),
              userId: context.actorUserId ?? null,
              entityType: 'event',
              entityId: event_id,
              relatedEntityType: 'contact',
              relatedEntityId: contact_id,
              sourceTable: 'event_registrations',
              sourceRecordId: created.registration_id,
              metadata: {
                eventId: event_id,
                eventName: event.event_name,
                registrationId: created.registration_id,
                registrationStatus,
                occurrenceId: created.occurrence_id,
                seriesEnrollmentId: enrollmentId,
                caseId: linkedCase.caseId,
                caseNumber: linkedCase.caseNumber,
                caseTitle: linkedCase.caseTitle,
                source: context.source || 'staff',
              },
            },
            client,
            {
              eventId: event_id,
              contactId: contact_id,
              source: context.source || 'series-registration',
            }
          );

          await this.recalculateCounts(event_id, lockedCandidate.occurrence_id, client);
          if (isRegistrationCountedAsActive(registrationStatus)) {
            pendingConfirmationIds.push(created.registration_id);
          }
        }

        if (!primaryRegistration) {
          throw new Error('Contact is already registered for this event series');
        }

        await client.query('COMMIT');

        const confirmationTargetId =
          pendingConfirmationIds.find((id) => id === primaryRegistration?.registration_id) ??
          pendingConfirmationIds[0];
        if (confirmationTargetId && send_confirmation_email !== false) {
          await this.confirmations.sendRegistrationConfirmationEmail(
            confirmationTargetId,
            context.actorUserId ?? null
          );
        }

        return primaryRegistration;
      }

      const lockedOccurrence = await this.getLockedOccurrence(
        event_id,
        resolvedOccurrence.occurrence_id,
        client
      );
      if (!lockedOccurrence) {
        throw new Error('Occurrence not found');
      }

      const existing = await this.getExistingOccurrenceRegistration(
        lockedOccurrence.occurrence_id,
        contact_id,
        client,
        true
      );
      if (existing) {
        throw new Error('Contact is already registered for this occurrence');
      }

      const { registrationStatus, waitlistPosition } = await this.determineRegistrationStatus(
        lockedOccurrence,
        registration_status,
        client
      );
      const created = await this.createRegistrationRecord(client, {
        eventId: event_id,
        occurrenceId: lockedOccurrence.occurrence_id,
        contactId: contact_id,
        caseId: linkedCase.caseId,
        registrationStatus,
        waitlistPosition,
        notes: notes?.trim() || null,
      });

      await recordActivityEventSafely(
        {
          type: 'event_registration',
          title: 'Event registration',
          description: this.buildRegistrationDescription(registrationStatus),
          userId: context.actorUserId ?? null,
          entityType: 'event',
          entityId: event_id,
          relatedEntityType: 'contact',
          relatedEntityId: contact_id,
          sourceTable: 'event_registrations',
          sourceRecordId: created.registration_id,
          metadata: {
            eventId: event_id,
            eventName: event.event_name,
            registrationId: created.registration_id,
            registrationStatus,
            occurrenceId: created.occurrence_id,
            caseId: linkedCase.caseId,
            caseNumber: linkedCase.caseNumber,
            caseTitle: linkedCase.caseTitle,
            source: context.source || 'staff',
          },
        },
        client,
        {
          eventId: event_id,
          contactId: contact_id,
          source: context.source || 'staff-registration',
        }
      );

      await this.recalculateCounts(event_id, lockedOccurrence.occurrence_id, client);
      await client.query('COMMIT');

      await this.maybeSendConfirmationEmail(
        created.registration_id,
        context.actorUserId ?? null,
        registrationStatus,
        send_confirmation_email
      );

      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateRegistration(
    registrationId: string,
    updateData: UpdateRegistrationDTO,
    context: EventRegistrationMutationContext = {}
  ): Promise<EventRegistration> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const currentResult = await client.query<LockedRegistrationRow>(
        `SELECT
           er.id as registration_id,
           er.event_id,
           er.occurrence_id,
           er.contact_id,
           er.case_id,
           er.registration_status,
           er.waitlist_position,
           er.checked_in,
           er.series_enrollment_id
         FROM event_registrations er
         WHERE er.id = $1
         FOR UPDATE`,
        [registrationId]
      );

      const current = currentResult.rows[0];
      if (!current) {
        throw new Error('Registration not found');
      }

      const event = await this.getEventRow(current.event_id, client);
      if (!event) {
        throw new Error('Event not found');
      }

      const occurrence = await this.getLockedOccurrence(
        current.event_id,
        current.occurrence_id,
        client
      );
      if (!occurrence) {
        throw new Error('Occurrence not found');
      }

      const nextStatus = updateData.registration_status ?? current.registration_status;
      if (current.checked_in && !isRegistrationCountedAsActive(nextStatus)) {
        throw new Error(`Checked-in attendees cannot be moved to ${nextStatus}`);
      }

      const countDelta = getRegistrationCountDelta(current.registration_status, nextStatus);
      if (
        countDelta > 0 &&
        occurrence.capacity &&
        occurrence.registered_count >= occurrence.capacity &&
        nextStatus !== RegistrationStatus.WAITLISTED
      ) {
        if (!occurrence.waitlist_enabled) {
          throw new Error('Event is at full capacity');
        }
        throw new Error('Checked-in attendees cannot be moved to a full occurrence');
      }

      const resolvedCaseId =
        updateData.case_id === undefined ? current.case_id : updateData.case_id ?? null;
      const linkedCase = await this.resolveCaseLink(client, resolvedCaseId, current.contact_id);

      const fields: string[] = [];
      const values: QueryValue[] = [];
      let paramCount = 1;

      if (updateData.registration_status !== undefined) {
        fields.push(`registration_status = $${paramCount++}`);
        values.push(updateData.registration_status);
        if (updateData.registration_status === RegistrationStatus.WAITLISTED) {
          const waitlistPosition = await this.getNextWaitlistPosition(current.occurrence_id, client);
          fields.push(`waitlist_position = $${paramCount++}`);
          values.push(waitlistPosition);
        } else if (current.registration_status === RegistrationStatus.WAITLISTED) {
          fields.push(`waitlist_position = NULL`);
        }
      }
      if (updateData.notes !== undefined) {
        fields.push(`notes = $${paramCount++}`);
        values.push(updateData.notes);
      }
      if (updateData.case_id !== undefined) {
        fields.push(`case_id = $${paramCount++}`);
        values.push(linkedCase.caseId);
      }
      if (updateData.checked_in !== undefined) {
        fields.push(`checked_in = $${paramCount++}`);
        values.push(updateData.checked_in);
      }
      if (updateData.check_in_time !== undefined) {
        fields.push(`check_in_time = $${paramCount++}`);
        values.push(updateData.check_in_time);
      }
      if (updateData.checked_in_by !== undefined) {
        fields.push(`checked_in_by = $${paramCount++}`);
        values.push(updateData.checked_in_by);
      }
      if (updateData.check_in_method !== undefined) {
        fields.push(`check_in_method = $${paramCount++}`);
        values.push(updateData.check_in_method);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(registrationId);

      await client.query(
        `UPDATE event_registrations
         SET ${fields.join(', ')}
         WHERE id = $${paramCount}`,
        values
      );

      await this.recalculateCounts(current.event_id, current.occurrence_id, client);

      let promotedRegistrationId: string | null = null;
      if (
        current.registration_status !== RegistrationStatus.WAITLISTED &&
        nextStatus === RegistrationStatus.CANCELLED
      ) {
        promotedRegistrationId = await this.maybePromoteWaitlistedRegistration(
          client,
          event,
          occurrence,
          context.actorUserId ?? null,
          registrationId
        );
      } else if (countDelta < 0) {
        promotedRegistrationId = await this.maybePromoteWaitlistedRegistration(
          client,
          event,
          occurrence,
          context.actorUserId ?? null,
          nextStatus === RegistrationStatus.WAITLISTED ? registrationId : null
        );
      }

      if (nextStatus !== current.registration_status) {
        await recordActivityEventSafely(
          {
            type: 'event_registration_updated',
            title: 'Event registration updated',
            description: this.buildRegistrationDescription(nextStatus, {
              previousStatus: current.registration_status,
              action: 'updated',
            }),
            userId: context.actorUserId ?? null,
            entityType: 'event',
            entityId: current.event_id,
            relatedEntityType: 'contact',
            relatedEntityId: current.contact_id,
            sourceTable: 'event_registrations',
            sourceRecordId: registrationId,
            metadata: {
              eventId: current.event_id,
              eventName: event.event_name,
              registrationId,
              previousStatus: current.registration_status,
              nextStatus,
              registrationStatus: nextStatus,
              occurrenceId: current.occurrence_id,
              caseId: linkedCase.caseId,
              caseNumber: linkedCase.caseNumber,
              caseTitle: linkedCase.caseTitle,
              source: context.source || 'staff',
            },
          },
          client,
          {
            eventId: current.event_id,
            contactId: current.contact_id,
            source: context.source || 'staff-registration-update',
          }
        );
      }

      await client.query('COMMIT');

      const updated = await this.getRegistrationById(registrationId);
      if (!updated) {
        throw new Error('Registration not found');
      }

      if (
        nextStatus !== current.registration_status &&
        isRegistrationCountedAsActive(nextStatus)
      ) {
        await this.maybeSendConfirmationEmail(
          registrationId,
          context.actorUserId ?? null,
          nextStatus,
          true
        );
      }

      if (promotedRegistrationId) {
        await this.confirmations.sendRegistrationConfirmationEmail(
          promotedRegistrationId,
          context.actorUserId ?? null
        );
      }

      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkInAttendee(
    registrationId: string,
    options: CheckInOptions = {}
  ): Promise<CheckInResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const registrationResult = await client.query<LockedRegistrationRow>(
        `SELECT
           er.id as registration_id,
           er.event_id,
           er.occurrence_id,
           er.contact_id,
           er.case_id,
           er.registration_status,
           er.waitlist_position,
           er.checked_in,
           er.series_enrollment_id
         FROM event_registrations er
         WHERE er.id = $1
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

      try {
        assertRegistrationCheckInAllowed(registrationRow.registration_status);
      } catch (error) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Registration cannot be checked in',
        };
      }

      const event = await this.getEventRow(registrationRow.event_id, client);
      const occurrence = await this.getLockedOccurrence(
        registrationRow.event_id,
        registrationRow.occurrence_id,
        client
      );
      if (!event || !occurrence) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Event not found' };
      }

      try {
        this.support.assertCheckInAllowed({
          id: occurrence.occurrence_id,
          start_date: occurrence.start_date,
          end_date: occurrence.end_date,
          status: occurrence.status,
          capacity: occurrence.capacity,
          registered_count: occurrence.registered_count,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Check-in is currently unavailable',
        };
      }

      const method = options.method || 'manual';
      const checkedInBy = options.checkedInBy ?? null;
      const linkedCase = await this.resolveCaseLink(
        client,
        registrationRow.case_id,
        registrationRow.contact_id
      );

      await client.query(
        `UPDATE event_registrations
         SET checked_in = true,
             check_in_time = CURRENT_TIMESTAMP,
             checked_in_by = $2,
             check_in_method = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [registrationId, checkedInBy, method]
      );

      await this.recalculateCounts(registrationRow.event_id, registrationRow.occurrence_id, client);

      await recordActivityEventSafely(
        {
          type: 'event_check_in',
          title: 'Event attendee checked in',
          description: 'An attendee was checked in to an event',
          userId: checkedInBy,
          entityType: 'event',
          entityId: registrationRow.event_id,
          relatedEntityType: 'contact',
          relatedEntityId: registrationRow.contact_id,
          sourceTable: 'event_registrations',
          sourceRecordId: registrationId,
          metadata: {
            eventId: registrationRow.event_id,
            eventName: event.event_name,
            occurrenceId: registrationRow.occurrence_id,
            registrationId,
            registrationStatus: registrationRow.registration_status,
            caseId: linkedCase.caseId,
            caseNumber: linkedCase.caseNumber,
            caseTitle: linkedCase.caseTitle,
            checkedIn: true,
            method,
            checkInMethod: method,
          },
        },
        client,
        {
          eventId: registrationRow.event_id,
          contactId: registrationRow.contact_id,
          source: 'staff-check-in',
        }
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Successfully checked in',
        registration: (await this.getRegistrationById(registrationId)) ?? undefined,
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

      const registrationResult = await client.query<LockedRegistrationRow>(
        `SELECT
           er.id as registration_id,
           er.event_id,
           er.occurrence_id,
           er.contact_id,
           er.case_id,
           er.registration_status,
           er.waitlist_position,
           er.checked_in,
           er.series_enrollment_id
         FROM event_registrations er
         WHERE er.id = $1
         FOR UPDATE`,
        [registrationId]
      );

      const registration = registrationResult.rows[0];
      if (!registration) {
        throw new Error('Registration not found');
      }

      const event = await this.getEventRow(registration.event_id, client);
      const occurrence = await this.getLockedOccurrence(
        registration.event_id,
        registration.occurrence_id,
        client
      );
      if (!event || !occurrence) {
        throw new Error('Event not found');
      }

      await client.query('DELETE FROM event_registrations WHERE id = $1', [registrationId]);
      await this.recalculateCounts(registration.event_id, registration.occurrence_id, client);

      const promotedRegistrationId = await this.maybePromoteWaitlistedRegistration(
        client,
        event,
        occurrence,
        null
      );

      await client.query('COMMIT');

      if (promotedRegistrationId) {
        await this.confirmations.sendRegistrationConfirmationEmail(promotedRegistrationId, null);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEventCheckInSettings(
    eventId: string,
    occurrenceId?: string
  ): Promise<EventCheckInSettings | null> {
    const occurrence = await this.occurrences.resolveOccurrence(eventId, occurrenceId);
    if (!occurrence) {
      return null;
    }

    return {
      event_id: eventId,
      occurrence_id: occurrence.occurrence_id,
      public_checkin_enabled: occurrence.public_checkin_enabled,
      public_checkin_pin_configured: occurrence.public_checkin_pin_configured,
      public_checkin_pin_rotated_at: occurrence.public_checkin_pin_rotated_at,
    };
  }

  async updateEventCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null> {
    const occurrence = await this.occurrences.resolveOccurrence(eventId, data.occurrence_id);
    if (!occurrence) {
      return null;
    }

    const result = await this.pool.query<EventCheckInSettings>(
      `UPDATE event_occurrences
       SET public_checkin_enabled = $1,
           modified_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING
         event_id,
         id as occurrence_id,
         public_checkin_enabled,
         (public_checkin_pin_hash IS NOT NULL) as public_checkin_pin_configured,
         public_checkin_pin_rotated_at`,
      [data.public_checkin_enabled, userId, occurrence.occurrence_id]
    );

    return result.rows[0] ?? null;
  }

  async rotateEventCheckInPin(
    eventId: string,
    userId: string,
    occurrenceId?: string
  ): Promise<RotateEventCheckInPinResult> {
    const occurrence = await this.occurrences.resolveOccurrence(eventId, occurrenceId);
    if (!occurrence) {
      throw new Error('Event not found');
    }

    const pin = String(randomInt(100000, 1000000));
    const pinHash = await bcrypt.hash(pin, PASSWORD.BCRYPT_SALT_ROUNDS);

    const result = await this.pool.query<EventCheckInSettings>(
      `UPDATE event_occurrences
       SET public_checkin_enabled = true,
           public_checkin_pin_hash = $1,
           public_checkin_pin_rotated_at = CURRENT_TIMESTAMP,
           modified_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING
         event_id,
         id as occurrence_id,
         public_checkin_enabled,
         (public_checkin_pin_hash IS NOT NULL) as public_checkin_pin_configured,
         public_checkin_pin_rotated_at`,
      [pinHash, userId, occurrence.occurrence_id]
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

      const event = await this.getEventRow(eventId, client);
      if (!event) {
        throw new Error('Event not found');
      }

      const resolvedOccurrence = await this.occurrences.resolveOccurrence(eventId, data.occurrence_id, client);
      if (!resolvedOccurrence) {
        throw new Error('Occurrence not found');
      }

      const occurrence = await this.getLockedOccurrence(eventId, resolvedOccurrence.occurrence_id, client);
      if (!occurrence) {
        throw new Error('Occurrence not found');
      }

      this.support.assertCheckInAllowed({
        id: occurrence.occurrence_id,
        start_date: occurrence.start_date,
        end_date: occurrence.end_date,
        status: occurrence.status,
        capacity: occurrence.capacity,
        registered_count: occurrence.registered_count,
      });

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

      const existingRegistration = await this.getExistingOccurrenceRegistration(
        occurrence.occurrence_id,
        contactId,
        client,
        true
      );

      let createdRegistration = false;
      let registrationId: string;
      let registrationStatus: RegistrationStatus;

      if (!existingRegistration) {
        const desiredStatus = data.registration_status || RegistrationStatus.REGISTERED;
        assertRegistrationCheckInAllowed(desiredStatus);

        const { registrationStatus: resolvedStatus, waitlistPosition } =
          await this.determineRegistrationStatus(occurrence, desiredStatus, client);
        const created = await this.createRegistrationRecord(client, {
          eventId,
          occurrenceId: occurrence.occurrence_id,
          contactId,
          caseId: null,
          registrationStatus: resolvedStatus,
          waitlistPosition,
          notes: data.notes?.trim() || null,
        });

        await recordActivityEventSafely(
          {
            type: 'event_registration',
            title: 'Event registration',
            description: this.buildRegistrationDescription(resolvedStatus),
            userId: checkedInBy,
            entityType: 'event',
            entityId: eventId,
            relatedEntityType: 'contact',
            relatedEntityId: contactId,
            sourceTable: 'event_registrations',
            sourceRecordId: created.registration_id,
            metadata: {
              eventId,
              eventName: event.event_name,
              occurrenceId: created.occurrence_id,
              registrationId: created.registration_id,
              registrationStatus: resolvedStatus,
              walkIn: true,
              source: 'walk-in',
            },
          },
          client,
          {
            eventId,
            contactId,
            source: 'walk-in-registration',
          }
        );

        await this.recalculateCounts(eventId, occurrence.occurrence_id, client);
        createdRegistration = true;
        registrationId = created.registration_id;
        registrationStatus = created.registration_status;
      } else {
        registrationId = existingRegistration.registration_id;
        registrationStatus = existingRegistration.registration_status;
      }

      const current = await this.getRegistrationByIdInternal(registrationId, client);
      if (!current) {
        throw new Error('Registration not found');
      }

      if (current.checked_in) {
        await client.query('COMMIT');
        return {
          status: 'already_checked_in',
          contact_id: contactId,
          registration: current,
          created_contact: createdContact,
          created_registration: createdRegistration,
        };
      }

      assertRegistrationCheckInAllowed(current.registration_status);

      await client.query(
        `UPDATE event_registrations
         SET checked_in = true,
             check_in_time = CURRENT_TIMESTAMP,
             checked_in_by = $2,
             check_in_method = 'manual',
             notes = COALESCE($3, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [registrationId, checkedInBy, data.notes?.trim() || null]
      );

      await this.recalculateCounts(eventId, occurrence.occurrence_id, client);

      await recordActivityEventSafely(
        {
          type: 'event_check_in',
          title: 'Event attendee checked in',
          description: 'A walk-in attendee was checked in to an event',
          userId: checkedInBy,
          entityType: 'event',
          entityId: eventId,
          relatedEntityType: 'contact',
          relatedEntityId: contactId,
          sourceTable: 'event_registrations',
          sourceRecordId: registrationId,
          metadata: {
            eventId,
            eventName: event.event_name,
            occurrenceId: occurrence.occurrence_id,
            registrationId,
            registrationStatus,
            walkIn: true,
            createdRegistration,
            checkedIn: true,
            method: 'manual',
            checkInMethod: 'manual',
          },
        },
        client,
        {
          eventId,
          contactId,
          source: 'walk-in-check-in',
        }
      );

      await client.query('COMMIT');

      const updated = (await this.getRegistrationById(registrationId)) as EventRegistration;
      if (createdRegistration && isRegistrationCountedAsActive(updated.registration_status)) {
        await this.maybeSendConfirmationEmail(
          registrationId,
          checkedInBy,
          updated.registration_status,
          data.send_confirmation_email
        );
      }

      return {
        status: createdRegistration ? 'created_and_checked_in' : 'existing_checked_in',
        contact_id: contactId,
        registration: updated,
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

  async sendRegistrationConfirmationEmail(
    registrationId: string,
    sentBy: string | null
  ) {
    return this.confirmations.sendRegistrationConfirmationEmail(registrationId, sentBy);
  }
}
