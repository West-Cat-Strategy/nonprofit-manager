import {
  CreateRegistrationDTO,
  EventConfirmationEmailResult,
  EventRegistration,
  EventRegistrationMutationContext,
  RegistrationStatus,
  UpdateRegistrationDTO,
} from '@app-types/event';
import { logger } from '@config/logger';
import {
  getRegistrationCountDelta,
  isRegistrationCountedAsActive,
  QueryValue,
  recordActivityEventSafely,
} from './shared';
import { createEventHttpError } from '../eventHttpErrors';
import {
  buildRegistrationDescription,
  createRegistrationRecord,
  createSeriesEnrollment,
  determineRegistrationStatus,
  EventRegistrationServiceContext,
  getEventRow,
  getExistingOccurrenceRegistration,
  getLockedOccurrence,
  getNextWaitlistPosition,
  getRegistrationByIdInternal,
  listFutureSeriesOccurrences,
  maybePromoteWaitlistedRegistration,
  maybeSendConfirmationEmail,
  recalculateCounts,
  resolveCaseLink,
  type LockedRegistrationRow,
} from './eventRegistrationService.helpers';

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

const normalizeRegistrationMutationError = (error: unknown): Error => {
  if (!(error instanceof Error)) {
    return new Error('Unexpected event mutation failure');
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
    error.message === 'Contact is already registered for this event series' ||
    error.message === 'Contact is already registered for this occurrence'
  ) {
    return createEventHttpError('ALREADY_REGISTERED', 409, error.message);
  }

  if (
    error.message === 'No fields to update' ||
    error.message === 'Case must belong to the same contact as the registration' ||
    error.message === 'Event is at full capacity' ||
    error.message.startsWith('Checked-in attendees cannot be moved to')
  ) {
    return createEventHttpError('VALIDATION_ERROR', 400, error.message);
  }

  if (error.message === 'Registration not found') {
    return createEventHttpError('REGISTRATION_NOT_FOUND', 404, error.message);
  }

  return error;
};

