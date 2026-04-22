import {
  CheckInOptions,
  CheckInResult,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  RegistrationStatus,
} from '@app-types/event';
import { createEventHttpError } from '../eventHttpErrors';
import {
  assertRegistrationCheckInAllowed,
  isRegistrationCountedAsActive,
  recordActivityEventSafely,
} from './shared';
import { logger } from '@config/logger';
import {
  buildRegistrationDescription,
  createRegistrationRecord,
  determineRegistrationStatus,
  EventRegistrationServiceContext,
  getEventRow,
  getExistingOccurrenceRegistration,
  getLockedOccurrence,
  getRegistrationByIdInternal,
  maybeSendConfirmationEmail,
  recalculateCounts,
  resolveCaseLink,
  type LockedRegistrationRow,
} from './eventRegistrationService.helpers';
import { setTransactionUserContext } from './tenancy';

const runPostCommitActionSafely = async (
  action: () => Promise<void>,
  context: Record<string, unknown>
): Promise<void> => {
  try {
    await action();
  } catch (error) {
    logger.warn('Failed to complete event confirmation side effect after commit', {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const normalizeCheckInMutationError = (error: unknown): Error => {
  if (!(error instanceof Error)) {
    return new Error('Unexpected event check-in failure');
  }

  const candidate = error as Error & { code?: unknown; statusCode?: unknown };
  if (typeof candidate.code === 'string' && typeof candidate.statusCode === 'number') {
    return error;
  }

  if (error.message === 'Event not found') {
    return createEventHttpError('EVENT_NOT_FOUND', 404, error.message);
  }

  if (error.message === 'Occurrence not found') {
    return createEventHttpError('OCCURRENCE_NOT_FOUND', 404, error.message);
  }

  if (
    error.message === 'Event is at full capacity' ||
    error.message === 'Event is not accepting check-ins' ||
    error.message === 'Waitlisted registrations cannot be checked in' ||
    error.message === 'No-show registrations cannot be checked in' ||
    error.message === 'Cancelled registrations cannot be checked in' ||
    error.message.startsWith('Check-in is available')
  ) {
    return createEventHttpError('CHECKIN_ERROR', 400, error.message);
  }

  if (error.message === 'Registration not found') {
    return createEventHttpError('REGISTRATION_NOT_FOUND', 404, error.message);
  }

  return error;
};

export const checkInAttendeeMutation = async (
  ctx: EventRegistrationServiceContext,
  registrationId: string,
  options: CheckInOptions = {}
): Promise<CheckInResult> => {
  const client = await ctx.pool.connect();

  try {
    await client.query('BEGIN');
    await setTransactionUserContext(client, options.actorUserId ?? options.checkedInBy ?? null);

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

    const event = await getEventRow(ctx, registrationRow.event_id, client);
    const occurrence = await getLockedOccurrence(
      ctx,
      registrationRow.event_id,
      registrationRow.occurrence_id,
      client
    );
    if (!event || !occurrence) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Event not found' };
    }

    try {
      ctx.support.assertCheckInAllowed({
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
    const linkedCase = await resolveCaseLink(
      registrationRow.case_id,
      registrationRow.contact_id,
      client
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

    await recalculateCounts(ctx, registrationRow.event_id, registrationRow.occurrence_id, client);

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

    const updatedRegistration = await getRegistrationByIdInternal(registrationId, client);
    if (!updatedRegistration) {
      throw new Error('Registration not found');
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Successfully checked in',
      registration: updatedRegistration,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw normalizeCheckInMutationError(error);
  } finally {
    client.release();
  }
};

export const walkInCheckInMutation = async (
  ctx: EventRegistrationServiceContext,
  eventId: string,
  data: EventWalkInCheckInDTO,
  checkedInBy: string
): Promise<EventWalkInCheckInResult> => {
  const client = await ctx.pool.connect();
  let walkInResult: EventWalkInCheckInResult | undefined;
  let walkInContactId: string | null | undefined;
  let walkInRegistrationId: string | undefined;
  const postCommitActions: Array<() => Promise<void>> = [];

  try {
    await client.query('BEGIN');
    await setTransactionUserContext(client, checkedInBy);

    const event = await getEventRow(ctx, eventId, client);
    if (!event) {
      throw new Error('Event not found');
    }

    const resolvedOccurrence = await ctx.occurrences.resolveOccurrence(
      eventId,
      data.occurrence_id,
      client
    );
    if (!resolvedOccurrence) {
      throw new Error('Occurrence not found');
    }

    const occurrence = await getLockedOccurrence(
      ctx,
      eventId,
      resolvedOccurrence.occurrence_id,
      client
    );
    if (!occurrence) {
      throw new Error('Occurrence not found');
    }

    ctx.support.assertCheckInAllowed({
      id: occurrence.occurrence_id,
      start_date: occurrence.start_date,
      end_date: occurrence.end_date,
      status: occurrence.status,
      capacity: occurrence.capacity,
      registered_count: occurrence.registered_count,
    });

    let createdContact = false;
    let contactId = await ctx.support.resolveContactIdByIdentity(client, {
      email: data.email,
      phone: data.phone,
    }, event.organization_id);
    walkInContactId = contactId;

    if (!contactId) {
      contactId = await ctx.support.createWalkInContact(client, {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        accountId: event.organization_id,
        createdBy: checkedInBy,
      });
      walkInContactId = contactId;
      createdContact = true;
    }

    const existingRegistration = await getExistingOccurrenceRegistration(
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
        await determineRegistrationStatus(occurrence, desiredStatus, client);
      const created = await createRegistrationRecord(
        {
          eventId,
          occurrenceId: occurrence.occurrence_id,
          contactId,
          caseId: null,
          registrationStatus: resolvedStatus,
          waitlistPosition,
          notes: data.notes?.trim() || null,
        },
        client
      );

      await recordActivityEventSafely(
        {
          type: 'event_registration',
          title: 'Event registration',
          description: buildRegistrationDescription(resolvedStatus),
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

      await recalculateCounts(ctx, eventId, occurrence.occurrence_id, client);
      createdRegistration = true;
      registrationId = created.registration_id;
      registrationStatus = created.registration_status;
      walkInRegistrationId = registrationId;
    } else {
      registrationId = existingRegistration.registration_id;
      registrationStatus = existingRegistration.registration_status;
      walkInRegistrationId = registrationId;
    }

    const current = await getRegistrationByIdInternal(registrationId, client);
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

    await recalculateCounts(ctx, eventId, occurrence.occurrence_id, client);

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

    const updated = await getRegistrationByIdInternal(registrationId, client);
    if (!updated) {
      throw new Error('Registration not found');
    }

    await client.query('COMMIT');
    if (createdRegistration && isRegistrationCountedAsActive(updated.registration_status)) {
      postCommitActions.push(() =>
        maybeSendConfirmationEmail(
          ctx,
          registrationId,
          checkedInBy,
          updated.registration_status,
          data.send_confirmation_email
        )
      );
    }

    walkInResult = {
      status: createdRegistration ? 'created_and_checked_in' : 'existing_checked_in',
      contact_id: contactId,
      registration: updated,
      created_contact: createdContact,
      created_registration: createdRegistration,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw normalizeCheckInMutationError(error);
  } finally {
    client.release();
  }

  for (const action of postCommitActions) {
    await runPostCommitActionSafely(action, {
      eventId,
      contactId: walkInContactId,
      registrationId: walkInRegistrationId,
      source: 'walk-in-check-in',
    });
  }

  if (!walkInResult) {
    throw new Error('Walk-in check-in failed unexpectedly');
  }

  return walkInResult;
};
