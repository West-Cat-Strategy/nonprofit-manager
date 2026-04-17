import type {
  CreateEventDTO,
  CreateEventReminderAutomationDTO,
  Event,
  EventReminderAutomation,
  EventStatus,
  EventType,
  RecurrencePattern,
  SyncEventReminderAutomationsDTO,
  UpdateEventDTO,
} from '../../../types/event';
import { addHoursToDateTimeLocalValue, toDateTimeLocalValue } from '../utils/editorDateTime';
import {
  convertZonedDateTimeToUtcIso,
  formatDateTimeLocalInTimeZone,
  toMinutes,
  toRelativeDisplay,
} from '../utils/reminderTime';
import type { ReminderRelativeUnit } from '../utils/reminderTime';

export type { ReminderRelativeUnit } from '../utils/reminderTime';

export const MAX_CUSTOM_MESSAGE_LENGTH = 500;
export const DEFAULT_EVENT_DURATION_HOURS = 2;

export interface EventEditorFormData {
  event_name: string;
  description: string;
  event_type: EventType;
  status: EventStatus;
  is_public: boolean;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern;
  recurrence_interval: number | undefined;
  recurrence_end_date: string;
  start_date: string;
  end_date: string;
  location_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  capacity: number | undefined;
}

export interface ReminderRowFormState {
  id: string;
  timingType: 'relative' | 'absolute';
  relativeValue: number;
  relativeUnit: ReminderRelativeUnit;
  absoluteLocalDateTime: string;
  sendEmail: boolean;
  sendSms: boolean;
  customMessage: string;
  timezone: string;
}

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'community', label: 'Community' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'conference', label: 'Conference' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

const EVENT_STATUS_OPTIONS: Array<{ value: EventStatus; label: string }> = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' },
];

