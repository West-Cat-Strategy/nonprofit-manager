import { format } from 'date-fns';
import type { BookingCalendarEntry } from '../../../components/calendar/BookingCalendarView';
import type { EventOccurrence } from '../../../types/event';
import type {
  PortalAdminAppointmentInboxItem,
  PortalAppointmentSlot,
} from '../../adminOps/contracts';
import { createEventDetailTarget } from '../navigation/eventRouteTargets';
import { getEventOccurrenceLabel, getOccurrenceDateRange } from '../utils/occurrences';
import { formatDateParam, parseValidIsoDate } from './staffCalendarQuery';

export type StaffCalendarEntryMeta =
  | { kind: 'event'; occurrence: EventOccurrence }
  | { kind: 'appointment'; appointment: PortalAdminAppointmentInboxItem }
  | { kind: 'slot'; slot: PortalAppointmentSlot };

export type StaffCalendarEntry = BookingCalendarEntry<StaffCalendarEntryMeta>;

export const entryKindLabel: Record<StaffCalendarEntryMeta['kind'], string> = {
  event: 'Event',
  appointment: 'Appointment',
  slot: 'Open Slot',
};

export const formatEventType = (value: string | undefined): string => {
  if (!value) {
    return 'Event';
  }

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const buildEventDetailHref = (
  occurrence: EventOccurrence,
  options: { tab?: 'overview' | 'schedule' | 'registrations'; returnTo?: string | null } = {}
): string =>
  createEventDetailTarget(occurrence.event_id, {
    tab: options.tab,
    occurrenceId: occurrence.occurrence_id,
    returnTo: options.returnTo,
  });

export const normalizeOccurrenceEntry = (
  occurrence: EventOccurrence
): StaffCalendarEntry => ({
  id: `event:${occurrence.event_id}:${occurrence.occurrence_id}`,
  kind: 'event',
  title: occurrence.event_name || occurrence.occurrence_name || 'Event',
  start: occurrence.start_date,
  end: occurrence.end_date,
  status: occurrence.status,
  location: occurrence.location_name,
  metadata: { kind: 'event', occurrence },
});

export const normalizeAppointmentEntry = (
  appointment: PortalAdminAppointmentInboxItem
): StaffCalendarEntry => ({
  id: `appointment:${appointment.id}`,
  kind: 'appointment',
  title: appointment.title,
  start: appointment.start_time,
  end: appointment.end_time,
  status: appointment.status,
  location: appointment.location,
  metadata: { kind: 'appointment', appointment },
});

export const normalizeSlotEntry = (slot: PortalAppointmentSlot): StaffCalendarEntry => ({
  id: `slot:${slot.id}`,
  kind: 'slot',
  title: slot.title || 'Appointment slot',
  start: slot.start_time,
  end: slot.end_time,
  status: slot.status,
  location: slot.location,
  metadata: { kind: 'slot', slot },
});

export const buildStaffCalendarEntries = (
  occurrences: EventOccurrence[],
  appointments: PortalAdminAppointmentInboxItem[],
  slots: PortalAppointmentSlot[]
): StaffCalendarEntry[] =>
  [
    ...occurrences.map(normalizeOccurrenceEntry),
    ...appointments.map(normalizeAppointmentEntry),
    ...slots.map(normalizeSlotEntry),
  ].sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());

export const getSelectedDateEntries = (
  entries: StaffCalendarEntry[],
  selectedDate: Date
): StaffCalendarEntry[] => {
  const key = formatDateParam(selectedDate);
  return entries.filter((entry) => {
    const entryDate = parseValidIsoDate(entry.start);
    return entryDate ? format(entryDate, 'yyyy-MM-dd') === key : false;
  });
};

export { getEventOccurrenceLabel, getOccurrenceDateRange };
