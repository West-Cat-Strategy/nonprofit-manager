export const buildEventRegistrationKioskPath = (eventId: string, occurrenceId?: string | null): string =>
  occurrenceId ? `/event-check-in/${eventId}?occurrence_id=${occurrenceId}` : `/event-check-in/${eventId}`;

export const buildEventRegistrationKioskUrl = (eventId: string, occurrenceId?: string | null): string => {
  const kioskPath = buildEventRegistrationKioskPath(eventId, occurrenceId);

  if (typeof window === 'undefined') {
    return kioskPath;
  }

  return `${window.location.origin}${kioskPath}`;
};