const RECURRENCE_OPTIONS: Array<{ value: RecurrencePattern; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const eventEditorSelectOptions = {
  eventTypes: EVENT_TYPE_OPTIONS,
  eventStatuses: EVENT_STATUS_OPTIONS,
  recurrencePatterns: RECURRENCE_OPTIONS,
} as const;

const createReminderId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createEmptyFormData = (): EventEditorFormData => ({
  event_name: '',
  description: '',
  event_type: 'other',
  status: 'planned',
  is_public: false,
  is_recurring: false,
  recurrence_pattern: 'weekly',
  recurrence_interval: 1,
  recurrence_end_date: '',
  start_date: '',
  end_date: '',
  location_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state_province: '',
  postal_code: '',
  country: 'Canada',
  capacity: undefined,
});

export const mapEventToFormData = (event: Event): EventEditorFormData => ({
  event_name: event.event_name,
  description: event.description || '',
  event_type: event.event_type,
  status: event.status,
  is_public: event.is_public,
  is_recurring: event.is_recurring,
  recurrence_pattern: event.recurrence_pattern || 'weekly',
  recurrence_interval: event.recurrence_interval || 1,
  recurrence_end_date: toDateTimeLocalValue(event.recurrence_end_date),
  start_date: toDateTimeLocalValue(event.start_date),
  end_date: toDateTimeLocalValue(event.end_date),
  location_name: event.location_name || '',
  address_line1: event.address_line1 || '',
  address_line2: event.address_line2 || '',
  city: event.city || '',
  state_province: event.state_province || '',
  postal_code: event.postal_code || '',
  country: event.country || 'Canada',
  capacity: event.capacity || undefined,
});

export const createDefaultReminderRow = (timezone: string): ReminderRowFormState => ({
  id: createReminderId(),
  timingType: 'relative',
  relativeValue: 60,
  relativeUnit: 'minutes',
  absoluteLocalDateTime: '',
  sendEmail: true,
  sendSms: true,
  customMessage: '',
  timezone,
});

export const mapAutomationToReminderRow = (
  automation: EventReminderAutomation,
  fallbackTimezone: string
): ReminderRowFormState => {
  const relative = toRelativeDisplay(automation.relative_minutes_before);
  const timezone = automation.timezone || fallbackTimezone;

  return {
    id: createReminderId(),
    timingType: automation.timing_type,
    relativeValue: relative.value,
    relativeUnit: relative.unit,
    absoluteLocalDateTime:
      automation.absolute_send_at && automation.timing_type === 'absolute'
        ? formatDateTimeLocalInTimeZone(automation.absolute_send_at, timezone)
        : '',
    sendEmail: automation.send_email,
    sendSms: automation.send_sms,
    customMessage: automation.custom_message || '',
    timezone,
  };
};

export const deriveAutoManagedEndDate = (startDate: string): string =>
  startDate ? addHoursToDateTimeLocalValue(startDate, DEFAULT_EVENT_DURATION_HOURS) : '';

export const trimToUndefined = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const formatDurationLabel = (minutes: number): string => {
  const safeMinutes = Math.max(minutes, 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${remainingMinutes}m`;
};

export const buildEventSubmitPayload = (
  formData: EventEditorFormData
): CreateEventDTO | UpdateEventDTO => {
  const startDate = formData.start_date ? new Date(formData.start_date) : null;
  const endDate = formData.end_date ? new Date(formData.end_date) : null;

  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required');
  }

  const normalizedData: CreateEventDTO | UpdateEventDTO = {
    event_name: formData.event_name.trim(),
    description: trimToUndefined(formData.description),
    event_type: formData.event_type,
    status: formData.status,
    is_public: formData.is_public,
    is_recurring: formData.is_recurring,
    recurrence_pattern: formData.recurrence_pattern,
    recurrence_interval: formData.recurrence_interval,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    location_name: trimToUndefined(formData.location_name),
    address_line1: trimToUndefined(formData.address_line1),
    address_line2: trimToUndefined(formData.address_line2),
    city: trimToUndefined(formData.city),
    state_province: trimToUndefined(formData.state_province),
    postal_code: trimToUndefined(formData.postal_code),
    country: trimToUndefined(formData.country),
    capacity: formData.capacity,
  };

  if (!normalizedData.is_recurring) {
    normalizedData.recurrence_pattern = undefined;
    normalizedData.recurrence_interval = undefined;
    normalizedData.recurrence_end_date = undefined;
  } else if (formData.recurrence_end_date) {
    normalizedData.recurrence_end_date = new Date(formData.recurrence_end_date).toISOString();
  } else {
    normalizedData.recurrence_end_date = undefined;
  }

  return normalizedData;
};

export const buildReminderSyncPayload = (
  automationRows: ReminderRowFormState[]
): SyncEventReminderAutomationsDTO => {
  const items: CreateEventReminderAutomationDTO[] = automationRows.map((row, index) => {
    if (!row.sendEmail && !row.sendSms) {
      throw new Error(`Reminder ${index + 1}: select at least one channel (email or SMS)`);
    }

    const customMessage = row.customMessage.trim();
    if (customMessage.length > MAX_CUSTOM_MESSAGE_LENGTH) {
      throw new Error(
        `Reminder ${index + 1}: custom message must be ${MAX_CUSTOM_MESSAGE_LENGTH} characters or less`
      );
    }

    if (row.timingType === 'relative') {
      if (!Number.isFinite(row.relativeValue) || row.relativeValue <= 0) {
        throw new Error(`Reminder ${index + 1}: relative timing must be a positive value`);
      }

      return {
        timingType: 'relative',
        relativeMinutesBefore: toMinutes(Math.floor(row.relativeValue), row.relativeUnit),
        sendEmail: row.sendEmail,
        sendSms: row.sendSms,
        customMessage: customMessage || undefined,
        timezone: row.timezone,
      };
    }

    if (!row.absoluteLocalDateTime) {
      throw new Error(`Reminder ${index + 1}: exact datetime is required`);
    }

    return {
      timingType: 'absolute',
      absoluteSendAt: convertZonedDateTimeToUtcIso(row.absoluteLocalDateTime, row.timezone),
      sendEmail: row.sendEmail,
      sendSms: row.sendSms,
      customMessage: customMessage || undefined,
      timezone: row.timezone,
    };
  });

  return { items };
};
