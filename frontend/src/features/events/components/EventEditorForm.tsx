import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { differenceInMinutes } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { getUserTimezoneCached } from '../../../services/userPreferencesService';
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
import { eventsApiClient } from '../api/eventsApiClient';
import {
  convertZonedDateTimeToUtcIso,
  formatDateTimeLocalInTimeZone,
  getBrowserTimeZone,
  toMinutes,
  toRelativeDisplay,
  type ReminderRelativeUnit,
} from '../utils/reminderTime';
import { addHoursToDateTimeLocalValue, parseDateTimeLocalValue, toDateTimeLocalValue } from '../utils/editorDateTime';
import {
  staffEventsMetadataBadgeClassName,
  staffEventsPrimaryActionClassName,
  staffEventsSecondaryActionClassName,
} from './StaffEventsPageShell';

export interface EventEditorFormProps {
  event?: Event | null;
  onSubmit: (eventData: CreateEventDTO | UpdateEventDTO) => Promise<Event | void>;
  isEdit?: boolean;
}

interface EventEditorFormData {
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

const MAX_CUSTOM_MESSAGE_LENGTH = 500;
const DEFAULT_EVENT_DURATION_HOURS = 2;

const inputClassName =
  'app-focus-ring w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle focus:outline-none';

const textareaClassName = `${inputClassName} min-h-[120px] resize-y`;
const checkboxClassName = 'app-focus-ring mt-0.5 h-4 w-4 rounded border-app-input-border text-app-accent';

const createReminderId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyFormData = (): EventEditorFormData => ({
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

const mapEventToFormData = (event: Event): EventEditorFormData => ({
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

const trimToUndefined = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const deriveAutoManagedEndDate = (startDate: string): string =>
  startDate ? addHoursToDateTimeLocalValue(startDate, DEFAULT_EVENT_DURATION_HOURS) : '';

const formatDurationLabel = (minutes: number): string => {
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

function EditorSection({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">{title}</h2>
          {description ? (
            <div className="mt-1 text-sm text-app-text-muted">{description}</div>
          ) : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function EventEditorForm({
  event,
  onSubmit,
  isEdit = false,
}: EventEditorFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isEndDateAutoManaged, setIsEndDateAutoManaged] = useState(!isEdit);
  const [organizationTimezone, setOrganizationTimezone] = useState(getBrowserTimeZone());
  const [automationRows, setAutomationRows] = useState<ReminderRowFormState[]>([]);
  const [automationRowsLoading, setAutomationRowsLoading] = useState(false);
  const [reminderSyncError, setReminderSyncError] = useState<string | null>(null);
  const [savedEventIdForRetry, setSavedEventIdForRetry] = useState<string | null>(null);
  const [retryingReminderSync, setRetryingReminderSync] = useState(false);
  const [formData, setFormData] = useState<EventEditorFormData>(() =>
    event ? mapEventToFormData(event) : createEmptyFormData()
  );

  useEffect(() => {
    let isMounted = true;

    const loadTimezone = async () => {
      const fallbackTimezone = getBrowserTimeZone();
      const timezone = await getUserTimezoneCached(fallbackTimezone);
      if (isMounted) {
        setOrganizationTimezone(timezone);
      }
    };

    void loadTimezone();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (event) {
      setFormData(mapEventToFormData(event));
      setIsEndDateAutoManaged(!event.end_date);
    } else if (!isEdit) {
      setFormData(createEmptyFormData());
      setIsEndDateAutoManaged(true);
    }

    setIsDirty(false);
    setReminderSyncError(null);
    setSavedEventIdForRetry(null);
  }, [event, isEdit]);

  useEffect(() => {
    if (!event?.event_id) {
      setAutomationRows([]);
      return;
    }

    let isMounted = true;

    const loadReminderAutomations = async () => {
      setAutomationRowsLoading(true);
      try {
        const automations = await eventsApiClient.listReminderAutomations(event.event_id);
        if (!isMounted) {
          return;
        }

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
  }, [event?.event_id, organizationTimezone]);

  useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty && !loading && !retryingReminderSync,
  });

  const parsedStartDate = useMemo(
    () => parseDateTimeLocalValue(formData.start_date),
    [formData.start_date]
  );
  const parsedEndDate = useMemo(
    () => parseDateTimeLocalValue(formData.end_date),
    [formData.end_date]
  );
  const durationMinutes = useMemo(() => {
    if (!parsedStartDate || !parsedEndDate) {
      return null;
    }

    return differenceInMinutes(parsedEndDate, parsedStartDate);
  }, [parsedEndDate, parsedStartDate]);

  const timeValidationMessage =
    durationMinutes !== null && durationMinutes <= 0
      ? 'End time must be after the start time.'
      : null;

  const scheduleHelperText = !formData.start_date
    ? 'Choose a start date and time to begin the event schedule.'
    : isEndDateAutoManaged
      ? 'End time is auto-set to 2 hours after the start time until you edit it.'
      : 'End time is fixed. Clear the field to restore the 2-hour default.';

  const handleInputChange = (
    eventChange: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = eventChange.target;
    const { name, value } = target;
    setIsDirty(true);

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      const checked = target.checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
        ...(name === 'is_recurring' && !checked
          ? {
              recurrence_pattern: 'weekly' as const,
              recurrence_interval: 1,
              recurrence_end_date: '',
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

    if (name === 'start_date') {
      setFormData((prev) => ({
        ...prev,
        start_date: value,
        end_date: isEndDateAutoManaged ? deriveAutoManagedEndDate(value) : prev.end_date,
      }));
      return;
    }

    if (name === 'end_date') {
      if (!value) {
        setIsEndDateAutoManaged(true);
        setFormData((prev) => ({
          ...prev,
          end_date: prev.start_date ? deriveAutoManagedEndDate(prev.start_date) : '',
        }));
        return;
      }

      setIsEndDateAutoManaged(false);
      setFormData((prev) => ({
        ...prev,
        end_date: value,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateReminderRow = (rowId: string, updates: Partial<ReminderRowFormState>): void => {
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
    if (!savedEventIdForRetry) {
      return;
    }

    setRetryingReminderSync(true);
    setReminderSyncError(null);

    try {
      await syncReminderAutomations(savedEventIdForRetry);
      setSavedEventIdForRetry(null);
      setIsDirty(false);
      navigate('/events');
    } catch (requestError: unknown) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Failed to synchronize automated reminders';
      setReminderSyncError(`Event is saved, but reminder sync failed again: ${message}`);
    } finally {
      setRetryingReminderSync(false);
    }
  };

  const handleSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setError(null);
    setReminderSyncError(null);
    setLoading(true);

    try {
      const startDate = formData.start_date ? new Date(formData.start_date) : null;
      const endDate = formData.end_date ? new Date(formData.end_date) : null;

      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }

      if (timeValidationMessage) {
        throw new Error(timeValidationMessage);
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
        } catch (requestError: unknown) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : 'Failed to synchronize automated reminders';
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
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : null;
      setError(message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {reminderSyncError ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="alert"
        >
          <p>{reminderSyncError}</p>
          {savedEventIdForRetry ? (
            <button
              type="button"
              onClick={handleRetryReminderSync}
              disabled={retryingReminderSync}
              className={`${staffEventsSecondaryActionClassName} mt-3`}
            >
              {retryingReminderSync ? 'Retrying...' : 'Retry reminder sync'}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <EditorSection
            title="Schedule"
            description="Start with timing. New events keep a 2-hour end-time default until you choose a custom end."
            badge={
              durationMinutes && durationMinutes > 0 ? (
                <span className={staffEventsMetadataBadgeClassName}>
                  Duration {formatDurationLabel(durationMinutes)}
                </span>
              ) : null
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text">
                  Start date and time <span className="text-app-accent">*</span>
                </span>
                <input
                  type="datetime-local"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 flex items-center gap-2 font-medium text-app-text">
                  <span>
                    End date and time <span className="text-app-accent">*</span>
                  </span>
                  {isEndDateAutoManaged ? (
                    <span className={staffEventsMetadataBadgeClassName}>Auto</span>
                  ) : null}
                </span>
                <input
                  type="datetime-local"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                />
              </label>
            </div>

            <div className="mt-3 space-y-2" aria-live="polite">
              <p className="text-sm text-app-text-muted">{scheduleHelperText}</p>
              {timeValidationMessage ? (
                <p className="text-sm font-medium text-rose-700">{timeValidationMessage}</p>
              ) : null}
            </div>
          </EditorSection>

          <EditorSection
            title="Details"
            description="Capture the title, audience-facing description, and staff status for this event."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium text-app-text">
                  Event name <span className="text-app-accent">*</span>
                </span>
                <input
                  type="text"
                  id="event_name"
                  name="event_name"
                  value={formData.event_name}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                  placeholder="Annual fundraising gala"
                />
              </label>

              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium text-app-text">Description</span>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  className={textareaClassName}
                  placeholder="Share the event goals, format, and anything staff or attendees should know."
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text">
                  Event type <span className="text-app-accent">*</span>
                </span>
                <select
                  id="event_type"
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                >
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text">
                  Status <span className="text-app-accent">*</span>
                </span>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className={inputClassName}
                >
                  {EVENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </EditorSection>

          <EditorSection
            title="Location"
            description="Add the venue or leave the event virtual or to-be-confirmed for now."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium text-app-text">Location name</span>
                <input
                  type="text"
                  id="location_name"
                  name="location_name"
                  value={formData.location_name}
                  onChange={handleInputChange}
                  className={inputClassName}
                  placeholder="Community centre or online meeting room"
                />
              </label>

              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium text-app-text">Address line 1</span>
                <input
                  type="text"
                  id="address_line1"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleInputChange}
                  className={inputClassName}
                  placeholder="400 West Georgia Street"
                />
              </label>

              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium text-app-text">Address line 2</span>
                <input
                  type="text"
                  id="address_line2"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleInputChange}
                  className={inputClassName}
                  placeholder="Suite or building details"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text">City</span>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={inputClassName}
                  placeholder="Vancouver"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text">State or province</span>
                <input
                  type="text"
                  id="state_province"
                  name="state_province"
                  value={formData.state_province}
                  onChange={handleInputChange}
                  className={inputClassName}
                  placeholder="BC"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text">Postal code</span>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  className={inputClassName}
                  placeholder="V6B 1A1"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text">Country</span>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={inputClassName}
                  placeholder="Canada"
                />
              </label>
            </div>
          </EditorSection>
        </div>

        <div className="space-y-6">
          <EditorSection
            title="Recurrence"
            description="Turn on recurrence when this event represents a series rather than a single date."
          >
            <label className="flex items-start gap-3 rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
              <input
                type="checkbox"
                id="is_recurring"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleInputChange}
                className={checkboxClassName}
              />
              <span>
                <span className="block font-medium text-app-text">Recurring series</span>
                <span className="mt-1 block text-sm text-app-text-muted">
                  Use one event record to manage repeated occurrences and future schedule changes.
                </span>
              </span>
            </label>

            {formData.is_recurring ? (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-app-text">Pattern</span>
                    <select
                      id="recurrence_pattern"
                      name="recurrence_pattern"
                      value={formData.recurrence_pattern}
                      onChange={handleInputChange}
                      className={inputClassName}
                    >
                      {RECURRENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-app-text">Repeat every</span>
                    <input
                      type="number"
                      id="recurrence_interval"
                      name="recurrence_interval"
                      value={formData.recurrence_interval ?? 1}
                      onChange={handleInputChange}
                      min="1"
                      className={inputClassName}
                    />
                  </label>
                </div>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-app-text">Ends on</span>
                  <input
                    type="datetime-local"
                    id="recurrence_end_date"
                    name="recurrence_end_date"
                    value={formData.recurrence_end_date}
                    onChange={handleInputChange}
                    className={inputClassName}
                  />
                </label>
              </div>
            ) : (
              <p className="mt-4 text-sm text-app-text-muted">
                This event will stay on a single date until recurrence is enabled.
              </p>
            )}
          </EditorSection>

          <EditorSection
            title="Visibility"
            description="Decide whether this event is staff-only or appears in public event and registration flows."
          >
            <label className="flex items-start gap-3 rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
              <input
                type="checkbox"
                id="is_public"
                name="is_public"
                checked={formData.is_public}
                onChange={handleInputChange}
                className={checkboxClassName}
              />
              <span>
                <span className="block font-medium text-app-text">Public event</span>
                <span className="mt-1 block text-sm text-app-text-muted">
                  Makes the event available for public sharing, sign-up, and portal or website workflows.
                </span>
              </span>
            </label>
          </EditorSection>

          <EditorSection
            title="Automated reminders"
            description={
              <>
                Schedule reminder attempts ahead of the event. Exact reminders use the organization
                timezone: <span className="font-medium">{organizationTimezone}</span>.
              </>
            }
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addReminderRow}
                className={staffEventsSecondaryActionClassName}
              >
                Add reminder
              </button>
            </div>

            {automationRowsLoading ? (
              <p className="mt-4 text-sm text-app-text-muted">Loading scheduled reminders...</p>
            ) : automationRows.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-app-border bg-app-surface-muted/50 p-4 text-sm text-app-text-muted">
                No automated reminders configured yet. You can still send manual reminders from event detail.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {automationRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-app-border bg-app-surface-muted/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-app-text">Reminder {index + 1}</h3>
                        <p className="mt-1 text-xs text-app-text-muted">
                          Configure when it sends and which channels it should use.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeReminderRow(row.id)}
                        className="text-sm font-medium text-app-text-muted transition-colors hover:text-app-text"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4">
                      <label className="text-sm">
                        <span className="mb-1 block font-medium text-app-text">Timing mode</span>
                        <select
                          value={row.timingType}
                          onChange={(changeEvent) => {
                            const timingType = changeEvent.target.value as 'relative' | 'absolute';
                            updateReminderRow(row.id, {
                              timingType,
                              absoluteLocalDateTime:
                                timingType === 'absolute' && !row.absoluteLocalDateTime
                                  ? formData.start_date || ''
                                  : row.absoluteLocalDateTime,
                            });
                          }}
                          className={inputClassName}
                        >
                          <option value="relative">Before event start</option>
                          <option value="absolute">Exact date and time</option>
                        </select>
                      </label>

                      {row.timingType === 'relative' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="text-sm">
                            <span className="mb-1 block font-medium text-app-text">Quantity</span>
                            <input
                              type="number"
                              id={`reminder-relative-value-${row.id}`}
                              value={row.relativeValue}
                              min="1"
                              onChange={(changeEvent) =>
                                updateReminderRow(row.id, {
                                  relativeValue:
                                    changeEvent.target.value === ''
                                      ? 0
                                      : Number.parseInt(changeEvent.target.value, 10),
                                })
                              }
                              className={inputClassName}
                            />
                          </label>

                          <label className="text-sm">
                            <span className="mb-1 block font-medium text-app-text">Unit</span>
                            <select
                              id={`reminder-relative-unit-${row.id}`}
                              value={row.relativeUnit}
                              onChange={(changeEvent) =>
                                updateReminderRow(row.id, {
                                  relativeUnit: changeEvent.target.value as ReminderRelativeUnit,
                                })
                              }
                              className={inputClassName}
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                            </select>
                          </label>
                        </div>
                      ) : (
                        <label className="text-sm">
                          <span className="mb-1 block font-medium text-app-text">Send at</span>
                          <input
                            type="datetime-local"
                            id={`reminder-absolute-send-at-${row.id}`}
                            value={row.absoluteLocalDateTime}
                            onChange={(changeEvent) =>
                              updateReminderRow(row.id, {
                                absoluteLocalDateTime: changeEvent.target.value,
                              })
                            }
                            className={inputClassName}
                          />
                          <p className="mt-1 text-xs text-app-text-muted">
                            Interpreted in {row.timezone}
                          </p>
                        </label>
                      )}

                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-app-text">
                          <input
                            type="checkbox"
                            checked={row.sendEmail}
                            onChange={(changeEvent) =>
                              updateReminderRow(row.id, { sendEmail: changeEvent.target.checked })
                            }
                            className={checkboxClassName}
                          />
                          <span>Email</span>
                        </label>

                        <label className="flex items-center gap-2 text-sm text-app-text">
                          <input
                            type="checkbox"
                            checked={row.sendSms}
                            onChange={(changeEvent) =>
                              updateReminderRow(row.id, { sendSms: changeEvent.target.checked })
                            }
                            className={checkboxClassName}
                          />
                          <span>SMS</span>
                        </label>
                      </div>

                      <label className="text-sm">
                        <span className="mb-1 block font-medium text-app-text">
                          Custom message
                        </span>
                        <textarea
                          value={row.customMessage}
                          onChange={(changeEvent) =>
                            updateReminderRow(row.id, { customMessage: changeEvent.target.value })
                          }
                          rows={3}
                          maxLength={MAX_CUSTOM_MESSAGE_LENGTH}
                          className={textareaClassName}
                          placeholder="Add event-specific context for attendees."
                        />
                        <p className="mt-1 text-xs text-app-text-muted">
                          {row.customMessage.length}/{MAX_CUSTOM_MESSAGE_LENGTH}
                        </p>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </EditorSection>

          <EditorSection
            title="Capacity"
            description="Leave this blank if the event should accept unlimited registrations."
          >
            <label className="text-sm">
              <span className="mb-1 block font-medium text-app-text">Maximum capacity</span>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity ?? ''}
                onChange={handleInputChange}
                min="1"
                className={inputClassName}
                placeholder="100"
              />
            </label>
          </EditorSection>
        </div>
      </div>

      <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-app-text-muted">
            Required fields are marked with an asterisk. Saving keeps the existing event and reminder contracts intact.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate('/events')}
              className={staffEventsSecondaryActionClassName}
              disabled={loading || retryingReminderSync}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={staffEventsPrimaryActionClassName}
              disabled={loading || retryingReminderSync}
            >
              {loading ? 'Saving...' : isEdit ? 'Update event' : 'Create event'}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
