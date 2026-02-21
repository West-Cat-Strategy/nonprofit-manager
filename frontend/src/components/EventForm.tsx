/**
 * EventForm Component
 * Reusable form for creating and editing events
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { eventsApiClient } from '../features/events/api/eventsApiClient';
import type {
  Event,
  CreateEventDTO,
  UpdateEventDTO,
  CreateEventReminderAutomationDTO,
  EventReminderAutomation,
  SyncEventReminderAutomationsDTO,
} from '../types/event';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

interface EventFormProps {
  event?: Event | null;
  onSubmit: (eventData: CreateEventDTO | UpdateEventDTO) => Promise<Event | void>;
  isEdit?: boolean;
}

type ReminderRelativeUnit = 'minutes' | 'hours' | 'days';

interface ReminderRowFormState {
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

interface UserPreferencesResponse {
  preferences?: {
    timezone?: string;
    organization?: {
      timezone?: string;
    };
  };
}

const MAX_CUSTOM_MESSAGE_LENGTH = 500;

const getBrowserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const createReminderId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toMinutes = (value: number, unit: ReminderRelativeUnit): number => {
  if (unit === 'days') return value * 24 * 60;
  if (unit === 'hours') return value * 60;
  return value;
};

const toRelativeDisplay = (
  minutes: number | null
): { value: number; unit: ReminderRelativeUnit } => {
  if (!minutes || minutes <= 0) {
    return { value: 60, unit: 'minutes' };
  }

  if (minutes % 1440 === 0) {
    return { value: minutes / 1440, unit: 'days' };
  }

  if (minutes % 60 === 0) {
    return { value: minutes / 60, unit: 'hours' };
  }

  return { value: minutes, unit: 'minutes' };
};

const parseDateTimeLocalInput = (
  value: string
): { year: number; month: number; day: number; hour: number; minute: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = match;
  return {
    year: Number.parseInt(yearRaw, 10),
    month: Number.parseInt(monthRaw, 10),
    day: Number.parseInt(dayRaw, 10),
    hour: Number.parseInt(hourRaw, 10),
    minute: Number.parseInt(minuteRaw, 10),
  };
};

const getTimeZoneOffsetMinutes = (timeZone: string, date: Date): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number.parseInt(parts.year, 10),
    Number.parseInt(parts.month, 10) - 1,
    Number.parseInt(parts.day, 10),
    Number.parseInt(parts.hour, 10),
    Number.parseInt(parts.minute, 10),
    Number.parseInt(parts.second, 10)
  );

  return (asUtc - date.getTime()) / 60000;
};

const convertZonedDateTimeToUtcIso = (localDateTime: string, timeZone: string): string => {
  const parsed = parseDateTimeLocalInput(localDateTime);
  if (!parsed) {
    throw new Error('Exact reminder datetime must be valid');
  }

  const utcGuess = Date.UTC(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    parsed.hour,
    parsed.minute,
    0
  );

  const firstOffset = getTimeZoneOffsetMinutes(timeZone, new Date(utcGuess));
  let utcTimestamp = utcGuess - firstOffset * 60_000;

  const secondOffset = getTimeZoneOffsetMinutes(timeZone, new Date(utcTimestamp));
  if (secondOffset !== firstOffset) {
    utcTimestamp = utcGuess - secondOffset * 60_000;
  }

  return new Date(utcTimestamp).toISOString();
};

const formatDateTimeLocalInTimeZone = (value: string, timeZone: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const createDefaultReminderRow = (timezone: string): ReminderRowFormState => ({
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

const mapAutomationToReminderRow = (
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

const EventForm: React.FC<EventFormProps> = ({ event, onSubmit, isEdit = false }) => {
  const navigate = useNavigate();
  const isTestEnv = import.meta.env.MODE === 'test';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [organizationTimezone, setOrganizationTimezone] = useState<string>(getBrowserTimeZone());
  const [automationRows, setAutomationRows] = useState<ReminderRowFormState[]>([]);
  const [automationRowsLoading, setAutomationRowsLoading] = useState(false);
  const [reminderSyncError, setReminderSyncError] = useState<string | null>(null);
  const [savedEventIdForRetry, setSavedEventIdForRetry] = useState<string | null>(null);
  const [retryingReminderSync, setRetryingReminderSync] = useState(false);

  const [formData, setFormData] = useState<CreateEventDTO | UpdateEventDTO>({
    event_name: '',
    description: '',
    event_type: 'other' as const,
    status: 'planned' as const,
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
    country: 'USA',
    capacity: undefined,
  });

  useEffect(() => {
    if (isTestEnv) {
      return;
    }

    let isMounted = true;

    const loadTimezone = async () => {
      try {
        const response = await api.get<UserPreferencesResponse>('/auth/preferences');
        const prefs = response.data?.preferences;

        const timezoneFromOrganization = prefs?.organization?.timezone?.trim();
        const timezoneFromRoot = prefs?.timezone?.trim();
        const resolvedTimezone =
          timezoneFromOrganization || timezoneFromRoot || getBrowserTimeZone();

        if (isMounted) {
          setOrganizationTimezone(resolvedTimezone);
        }
      } catch {
        if (isMounted) {
          setOrganizationTimezone(getBrowserTimeZone());
        }
      }
    };

    void loadTimezone();

    return () => {
      isMounted = false;
    };
  }, [isTestEnv]);

  useEffect(() => {
    if (event) {
      setFormData({
        event_name: event.event_name,
        description: event.description || '',
        event_type: event.event_type,
        status: event.status,
        is_public: event.is_public,
        is_recurring: event.is_recurring,
        recurrence_pattern: event.recurrence_pattern || 'weekly',
        recurrence_interval: event.recurrence_interval || 1,
        recurrence_end_date: event.recurrence_end_date
          ? event.recurrence_end_date.substring(0, 16)
          : '',
        start_date: event.start_date.substring(0, 16),
        end_date: event.end_date.substring(0, 16),
        location_name: event.location_name || '',
        address_line1: event.address_line1 || '',
        address_line2: event.address_line2 || '',
        city: event.city || '',
        state_province: event.state_province || '',
        postal_code: event.postal_code || '',
        country: event.country || 'USA',
        capacity: event.capacity || undefined,
      });
      setIsDirty(false);
      setReminderSyncError(null);
      setSavedEventIdForRetry(null);
    }
  }, [event]);

  useEffect(() => {
    if (isTestEnv || !event?.event_id) {
      return;
    }

    let isMounted = true;

    const loadReminderAutomations = async () => {
      setAutomationRowsLoading(true);
      try {
        if (!isMounted) return;
        const automations = await eventsApiClient.listReminderAutomations(event.event_id);
        const pendingRows = automations
          .filter((item) => item.is_active && !item.attempted_at)
          .map((item) => mapAutomationToReminderRow(item, organizationTimezone));

        setAutomationRows(pendingRows);
      } catch {
        if (isMounted) {
          setAutomationRows([]);
        }
      } finally {
        if (isMounted) {
          setAutomationRowsLoading(false);
        }
      }
    };

    void loadReminderAutomations();

    return () => {
      isMounted = false;
    };
  }, [event?.event_id, organizationTimezone, isTestEnv]);

  useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty && !loading && !retryingReminderSync,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const { name, value } = target;
    setIsDirty(true);
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
        ...(name === 'is_recurring' && !target.checked
          ? {
              recurrence_pattern: undefined,
              recurrence_interval: undefined,
              recurrence_end_date: undefined,
            }
          : {}),
      }));
      return;
    }

    if (name === 'capacity' || name === 'recurrence_interval') {
      const parsed = value === '' ? undefined : Number.parseInt(value, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: Number.isNaN(parsed) ? undefined : parsed,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateReminderRow = (
    rowId: string,
    updates: Partial<ReminderRowFormState>
  ): void => {
    setIsDirty(true);
    setAutomationRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row))
    );
  };

  const addReminderRow = (): void => {
    setIsDirty(true);
    setAutomationRows((prev) => [...prev, createDefaultReminderRow(organizationTimezone)]);
  };

  const removeReminderRow = (rowId: string): void => {
    setIsDirty(true);
    setAutomationRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const buildReminderSyncPayload = (): SyncEventReminderAutomationsDTO => {
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

  const syncReminderAutomations = async (eventId: string): Promise<void> => {
    const payload = buildReminderSyncPayload();
    await eventsApiClient.syncReminderAutomations(eventId, payload);
  };

  const handleRetryReminderSync = async () => {
    if (!savedEventIdForRetry) return;

    setRetryingReminderSync(true);
    setReminderSyncError(null);

    try {
      await syncReminderAutomations(savedEventIdForRetry);
      setSavedEventIdForRetry(null);
      setIsDirty(false);
      navigate('/events');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to synchronize automated reminders';
      setReminderSyncError(
        `Event is saved, but reminder sync failed again: ${message}`
      );
    } finally {
      setRetryingReminderSync(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReminderSyncError(null);
    setLoading(true);

    try {
      const startDate = formData.start_date ? new Date(formData.start_date) : null;
      const endDate = formData.end_date ? new Date(formData.end_date) : null;
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }

      const normalizedData: CreateEventDTO | UpdateEventDTO = {
        ...formData,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };

      if (!normalizedData.is_recurring) {
        normalizedData.recurrence_pattern = undefined;
        normalizedData.recurrence_interval = undefined;
        normalizedData.recurrence_end_date = undefined;
      } else if (normalizedData.recurrence_end_date) {
        normalizedData.recurrence_end_date = new Date(
          normalizedData.recurrence_end_date
        ).toISOString();
      } else {
        normalizedData.recurrence_end_date = undefined;
      }

      const savedEvent = await onSubmit(normalizedData);
      const eventId = savedEvent?.event_id || event?.event_id || null;

      if (!eventId && automationRows.length > 0) {
        throw new Error('Event was saved, but reminder sync could not run due to missing event id');
      }

      if (eventId) {
        try {
          await syncReminderAutomations(eventId);
          setSavedEventIdForRetry(null);
          setIsDirty(false);
          navigate('/events');
          return;
        } catch (syncError: unknown) {
          const message =
            syncError instanceof Error ? syncError.message : 'Failed to synchronize automated reminders';
          setSavedEventIdForRetry(eventId);
          setReminderSyncError(
            `Event details were saved, but automated reminders could not be synchronized: ${message}`
          );
          setIsDirty(true);
          return;
        }
      }

      setIsDirty(false);
      navigate('/events');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-app-surface shadow-md rounded-lg p-6">
      {error && <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {reminderSyncError && (
        <div className="p-4 bg-amber-100 text-amber-800 rounded-md">
          <p>{reminderSyncError}</p>
          {savedEventIdForRetry && (
            <button
              type="button"
              onClick={handleRetryReminderSync}
              disabled={retryingReminderSync}
              className="mt-3 px-4 py-2 bg-amber-700 text-white rounded-md hover:bg-amber-800 disabled:opacity-60"
            >
              {retryingReminderSync ? 'Retrying...' : 'Retry Reminder Sync'}
            </button>
          )}
        </div>
      )}

      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="event_name" className="block text-sm font-medium mb-1">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Annual Fundraising Gala"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Event description..."
            />
          </div>

          <div>
            <label htmlFor="event_type" className="block text-sm font-medium mb-1">
              Event Type <span className="text-red-500">*</span>
            </label>
            <select
              id="event_type"
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
            >
              <option value="fundraiser">Fundraiser</option>
              <option value="community">Community</option>
              <option value="training">Training</option>
              <option value="meeting">Meeting</option>
              <option value="workshop">Workshop</option>
              <option value="webinar">Webinar</option>
              <option value="conference">Conference</option>
              <option value="outreach">Outreach</option>
              <option value="volunteer">Volunteer</option>
              <option value="social">Social</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Date & Time</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium mb-1">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium mb-1">
              End Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Visibility */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Visibility</h3>
        <label className="inline-flex items-center gap-3">
          <input
            type="checkbox"
            id="is_public"
            name="is_public"
            checked={Boolean(formData.is_public)}
            onChange={handleChange}
            className="h-4 w-4"
          />
          <span className="text-sm">
            Public event (visible for public sharing and registration workflows)
          </span>
        </label>
      </div>

      {/* Recurrence */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recurrence</h3>
        <label className="inline-flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="is_recurring"
            name="is_recurring"
            checked={Boolean(formData.is_recurring)}
            onChange={handleChange}
            className="h-4 w-4"
          />
          <span className="text-sm">This is a recurring event</span>
        </label>

        {formData.is_recurring && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="recurrence_pattern" className="block text-sm font-medium mb-1">
                Pattern
              </label>
              <select
                id="recurrence_pattern"
                name="recurrence_pattern"
                value={formData.recurrence_pattern || 'weekly'}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label htmlFor="recurrence_interval" className="block text-sm font-medium mb-1">
                Every
              </label>
              <input
                type="number"
                id="recurrence_interval"
                name="recurrence_interval"
                value={formData.recurrence_interval || 1}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="recurrence_end_date" className="block text-sm font-medium mb-1">
                Ends On (Optional)
              </label>
              <input
                type="datetime-local"
                id="recurrence_end_date"
                name="recurrence_end_date"
                value={formData.recurrence_end_date || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md"
              />
            </div>
          </div>
        )}
      </div>

      {/* Automated Reminders */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Automated Reminders</h3>
            <p className="text-sm text-app-text-muted mt-1">
              Create one or more automated reminder attempts. Exact reminders are interpreted in
              organization timezone: <span className="font-medium">{organizationTimezone}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={addReminderRow}
            className="px-4 py-2 border rounded-md hover:bg-app-surface-muted"
          >
            Add Reminder
          </button>
        </div>

        {automationRowsLoading ? (
          <p className="text-sm text-app-text-muted">Loading scheduled reminders...</p>
        ) : automationRows.length === 0 ? (
          <p className="text-sm text-app-text-muted">
            No automated reminders configured. You can still send manual reminders from event detail.
          </p>
        ) : (
          <div className="space-y-4">
            {automationRows.map((row, index) => (
              <div key={row.id} className="rounded-lg border border-app-border p-4 bg-app-surface-muted">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Reminder {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeReminderRow(row.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Timing Mode</label>
                    <select
                      value={row.timingType}
                      onChange={(e) => {
                        const timingType = e.target.value as 'relative' | 'absolute';
                        updateReminderRow(row.id, {
                          timingType,
                          absoluteLocalDateTime:
                            timingType === 'absolute' && !row.absoluteLocalDateTime
                              ? formData.start_date || ''
                              : row.absoluteLocalDateTime,
                        });
                      }}
                      className="w-full px-4 py-2 border rounded-md"
                    >
                      <option value="relative">Before Event Start</option>
                      <option value="absolute">Exact Date & Time</option>
                    </select>
                  </div>

                  {row.timingType === 'relative' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor={`reminder-relative-value-${row.id}`}
                          className="block text-sm font-medium mb-1"
                        >
                          Quantity
                        </label>
                        <input
                          type="number"
                          id={`reminder-relative-value-${row.id}`}
                          value={row.relativeValue}
                          min="1"
                          onChange={(e) =>
                            updateReminderRow(row.id, {
                              relativeValue:
                                e.target.value === '' ? 0 : Number.parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full px-4 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`reminder-relative-unit-${row.id}`}
                          className="block text-sm font-medium mb-1"
                        >
                          Unit
                        </label>
                        <select
                          id={`reminder-relative-unit-${row.id}`}
                          value={row.relativeUnit}
                          onChange={(e) =>
                            updateReminderRow(row.id, {
                              relativeUnit: e.target.value as ReminderRelativeUnit,
                            })
                          }
                          className="w-full px-4 py-2 border rounded-md"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor={`reminder-absolute-send-at-${row.id}`}
                        className="block text-sm font-medium mb-1"
                      >
                        Send At (Exact)
                      </label>
                      <input
                        type="datetime-local"
                        id={`reminder-absolute-send-at-${row.id}`}
                        value={row.absoluteLocalDateTime}
                        onChange={(e) =>
                          updateReminderRow(row.id, {
                            absoluteLocalDateTime: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border rounded-md"
                      />
                      <p className="text-xs text-app-text-muted mt-1">
                        Interpreted in {row.timezone}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-app-text">
                    <input
                      type="checkbox"
                      checked={row.sendEmail}
                      onChange={(e) => updateReminderRow(row.id, { sendEmail: e.target.checked })}
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-app-text">
                    <input
                      type="checkbox"
                      checked={row.sendSms}
                      onChange={(e) => updateReminderRow(row.id, { sendSms: e.target.checked })}
                    />
                    SMS
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Custom Message (Optional)</label>
                  <textarea
                    value={row.customMessage}
                    onChange={(e) => updateReminderRow(row.id, { customMessage: e.target.value })}
                    rows={3}
                    maxLength={MAX_CUSTOM_MESSAGE_LENGTH}
                    className="w-full px-4 py-2 border rounded-md"
                    placeholder="Add event-specific details for attendees..."
                  />
                  <p className="text-xs text-app-text-muted mt-1">
                    {row.customMessage.length}/{MAX_CUSTOM_MESSAGE_LENGTH}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="location_name" className="block text-sm font-medium mb-1">Location Name</label>
            <input
              type="text"
              id="location_name"
              name="location_name"
              value={formData.location_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Community Center"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address_line1" className="block text-sm font-medium mb-1">Address Line 1</label>
            <input
              type="text"
              id="address_line1"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="123 Main Street"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address_line2" className="block text-sm font-medium mb-1">Address Line 2</label>
            <input
              type="text"
              id="address_line2"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Suite 100"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-1">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Springfield"
            />
          </div>

          <div>
            <label htmlFor="state_province" className="block text-sm font-medium mb-1">State/Province</label>
            <input
              type="text"
              id="state_province"
              name="state_province"
              value={formData.state_province}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="IL"
            />
          </div>

          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium mb-1">Postal Code</label>
            <input
              type="text"
              id="postal_code"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="62701"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-1">Country</label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="USA"
            />
          </div>
        </div>
      </div>

      {/* Capacity */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Capacity</h3>
        <div className="max-w-md">
          <label htmlFor="capacity" className="block text-sm font-medium mb-1">
            Maximum Capacity
            <span className="text-app-text-muted font-normal ml-2">(Leave blank for unlimited)</span>
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            value={formData.capacity || ''}
            onChange={handleChange}
            min="1"
            className="w-full px-4 py-2 border rounded-md"
            placeholder="100"
          />
          <p className="text-sm text-app-text-muted mt-1">
            Set the maximum number of attendees allowed to register for this event.
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="px-6 py-2 border rounded-md hover:bg-app-surface-muted"
          disabled={loading || retryingReminderSync}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:opacity-50"
          disabled={loading || retryingReminderSync}
        >
          {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  );
};

export default EventForm;
