import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import {
  EventCheckInSettings,
  RotateEventCheckInPinResult,
  UpdateEventCheckInSettingsDTO,
} from '@app-types/event';
import { PASSWORD } from '@config/constants';
import { createEventHttpError } from '../eventHttpErrors';
import {
  EventRegistrationServiceContext,
  rotateCheckInPinRecord,
  updateCheckInSettingsRecord,
} from './eventRegistrationService.helpers';

export const getEventCheckInSettingsQuery = async (
  ctx: EventRegistrationServiceContext,
  eventId: string,
  occurrenceId?: string
): Promise<EventCheckInSettings | null> => {
  const occurrence = await ctx.occurrences.resolveOccurrence(eventId, occurrenceId);
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
};

export const updateEventCheckInSettingsMutation = async (
  ctx: EventRegistrationServiceContext,
  eventId: string,
  data: UpdateEventCheckInSettingsDTO,
  userId: string
): Promise<EventCheckInSettings | null> => {
  const occurrence = await ctx.occurrences.resolveOccurrence(eventId, data.occurrence_id);
  if (!occurrence) {
    return null;
  }

  return updateCheckInSettingsRecord(
    ctx.pool,
    occurrence.occurrence_id,
    data.public_checkin_enabled,
    userId
  );
};

export const rotateEventCheckInPinMutation = async (
  ctx: EventRegistrationServiceContext,
  eventId: string,
  userId: string,
  occurrenceId?: string
): Promise<RotateEventCheckInPinResult> => {
  const occurrence = await ctx.occurrences.resolveOccurrence(eventId, occurrenceId);
  if (!occurrence) {
    throw createEventHttpError('EVENT_NOT_FOUND', 404, 'Event not found');
  }

  const pin = String(randomInt(100000, 1000000));
  const pinHash = await bcrypt.hash(pin, PASSWORD.BCRYPT_SALT_ROUNDS);
  const settings = await rotateCheckInPinRecord(ctx.pool, occurrence.occurrence_id, pinHash, userId);
  if (!settings) {
    throw createEventHttpError('EVENT_NOT_FOUND', 404, 'Event not found');
  }

  return { ...settings, pin };
};
