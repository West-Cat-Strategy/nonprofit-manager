import { format, parseISO } from 'date-fns';
import type { BookingCalendarEntry } from '../../../../components/calendar/BookingCalendarView';
import type {
  PortalAppointmentSlot,
  PortalAppointmentSummary,
  PortalEvent,
} from '../../types/contracts';

export type { BookingCalendarEntry };

export type CalendarFilter = 'all' | 'events' | 'appointments' | 'slots';

export type PortalCalendarEntryMeta =
  | { kind: 'event'; event: PortalEvent }
  | { kind: 'appointment'; appointment: PortalAppointmentSummary }
  | { kind: 'slot'; slot: PortalAppointmentSlot };

export const toDateKey = (isoValue: string): string => format(parseISO(isoValue), 'yyyy-MM-dd');

export const buildDefaultLocalValue = (date: Date, hour: number): string => {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return format(next, "yyyy-MM-dd'T'HH:mm");
};

export const toIsoFromLocal = (value: string): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

export const entryKindLabel: Record<PortalCalendarEntryMeta['kind'], string> = {
  event: 'Event',
  appointment: 'Appointment',
  slot: 'Available Time',
};

export const normalizeEventEntry = (
  event: PortalEvent
): BookingCalendarEntry<PortalCalendarEntryMeta> => ({
  id: `event:${event.id}`,
  kind: 'event',
  title: event.name,
  start: event.occurrence_start_date ?? event.start_date,
  end: event.occurrence_end_date ?? event.end_date,
  status: event.registration_id ? (event.registration_status ?? 'registered') : event.event_type,
  location: event.location_name,
  metadata: { kind: 'event', event },
});

export const normalizeAppointmentEntry = (
  appointment: PortalAppointmentSummary
): BookingCalendarEntry<PortalCalendarEntryMeta> => ({
  id: `appointment:${appointment.id}`,
  kind: 'appointment',
  title: appointment.title,
  start: appointment.start_time,
  end: appointment.end_time,
  status: appointment.status,
  location: appointment.location,
  metadata: { kind: 'appointment', appointment },
});

export const normalizeSlotEntry = (
  slot: PortalAppointmentSlot
): BookingCalendarEntry<PortalCalendarEntryMeta> => ({
  id: `slot:${slot.id}`,
  kind: 'slot',
  title: slot.title || 'Appointment time',
  start: slot.start_time,
  end: slot.end_time,
  status: slot.status,
  location: slot.location,
  metadata: { kind: 'slot', slot },
});