export const registerContactMutation = async (
  ctx: EventRegistrationServiceContext,
  registrationData: CreateRegistrationDTO,
  context: EventRegistrationMutationContext = {}
): Promise<EventRegistration> => {
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
  const client = await ctx.pool.connect();
  let primaryRegistration: EventRegistration | null = null;
  let resolvedRegistration: EventRegistration | undefined;
  const postCommitActions: Array<() => Promise<void>> = [];

  try {
    await client.query('BEGIN');

    const event = await getEventRow(ctx, event_id, client);
    if (!event) {
      throw new Error('Event not found');
    }

    const resolvedOccurrence = await ctx.occurrences.resolveOccurrence(event_id, occurrence_id, client);
    if (!resolvedOccurrence) {
      throw new Error('Occurrence not found');
    }

    const linkedCase = await resolveCaseLink(case_id, contact_id, client);
    const pendingConfirmationIds: string[] = [];

    if (enrollment_scope === 'series') {
      const futureOccurrences = await listFutureSeriesOccurrences(
        event_id,
        new Date(resolvedOccurrence.start_date),
        client
      );
      const enrollmentId = await createSeriesEnrollment(
        event_id,
        contact_id,
        registration_status ?? RegistrationStatus.REGISTERED,
        notes?.trim() || null,
        context.actorUserId ?? null,
        client
      );

      for (const candidate of futureOccurrences) {
        const existing = await getExistingOccurrenceRegistration(
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

        const lockedCandidate = await getLockedOccurrence(ctx, event_id, candidate.occurrence_id, client);
        if (!lockedCandidate) {
          continue;
        }

        const { registrationStatus, waitlistPosition } = await determineRegistrationStatus(
          lockedCandidate,
          registration_status,
          client
        );
        const created = await createRegistrationRecord(
          {
            eventId: event_id,
            occurrenceId: lockedCandidate.occurrence_id,
            contactId: contact_id,
            caseId: linkedCase.caseId,
            registrationStatus,
            waitlistPosition,
            notes: notes?.trim() || null,
            seriesEnrollmentId: enrollmentId,
          },
          client
        );

        if (candidate.occurrence_id === resolvedOccurrence.occurrence_id || !primaryRegistration) {
          primaryRegistration = created;
        }

        await recordActivityEventSafely(
          {
            type: 'event_registration',
            title: 'Event registration',
            description: buildRegistrationDescription(registrationStatus),
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

        await recalculateCounts(ctx, event_id, lockedCandidate.occurrence_id, client);
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
      if (confirmationTargetId && primaryRegistration) {
        const confirmationTargetStatus = primaryRegistration.registration_status;
        postCommitActions.push(() =>
          maybeSendConfirmationEmail(
            ctx,
            confirmationTargetId,
            context.actorUserId ?? null,
            confirmationTargetStatus,
            send_confirmation_email
          )
        );
      }

      resolvedRegistration = primaryRegistration;
    }

    const lockedOccurrence = await getLockedOccurrence(
      ctx,
      event_id,
      resolvedOccurrence.occurrence_id,
      client
    );
    if (!lockedOccurrence) {
      throw new Error('Occurrence not found');
    }

    const existing = await getExistingOccurrenceRegistration(
      lockedOccurrence.occurrence_id,
      contact_id,
      client,
      true
    );
    if (existing) {
      throw new Error('Contact is already registered for this occurrence');
    }

    const { registrationStatus, waitlistPosition } = await determineRegistrationStatus(
      lockedOccurrence,
      registration_status,
      client
    );
    const created = await createRegistrationRecord(
      {
        eventId: event_id,
        occurrenceId: lockedOccurrence.occurrence_id,
        contactId: contact_id,
        caseId: linkedCase.caseId,
        registrationStatus,
        waitlistPosition,
        notes: notes?.trim() || null,
      },
      client
    );

    await recordActivityEventSafely(
      {
        type: 'event_registration',
        title: 'Event registration',
        description: buildRegistrationDescription(registrationStatus),
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

    await recalculateCounts(ctx, event_id, lockedOccurrence.occurrence_id, client);
    await client.query('COMMIT');
    postCommitActions.push(() =>
      maybeSendConfirmationEmail(
        ctx,
        created.registration_id,
        context.actorUserId ?? null,
        registrationStatus,
        send_confirmation_email
      )
    );

    resolvedRegistration = created;
  } catch (error) {
    await client.query('ROLLBACK');
    throw normalizeRegistrationMutationError(error);
  } finally {
    client.release();
  }

  for (const action of postCommitActions) {
    await runPostCommitActionSafely(action, {
      eventId: event_id,
      contactId: contact_id,
      source: context.source || 'staff-registration',
    });
  }

  if (!resolvedRegistration) {
    throw new Error('Registration not found');
  }

  return resolvedRegistration;
};

export const updateRegistrationMutation = async (
  ctx: EventRegistrationServiceContext,
  registrationId: string,
  updateData: UpdateRegistrationDTO,
  context: EventRegistrationMutationContext = {}
): Promise<EventRegistration> => {
  const client = await ctx.pool.connect();
  let updatedRegistration: EventRegistration | undefined;
  let currentEventId: string | undefined;
  let currentContactId: string | undefined;
  const postCommitActions: Array<() => Promise<void>> = [];

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
    currentEventId = current.event_id;
    currentContactId = current.contact_id;

    const event = await getEventRow(ctx, current.event_id, client);
    if (!event) {
      throw new Error('Event not found');
    }

    const occurrence = await getLockedOccurrence(
      ctx,
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
    const linkedCase = await resolveCaseLink(resolvedCaseId, current.contact_id, client);

    const fields: string[] = [];
    const values: QueryValue[] = [];
    let paramCount = 1;

    if (updateData.registration_status !== undefined) {
      fields.push(`registration_status = $${paramCount++}`);
      values.push(updateData.registration_status);
      if (updateData.registration_status === RegistrationStatus.WAITLISTED) {
        const waitlistPosition = await getNextWaitlistPosition(current.occurrence_id, client);
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

    await recalculateCounts(ctx, current.event_id, current.occurrence_id, client);

    let promotedRegistrationId: string | null = null;
    if (
      current.registration_status !== RegistrationStatus.WAITLISTED &&
      nextStatus === RegistrationStatus.CANCELLED
    ) {
      promotedRegistrationId = await maybePromoteWaitlistedRegistration(
        ctx,
        client,
        event,
        occurrence,
        context.actorUserId ?? null,
        registrationId
      );
    } else if (countDelta < 0) {
      promotedRegistrationId = await maybePromoteWaitlistedRegistration(
        ctx,
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
          description: buildRegistrationDescription(nextStatus, {
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

    const updated = await getRegistrationByIdInternal(registrationId, client);
    if (!updated) {
      throw new Error('Registration not found');
    }
    updatedRegistration = updated;

    if (nextStatus !== current.registration_status && isRegistrationCountedAsActive(nextStatus)) {
      postCommitActions.push(() =>
        maybeSendConfirmationEmail(
          ctx,
          registrationId,
          context.actorUserId ?? null,
          nextStatus,
          true
        )
      );
    }

    if (promotedRegistrationId) {
      postCommitActions.push(() =>
        maybeSendConfirmationEmail(
          ctx,
          promotedRegistrationId,
          context.actorUserId ?? null,
          RegistrationStatus.REGISTERED,
          true
        )
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw normalizeRegistrationMutationError(error);
  } finally {
    client.release();
  }

  for (const action of postCommitActions) {
    await runPostCommitActionSafely(action, {
      eventId: currentEventId ?? registrationId,
      contactId: currentContactId,
      source: context.source || 'staff-registration-update',
    });
  }

  if (!updatedRegistration) {
    throw new Error('Registration not found');
  }

  return updatedRegistration;
};

export const cancelRegistrationMutation = async (
  ctx: EventRegistrationServiceContext,
  registrationId: string
): Promise<void> => {
  const client = await ctx.pool.connect();
  let promotedRegistrationId: string | null | undefined;
  const postCommitActions: Array<() => Promise<void>> = [];

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

    const event = await getEventRow(ctx, registration.event_id, client);
    const occurrence = await getLockedOccurrence(
      ctx,
      registration.event_id,
      registration.occurrence_id,
      client
    );
    if (!event || !occurrence) {
      throw new Error('Event not found');
    }

    await client.query('DELETE FROM event_registrations WHERE id = $1', [registrationId]);
    await recalculateCounts(ctx, registration.event_id, registration.occurrence_id, client);

    promotedRegistrationId = await maybePromoteWaitlistedRegistration(
      ctx,
      client,
      event,
      occurrence,
      null
    );

    await client.query('COMMIT');
    if (promotedRegistrationId) {
      const promotedTargetId = promotedRegistrationId;
      postCommitActions.push(() =>
        maybeSendConfirmationEmail(ctx, promotedTargetId, null, RegistrationStatus.REGISTERED, true)
      );
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  for (const action of postCommitActions) {
    await runPostCommitActionSafely(action, {
      registrationId,
      promotedRegistrationId,
      source: 'cancel-registration',
    });
  }
};

export const sendRegistrationConfirmationEmailMutation = (
  ctx: EventRegistrationServiceContext,
  registrationId: string,
  sentBy: string | null
): Promise<EventConfirmationEmailResult> =>
  ctx.confirmations.sendRegistrationConfirmationEmail(registrationId, sentBy);
