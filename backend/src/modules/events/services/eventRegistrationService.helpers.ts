import { Pool, type PoolClient } from 'pg';
import { EventCheckInSettings, EventRegistration, RegistrationStatus } from '@app-types/event';
import { logger } from '@config/logger';
import { EventConfirmationService } from './eventConfirmationService';
import { EventOccurrenceService } from './eventOccurrenceService';
import { createEventHttpError } from '../eventHttpErrors';
import {
  EventCheckInWindowEventRow,
  EventParticipantSupport,
  QueryValue,
  isRegistrationCountedAsActive,
  recordActivityEventSafely,
} from './shared';
import { appendAccountScopeCondition } from './tenancy';

export interface EventRegistrationCaseLink {
  caseId: string | null;
  caseNumber: string | null;
  caseTitle: string | null;
}

export interface EventRow {
  event_id: string;
  event_name: string;
}

export interface LockedOccurrenceRow extends EventCheckInWindowEventRow {
  occurrence_id: string;
  event_id: string;
  occurrence_name: string;
  waitlist_enabled: boolean;
  public_checkin_enabled: boolean;
  public_checkin_pin_hash: string | null;
  public_checkin_pin_rotated_at: Date | null;
}

export interface LockedRegistrationRow {
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

export type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

export interface EventRegistrationServiceContext {
  pool: Pool;
  support: EventParticipantSupport;
  occurrences: EventOccurrenceService;
  confirmations: EventConfirmationService;
}

const REGISTRATION_COLUMNS_SELECT = `
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
    er.updated_at
`;

const REGISTRATION_ROW_SELECT = `
  SELECT
    ${REGISTRATION_COLUMNS_SELECT.trim()}
  FROM event_registrations er
`;

export const REGISTRATION_SELECT = `
  SELECT
    ${REGISTRATION_COLUMNS_SELECT.trim()},
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

export const buildRegistrationDescription = (
  status: RegistrationStatus,
  options?: {
    previousStatus?: RegistrationStatus;
    action?: 'created' | 'updated' | 'promoted';
  }
): string => {
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
};

export const resolveCaseLink = async (
  caseId: string | null | undefined,
  contactId: string,
  queryable: Queryable
): Promise<EventRegistrationCaseLink> => {
  if (!caseId) {
    return {
      caseId: null,
      caseNumber: null,
      caseTitle: null,
    };
  }

  const result = await queryable.query<{
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
    throw createEventHttpError(
      'VALIDATION_ERROR',
      400,
      'Case must belong to the same contact as the registration'
    );
  }

  return {
    caseId: row.id,
    caseNumber: row.case_number,
    caseTitle: row.title,
  };
};

export const getEventRow = async (
  ctx: EventRegistrationServiceContext,
  eventId: string,
  queryable: Queryable = ctx.pool
): Promise<EventRow | null> => {
  const result = await queryable.query<EventRow>(
    `SELECT id as event_id, name as event_name
     FROM events
     WHERE id = $1
     LIMIT 1`,
    [eventId]
  );

  return result.rows[0] ?? null;
};

export const getLockedOccurrence = async (
  ctx: EventRegistrationServiceContext,
  eventId: string,
  occurrenceId: string,
  queryable: Queryable = ctx.pool
): Promise<LockedOccurrenceRow | null> => {
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
};

export const getRegistrationByIdInternal = async (
  registrationId: string,
  queryable: Queryable
): Promise<EventRegistration | null> => {
  const result = await queryable.query<EventRegistration>(
    `${REGISTRATION_SELECT}
     WHERE er.id = $1
     LIMIT 1`,
    [registrationId]
  );

  return result.rows[0] ?? null;
};

export const getExistingOccurrenceRegistration = async (
  occurrenceId: string,
  contactId: string,
  queryable: Queryable,
  lock = false
): Promise<EventRegistration | null> => {
  const lockClause = lock ? 'FOR UPDATE' : '';
  const result = await queryable.query<EventRegistration>(
    `${REGISTRATION_ROW_SELECT}
     WHERE er.occurrence_id = $1
       AND er.contact_id = $2
     LIMIT 1
     ${lockClause}`,
    [occurrenceId, contactId]
  );

  return result.rows[0] ?? null;
};

export const getNextWaitlistPosition = async (
  occurrenceId: string,
  queryable: Queryable
): Promise<number> => {
  const result = await queryable.query<{ next_position: number }>(
    `SELECT COALESCE(MAX(waitlist_position), 0)::int + 1 as next_position
     FROM event_registrations
     WHERE occurrence_id = $1
       AND registration_status = 'waitlisted'`,
    [occurrenceId]
  );

  return result.rows[0]?.next_position ?? 1;
};

export const determineRegistrationStatus = async (
  occurrence: LockedOccurrenceRow,
  requestedStatus: RegistrationStatus | undefined,
  queryable: Queryable
): Promise<{
  registrationStatus: RegistrationStatus;
  waitlistPosition: number | null;
}> => {
  const desiredStatus = requestedStatus ?? RegistrationStatus.REGISTERED;
  const wantsActiveStatus =
    desiredStatus === RegistrationStatus.REGISTERED ||
    desiredStatus === RegistrationStatus.CONFIRMED;

  if (desiredStatus === RegistrationStatus.WAITLISTED) {
    return {
      registrationStatus: RegistrationStatus.WAITLISTED,
      waitlistPosition: await getNextWaitlistPosition(occurrence.occurrence_id, queryable),
    };
  }

  if (
    wantsActiveStatus &&
    occurrence.capacity &&
    occurrence.registered_count >= occurrence.capacity
  ) {
    if (!occurrence.waitlist_enabled) {
      throw createEventHttpError('EVENT_FULL', 400, 'Event is at full capacity');
    }

    return {
      registrationStatus: RegistrationStatus.WAITLISTED,
      waitlistPosition: await getNextWaitlistPosition(occurrence.occurrence_id, queryable),
    };
  }

  return {
    registrationStatus: desiredStatus,
    waitlistPosition: null,
  };
};

export const recalculateCounts = async (
  ctx: EventRegistrationServiceContext,
  eventId: string,
  occurrenceId: string,
  queryable: Queryable
): Promise<void> => {
  await ctx.occurrences.recalculateOccurrenceCounts(occurrenceId, queryable);
  await ctx.occurrences.recalculateEventCounts(eventId, queryable);
};

export const createSeriesEnrollment = async (
  eventId: string,
  contactId: string,
  registrationStatus: RegistrationStatus,
  notes: string | null,
  userId: string | null,
  queryable: Queryable
): Promise<string> => {
  const result = await queryable.query<{ enrollment_id: string }>(
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
};

export const createRegistrationRecord = async (
  registration: {
    eventId: string;
    occurrenceId: string;
    contactId: string;
    caseId: string | null;
    registrationStatus: RegistrationStatus;
    waitlistPosition: number | null;
    notes: string | null;
    seriesEnrollmentId?: string | null;
  },
  queryable: Queryable
): Promise<EventRegistration> => {
  const result = await queryable.query<{ registration_id: string }>(
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
      registration.eventId,
      registration.occurrenceId,
      registration.contactId,
      registration.caseId,
      registration.seriesEnrollmentId ?? null,
      registration.registrationStatus,
      registration.waitlistPosition,
      registration.notes,
    ]
  );

  return (await getRegistrationByIdInternal(
    result.rows[0]!.registration_id,
    queryable
  )) as EventRegistration;
};

export const maybePromoteWaitlistedRegistration = async (
  ctx: EventRegistrationServiceContext,
  queryable: Queryable,
  event: EventRow,
  occurrence: LockedOccurrenceRow,
  actorUserId: string | null,
  excludeRegistrationId?: string | null
): Promise<string | null> => {
  if (!occurrence.waitlist_enabled) {
    return null;
  }

  const refreshedOccurrence = await getLockedOccurrence(
    ctx,
    occurrence.event_id,
    occurrence.occurrence_id,
    queryable
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

  const candidateResult = await queryable.query<{
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

  await queryable.query(
    `UPDATE event_registrations
     SET registration_status = 'registered',
         waitlist_position = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [candidate.registration_id]
  );

  const linkedCase = await resolveCaseLink(candidate.case_id, candidate.contact_id, queryable);
  await recordActivityEventSafely(
    {
      type: 'event_registration_updated',
      title: 'Event registration updated',
      description: buildRegistrationDescription(RegistrationStatus.REGISTERED, {
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
    queryable,
    {
      eventId: event.event_id,
      contactId: candidate.contact_id,
      source: 'waitlist-promotion',
    }
  );

  await recalculateCounts(ctx, event.event_id, occurrence.occurrence_id, queryable);
  return candidate.registration_id;
};

export const listFutureSeriesOccurrences = async (
  eventId: string,
  fromDate: Date,
  queryable: Queryable
): Promise<LockedOccurrenceRow[]> => {
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
};

export const maybeSendConfirmationEmail = async (
  ctx: EventRegistrationServiceContext,
  registrationId: string,
  sentBy: string | null,
  registrationStatus: RegistrationStatus,
  explicitPreference?: boolean
): Promise<void> => {
  if (explicitPreference === false || !isRegistrationCountedAsActive(registrationStatus)) {
    return;
  }

  try {
    await ctx.confirmations.sendRegistrationConfirmationEmail(registrationId, sentBy);
  } catch (error) {
    logger.warn('Failed to send event registration confirmation email', {
      registrationId,
      sentBy,
      registrationStatus,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getRegistrationByToken = async (
  queryable: Queryable,
  eventId: string,
  token: string
): Promise<EventRegistration | null> => {
  const result = await queryable.query<EventRegistration>(
    `${REGISTRATION_SELECT}
     WHERE er.event_id = $1
       AND er.check_in_token = $2
     LIMIT 1`,
    [eventId, token]
  );

  return result.rows[0] ?? null;
};

export const getRegistrationByTokenGlobal = async (
  queryable: Queryable,
  token: string,
  scopeAccountIds?: string[]
): Promise<EventRegistration | null> => {
  const params: QueryValue[] = [token];
  const conditions: string[] = ['er.check_in_token = $1'];

  appendAccountScopeCondition(
    conditions,
    params,
    scopeAccountIds ? { accountIds: scopeAccountIds } : undefined,
    'e.organization_id'
  );

  const result = await queryable.query<EventRegistration>(
    `${REGISTRATION_SELECT}
     WHERE ${conditions.join(' AND ')}
     LIMIT 1`,
    params
  );

  return result.rows[0] ?? null;
};

export const getEventRegistrationsQuery = async (
  queryable: Queryable,
  eventId: string,
  filters: {
    occurrence_id?: string;
    registration_status?: RegistrationStatus;
    checked_in?: boolean;
  } = {}
): Promise<EventRegistration[]> => {
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

  const result = await queryable.query<EventRegistration>(
    `${REGISTRATION_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY eo.start_date ASC, er.created_at DESC`,
    params
  );

  return result.rows;
};

export const getContactRegistrationsQuery = async (
  queryable: Queryable,
  contactId: string,
  scopeAccountIds?: string[]
): Promise<EventRegistration[]> => {
  const conditions: string[] = ['er.contact_id = $1'];
  const params: QueryValue[] = [contactId];

  appendAccountScopeCondition(
    conditions,
    params,
    scopeAccountIds ? { accountIds: scopeAccountIds } : undefined,
    'e.organization_id'
  );

  const result = await queryable.query<EventRegistration>(
    `${REGISTRATION_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY eo.start_date DESC, er.created_at DESC`,
    params
  );

  return result.rows;
};

export const updateCheckInSettingsRecord = async (
  queryable: Queryable,
  occurrenceId: string,
  publicCheckinEnabled: boolean,
  userId: string
): Promise<EventCheckInSettings | null> => {
  const result = await queryable.query<EventCheckInSettings>(
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
    [publicCheckinEnabled, userId, occurrenceId]
  );

  return result.rows[0] ?? null;
};

export const rotateCheckInPinRecord = async (
  queryable: Queryable,
  occurrenceId: string,
  pinHash: string,
  userId: string
): Promise<EventCheckInSettings | null> => {
  const result = await queryable.query<EventCheckInSettings>(
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
    [pinHash, userId, occurrenceId]
  );

  return result.rows[0] ?? null;
};
