import {
  format,
  getDate,
  getDaysInMonth,
  isValid,
  parse,
  parseISO,
  setDate,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import type { EventStatus } from '../../../types/event';

export type CalendarScope = 'events' | 'all' | 'appointments' | 'slots';

export const EVENT_TYPE_OPTIONS = [
  ['fundraiser', 'Fundraiser'],
  ['community', 'Community'],
  ['training', 'Training'],
  ['meeting', 'Meeting'],
  ['workshop', 'Workshop'],
  ['webinar', 'Webinar'],
  ['conference', 'Conference'],
  ['outreach', 'Outreach'],
  ['volunteer', 'Volunteer'],
  ['social', 'Social'],
  ['other', 'Other'],
] as const;

export const EVENT_STATUS_OPTIONS: Array<[EventStatus, string]> = [
  ['planned', 'Planned'],
  ['active', 'Active'],
  ['postponed', 'Postponed'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
];

export const SCOPE_OPTIONS: Array<{ value: CalendarScope; label: string }> = [
  { value: 'events', label: 'Events' },
  { value: 'all', label: 'All Items' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'slots', label: 'Open Slots' },
];

export const parseMonthParam = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = parse(value, 'yyyy-MM', new Date());
  return isValid(parsed) ? startOfMonth(parsed) : null;
};

export const parseDateParam = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? startOfDay(parsed) : null;
};

export const parseValidIsoDate = (value: string): Date | null => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

export const formatMonthParam = (value: Date): string => format(startOfMonth(value), 'yyyy-MM');

export const formatDateParam = (value: Date): string => format(startOfDay(value), 'yyyy-MM-dd');

export const normalizeScope = (value: string | null, isAdmin: boolean): CalendarScope => {
  if (!isAdmin) {
    return 'events';
  }

  switch (value) {
    case 'all':
    case 'appointments':
    case 'slots':
    case 'events':
      return value;
    default:
      return 'events';
  }
};

export const normalizeEventStatus = (value: string | null): EventStatus | '' => {
  if (!value) {
    return '';
  }

  return EVENT_STATUS_OPTIONS.some(([status]) => status === value) ? (value as EventStatus) : '';
};

export const getVisibleMonthDate = (month: Date, selectedDate: Date): Date => {
  const selectedDay = getDate(selectedDate);
  const clampedDay = Math.min(selectedDay, getDaysInMonth(month));
  return setDate(startOfMonth(month), clampedDay);
};
