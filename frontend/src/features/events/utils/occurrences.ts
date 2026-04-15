import { format, isValid, parseISO } from 'date-fns';
import type { Event, EventBatchScope, EventOccurrence } from '../../../types/event';

const safeParseDate = (value: string): Date | null => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

export const getEventOccurrenceLabel = (
  occurrence: Pick<EventOccurrence, 'occurrence_index' | 'occurrence_name' | 'start_date'>,
  fallbackIndex = 1
): string => {
  const labelIndex = occurrence.occurrence_index ?? fallbackIndex;
  const dateLabel = safeParseDate(occurrence.start_date)
    ? format(parseISO(occurrence.start_date), 'EEE, MMM d')
    : 'Date TBD';

  if (occurrence.occurrence_name) {
    return `${occurrence.occurrence_name} · ${dateLabel}`;
  }

  return `Occurrence ${labelIndex} · ${dateLabel}`;
};

export const getEventBatchScopeLabel = (scope: EventBatchScope): string => {
  switch (scope) {
    case 'future_occurrences':
      return 'This and future occurrences';
    case 'series':
      return 'Whole series';
    default:
      return 'This occurrence';
  }
};

export const getEventBatchScopeHint = (scope: EventBatchScope): string => {
  switch (scope) {
    case 'future_occurrences':
      return 'Applies from the selected occurrence forward.';
    case 'series':
      return 'Applies to the full series and every generated occurrence.';
    default:
      return 'Applies only to the selected occurrence.';
  }
};

export const getOccurrenceDateRange = (occurrence: Pick<EventOccurrence, 'start_date' | 'end_date'>): string => {
  const start = safeParseDate(occurrence.start_date);
  const end = safeParseDate(occurrence.end_date);

  if (!start || !end) {
    return 'Date TBD';
  }

  return `${format(start, 'PPP p')} - ${format(end, 'p')}`;
};

export const buildEventOccurrences = (event: Event | null | undefined): EventOccurrence[] => {
  if (!event) {
    return [];
  }

  const seriesId = event.series_id ?? event.event_id;
  const fallbackOccurrence: EventOccurrence = {
    occurrence_id: event.next_occurrence_id ?? event.event_id,
    event_id: event.event_id,
    series_id: seriesId,
    occurrence_index: 1,
    occurrence_name: event.event_name,
    start_date: event.start_date,
    end_date: event.end_date,
    status: event.status,
    is_primary: true,
    is_exception: false,
    is_cancelled: event.status === 'cancelled',
    capacity: event.capacity,
    registered_count: event.registered_count,
    attended_count: event.attended_count,
    location_name: event.location_name,
    address_line1: event.address_line1,
    address_line2: event.address_line2,
    city: event.city,
    state_province: event.state_province,
    postal_code: event.postal_code,
    country: event.country,
  };

  const occurrences = (event.occurrences ?? []).map((occurrence, index) => ({
    ...fallbackOccurrence,
    ...occurrence,
    series_id: occurrence.series_id ?? seriesId,
    occurrence_index: occurrence.occurrence_index ?? index + 1,
    occurrence_name: occurrence.occurrence_name ?? event.event_name,
    is_primary: occurrence.is_primary ?? index === 0,
    is_exception: occurrence.is_exception ?? false,
    is_cancelled: occurrence.is_cancelled ?? occurrence.status === 'cancelled',
    capacity: occurrence.capacity ?? event.capacity,
    registered_count: occurrence.registered_count ?? event.registered_count,
    attended_count: occurrence.attended_count ?? event.attended_count,
    location_name: occurrence.location_name ?? event.location_name,
    address_line1: occurrence.address_line1 ?? event.address_line1,
    address_line2: occurrence.address_line2 ?? event.address_line2,
    city: occurrence.city ?? event.city,
    state_province: occurrence.state_province ?? event.state_province,
    postal_code: occurrence.postal_code ?? event.postal_code,
    country: occurrence.country ?? event.country,
  })) satisfies EventOccurrence[];

  if (occurrences.length === 0) {
    return [fallbackOccurrence];
  }

  return occurrences.sort(
    (left, right) =>
      new Date(left.start_date).getTime() - new Date(right.start_date).getTime()
  );
};

export const getEventOccurrenceById = (
  occurrences: EventOccurrence[],
  occurrenceId: string | null | undefined
): EventOccurrence | null => {
  if (!occurrenceId) {
    return occurrences[0] ?? null;
  }

  return occurrences.find((occurrence) => occurrence.occurrence_id === occurrenceId) ?? occurrences[0] ?? null;
};
