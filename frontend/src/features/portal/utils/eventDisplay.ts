import type { PortalEvent } from '../types/contracts';
import {
  formatPortalDateRange,
  formatPortalOptionalDateTime,
} from './dateDisplay';

export const getPortalEventDateRange = (event: PortalEvent): string => {
  const startDate = event.occurrence_start_date ?? event.start_date;
  const endDate = event.occurrence_end_date ?? event.end_date;
  return formatPortalDateRange(startDate, endDate);
};

export const getPortalEventOccurrenceLabel = (event: PortalEvent): string | null => {
  if (event.occurrence_label && event.occurrence_label.trim().length > 0) {
    return event.occurrence_label.trim();
  }

  if (event.occurrence_name && event.occurrence_name.trim().length > 0) {
    return event.occurrence_name.trim();
  }

  if (event.occurrence_index != null && event.occurrence_count != null) {
    return `Occurrence ${event.occurrence_index} of ${event.occurrence_count}`;
  }

  if (event.occurrence_index != null) {
    return `Occurrence ${event.occurrence_index}`;
  }

  return event.occurrence_id ? 'Single occurrence' : null;
};

export const getPortalEventRegistrationLabel = (
  status: PortalEvent['registration_status']
): string | null => {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'registered':
      return 'Registered';
    case 'waitlisted':
      return 'Waitlisted';
    case 'cancelled':
      return 'Cancelled';
    case 'no_show':
      return 'No show';
    default:
      return null;
  }
};

export const getPortalEventConfirmationLabel = (
  status: PortalEvent['confirmation_email_status']
): string | null => {
  switch (status) {
    case 'pending':
      return 'Confirmation pending';
    case 'sent':
      return 'Confirmation sent';
    case 'failed':
      return 'Confirmation failed';
    case 'skipped':
      return 'Confirmation skipped';
    default:
      return null;
  }
};

export const canShowPortalEventQrPass = (event: PortalEvent): boolean =>
  Boolean(
    event.registration_id &&
    event.check_in_token &&
    event.registration_status !== 'waitlisted' &&
    event.registration_status !== 'cancelled'
  );

export const getPortalEventCheckedInLabel = (event: PortalEvent): string | null =>
  formatPortalOptionalDateTime(event.check_in_time);
