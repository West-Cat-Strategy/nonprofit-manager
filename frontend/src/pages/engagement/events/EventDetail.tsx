/**
 * EventDetail Component
 * Displays event details with tabs for info and registrations
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchEventById,
  fetchEventRegistrations,
  checkInAttendee,
  cancelRegistration,
  clearSelectedEvent,
  clearRegistrations,
} from '../../../store/slices/eventsSlice';
import AddToCalendar from '../../../components/AddToCalendar';
import SocialShare from '../../../components/SocialShare';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { formatDateTime } from '../../../utils/format';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import api from '../../../services/api';
import { useToast } from '../../../contexts/useToast';
import type {
  EventReminderSummary,
  EventReminderAutomation,
  EventReminderAttemptStatus,
  CreateEventReminderAutomationDTO,
} from '../../../types/event';

type ReminderRelativeUnit = 'minutes' | 'hours' | 'days';

interface ReminderRetryDraft {
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

const toMinutes = (value: number, unit: ReminderRelativeUnit): number => {
  if (unit === 'days') return value * 24 * 60;
  if (unit === 'hours') return value * 60;
  return value;
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

const formatRelativeTiming = (minutes: number | null): string => {
  if (!minutes || minutes <= 0) {
    return 'Invalid relative timing';
  }

  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} day${days === 1 ? '' : 's'} before event start`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'} before event start`;
  }

  return `${minutes} minute${minutes === 1 ? '' : 's'} before event start`;
};

const formatExactReminderTime = (isoDate: string | null, timeZone: string): string => {
  if (!isoDate) return 'No datetime configured';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Invalid datetime';

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

const getAutomationStatus = (
  automation: EventReminderAutomation
): 'pending' | EventReminderAttemptStatus => {
  if (!automation.attempted_at && automation.is_active) {
    return 'pending';
  }

  return automation.attempt_status || 'cancelled';
};

const getStatusStyles = (status: 'pending' | EventReminderAttemptStatus): string => {
  switch (status) {
    case 'sent':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-amber-100 text-amber-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'skipped':
      return 'bg-slate-100 text-slate-700';
    case 'cancelled':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

const getAttemptSummaryText = (automation: EventReminderAutomation): string | null => {
  if (!automation.attempt_summary) return null;

  const summary = automation.attempt_summary as {
    email?: { sent?: number; attempted?: number };
    sms?: { sent?: number; attempted?: number };
    error?: string;
  };

  if (summary.email || summary.sms) {
    const emailSent = summary.email?.sent ?? 0;
    const emailAttempted = summary.email?.attempted ?? 0;
    const smsSent = summary.sms?.sent ?? 0;
    const smsAttempted = summary.sms?.attempted ?? 0;
    return `Email sent ${emailSent}/${emailAttempted} · SMS sent ${smsSent}/${smsAttempted}`;
  }

  if (summary.error) {
    return summary.error;
  }

  return null;
};

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isTestEnv = import.meta.env.MODE === 'test';
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const { selectedEvent: event, registrations, loading } = useAppSelector((state) => state.events);
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<'info' | 'registrations'>('info');
  const [registrationFilter, setRegistrationFilter] = useState('');
  const [sendEmailReminders, setSendEmailReminders] = useState(true);
  const [sendSmsReminders, setSendSmsReminders] = useState(true);
  const [customReminderMessage, setCustomReminderMessage] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);
  const [lastReminderSummary, setLastReminderSummary] = useState<EventReminderSummary | null>(null);

  const [organizationTimezone, setOrganizationTimezone] = useState(getBrowserTimeZone());
  const [reminderAutomations, setReminderAutomations] = useState<EventReminderAutomation[]>([]);
  const [loadingReminderAutomations, setLoadingReminderAutomations] = useState(false);
  const [automationActionId, setAutomationActionId] = useState<string | null>(null);
  const [retryDraft, setRetryDraft] = useState<ReminderRetryDraft | null>(null);
  const [savingRetryDraft, setSavingRetryDraft] = useState(false);

  // Update document meta tags for social sharing
  useDocumentMeta({
    title: event?.event_name,
    description: event?.description || `Join us for ${event?.event_name}`,
    url: `/events/${id}`,
    type: 'event',
  });

  const loadReminderAutomations = async (eventId: string) => {
    setLoadingReminderAutomations(true);
    try {
      const response = await api.get<{ data: EventReminderAutomation[] }>(
        `/events/${eventId}/reminder-automations`
      );
      setReminderAutomations(response.data?.data || []);
    } catch {
      showError('Failed to load automated reminders');
    } finally {
      setLoadingReminderAutomations(false);
    }
  };

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
    if (id) {
      dispatch(fetchEventById(id));
      dispatch(fetchEventRegistrations({ eventId: id }));
      void loadReminderAutomations(id);
    }

    return () => {
      dispatch(clearSelectedEvent());
      dispatch(clearRegistrations());
    };
  }, [id, dispatch]);

  const formatEventDateTime = (date: string) => {
    const d = new Date(date);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    return `${weekday}, ${formatDateTime(date)}`;
  };

  const handleCheckIn = async (registrationId: string) => {
    const confirmed = await confirm({
      title: 'Check In Attendee',
      message: 'Check in this attendee?',
      confirmLabel: 'Check In',
      variant: 'warning',
    });
    if (!confirmed) return;

    await dispatch(checkInAttendee(registrationId));
    if (id) {
      dispatch(fetchEventRegistrations({ eventId: id }));
    }
  };

  const handleCancelRegistration = async (registrationId: string) => {
    const confirmed = await confirm({
      title: 'Cancel Registration',
      message: 'Cancel this registration? This will reduce the event capacity.',
      confirmLabel: 'Cancel Registration',
      variant: 'danger',
    });
    if (!confirmed) return;

    await dispatch(cancelRegistration(registrationId));
    if (id) {
      dispatch(fetchEventRegistrations({ eventId: id }));
    }
  };

  const handleSendReminders = async () => {
    if (!id) return;

    if (!sendEmailReminders && !sendSmsReminders) {
      showError('Select at least one reminder channel.');
      return;
    }

    const channelLabel = [
      sendEmailReminders ? 'email' : '',
      sendSmsReminders ? 'sms' : '',
    ]
      .filter(Boolean)
      .join(' and ');

    const confirmed = await confirm({
      title: 'Send Event Reminders',
      message: `Send ${channelLabel.toUpperCase()} reminders to registered attendees?`,
      confirmLabel: 'Send Reminders',
      variant: 'warning',
    });
    if (!confirmed) return;

    setSendingReminders(true);
    try {
      const response = await api.post<{ data: EventReminderSummary }>(
        `/events/${id}/reminders/send`,
        {
          sendEmail: sendEmailReminders,
          sendSms: sendSmsReminders,
          customMessage: customReminderMessage.trim() || undefined,
        }
      );

      const summary = response.data.data;
      setLastReminderSummary(summary);
      showSuccess(
        `Reminders processed. Email sent: ${summary.email.sent}, SMS sent: ${summary.sms.sent}.`
      );
      if (summary.warnings.length > 0) {
        showError(summary.warnings[0]);
      }
    } catch {
      showError('Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleCancelAutomation = async (automation: EventReminderAutomation) => {
    if (!id) return;

    const confirmed = await confirm({
      title: 'Cancel Automated Reminder',
      message: 'Cancel this pending automated reminder?',
      confirmLabel: 'Cancel Reminder',
      variant: 'danger',
    });
    if (!confirmed) return;

    setAutomationActionId(automation.id);
    try {
      await api.post(`/events/${id}/reminder-automations/${automation.id}/cancel`);
      showSuccess('Automated reminder cancelled');
      await loadReminderAutomations(id);
    } catch {
      showError('Failed to cancel automated reminder');
    } finally {
      setAutomationActionId(null);
    }
  };

  const handlePrefillRetryDraft = (automation: EventReminderAutomation) => {
    const relative = toRelativeDisplay(automation.relative_minutes_before);
    const timezone = automation.timezone || organizationTimezone;

    setRetryDraft({
      timingType: automation.timing_type,
      relativeValue: relative.value,
      relativeUnit: relative.unit,
      absoluteLocalDateTime:
        automation.absolute_send_at && automation.timing_type === 'absolute'
          ? formatDateTimeLocalInTimeZone(automation.absolute_send_at, timezone)
          : event?.start_date
            ? formatDateTimeLocalInTimeZone(event.start_date, timezone)
            : '',
      sendEmail: automation.send_email,
      sendSms: automation.send_sms,
      customMessage: automation.custom_message || '',
      timezone,
    });
  };

  const updateRetryDraft = (updates: Partial<ReminderRetryDraft>) => {
    setRetryDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleCreateRetryAutomation = async () => {
    if (!id || !retryDraft) return;

    if (!retryDraft.sendEmail && !retryDraft.sendSms) {
      showError('Select at least one reminder channel (email or SMS).');
      return;
    }

    const customMessage = retryDraft.customMessage.trim();
    if (customMessage.length > MAX_CUSTOM_MESSAGE_LENGTH) {
      showError(`Custom message must be ${MAX_CUSTOM_MESSAGE_LENGTH} characters or less.`);
      return;
    }

    let payload: CreateEventReminderAutomationDTO;

    try {
      if (retryDraft.timingType === 'relative') {
        if (!Number.isFinite(retryDraft.relativeValue) || retryDraft.relativeValue <= 0) {
          showError('Relative reminder time must be a positive value.');
          return;
        }

        payload = {
          timingType: 'relative',
          relativeMinutesBefore: toMinutes(
            Math.floor(retryDraft.relativeValue),
            retryDraft.relativeUnit
          ),
          sendEmail: retryDraft.sendEmail,
          sendSms: retryDraft.sendSms,
          customMessage: customMessage || undefined,
          timezone: retryDraft.timezone,
        };
      } else {
        if (!retryDraft.absoluteLocalDateTime) {
          showError('Exact reminder datetime is required.');
          return;
        }

        payload = {
          timingType: 'absolute',
          absoluteSendAt: convertZonedDateTimeToUtcIso(
            retryDraft.absoluteLocalDateTime,
            retryDraft.timezone
          ),
          sendEmail: retryDraft.sendEmail,
          sendSms: retryDraft.sendSms,
          customMessage: customMessage || undefined,
          timezone: retryDraft.timezone,
        };
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Invalid reminder timing');
      return;
    }

    setSavingRetryDraft(true);
    try {
      await api.post(`/events/${id}/reminder-automations`, payload);
      showSuccess('Automated reminder scheduled');
      setRetryDraft(null);
      await loadReminderAutomations(id);
    } catch {
      showError('Failed to schedule automated reminder');
    } finally {
      setSavingRetryDraft(false);
    }
  };

  const filteredRegistrations = registrationFilter
    ? registrations.filter((r) => r.registration_status === registrationFilter)
    : registrations;

  if (loading || !event) {
    return (
      <NeoBrutalistLayout pageTitle="EVENTS">
        <div className="p-6 text-center">Loading event details...</div>
      </NeoBrutalistLayout>
    );
  }

  const capacityPercentage = event.capacity
    ? ((event.registered_count || 0) / event.capacity) * 100
    : 0;

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
      <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{event.event_name}</h1>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-app-accent-soft text-app-accent-text">
              {event.event_type}
            </span>
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-app-surface-muted text-app-text">
              {event.status}
            </span>
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-white text-black border border-black">
              {event.is_public ? 'Public' : 'Private'}
            </span>
            {event.is_recurring && (
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-900 border border-yellow-600">
                Recurring
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <AddToCalendar event={event} />
          <SocialShare
            data={{
              url: `/events/${event.event_id}`,
              title: event.event_name,
              description: event.description || `Join us for ${event.event_name}`,
            }}
          />
          <button
            onClick={() => navigate(`/events/${id}/edit`)}
            className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover"
          >
            Edit Event
          </button>
          <button
            onClick={() => navigate('/events')}
            className="px-4 py-2 border rounded-md hover:bg-app-surface-muted"
          >
            Back to Events
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'info'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text-muted'
            }`}
          >
            Event Info
          </button>
          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'registrations'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text-muted'
            }`}
          >
            Registrations ({registrations.length})
          </button>
        </nav>
      </div>

      {/* Event Info Tab */}
      {activeTab === 'info' && (
        <div className="bg-app-surface shadow-md rounded-lg p-6 space-y-6">
          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-app-text-muted whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Start Date & Time</h3>
              <p className="text-app-text-muted">{formatEventDateTime(event.start_date)}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">End Date & Time</h3>
              <p className="text-app-text-muted">{formatEventDateTime(event.end_date)}</p>
            </div>
          </div>

          {event.is_recurring && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Recurrence</h3>
              <p className="text-app-text-muted capitalize">
                Every {event.recurrence_interval || 1} {event.recurrence_pattern || 'week'}
                {(event.recurrence_interval || 1) > 1 ? 's' : ''}
              </p>
              {event.recurrence_end_date && (
                <p className="text-app-text-muted">
                  Ends: {formatEventDateTime(event.recurrence_end_date)}
                </p>
              )}
            </div>
          )}

          {/* Location */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Location</h3>
            {event.location_name ? (
              <div className="text-app-text-muted">
                <p className="font-medium">{event.location_name}</p>
                {event.address_line1 && <p>{event.address_line1}</p>}
                {event.address_line2 && <p>{event.address_line2}</p>}
                {(event.city || event.state_province || event.postal_code) && (
                  <p>
                    {event.city && `${event.city}, `}
                    {event.state_province && `${event.state_province} `}
                    {event.postal_code}
                  </p>
                )}
                {event.country && <p>{event.country}</p>}
              </div>
            ) : (
              <p className="text-app-text-muted">Location to be determined</p>
            )}
          </div>

          {/* Capacity & Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Capacity</h3>
              {event.capacity ? (
                <div>
                  <p className="text-2xl font-bold">{event.capacity}</p>
                  <div className="mt-2 bg-app-surface-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        capacityPercentage >= 100
                          ? 'bg-red-600'
                          : capacityPercentage >= 80
                            ? 'bg-orange-500'
                            : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-app-text-muted mt-1">
                    {Math.round(capacityPercentage)}% full
                  </p>
                </div>
              ) : (
                <p className="text-app-text-muted">Unlimited</p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Registered</h3>
              <p className="text-2xl font-bold text-app-accent">{event.registered_count || 0}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Attended</h3>
              <p className="text-2xl font-bold text-green-600">{event.attended_count || 0}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-app-text-muted">
              <div>
                <span className="font-medium">Visibility:</span> {event.is_public ? 'Public' : 'Private'}
              </div>
              <div>
                <span className="font-medium">Recurring:</span> {event.is_recurring ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(event.created_at).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{' '}
                {new Date(event.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registrations Tab */}
      {activeTab === 'registrations' && (
        <div className="bg-app-surface shadow-md rounded-lg p-6">
          <div className="mb-4 rounded-lg border border-app-border bg-app-surface-muted p-4">
            <h3 className="text-lg font-semibold text-app-text">Send Reminders</h3>
            <p className="mt-1 text-sm text-app-text-muted">
              Send reminder messages to contacts with <strong>registered</strong> or{' '}
              <strong>confirmed</strong> status.
            </p>

            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-app-text">
                <input
                  type="checkbox"
                  checked={sendEmailReminders}
                  onChange={(e) => setSendEmailReminders(e.target.checked)}
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm text-app-text">
                <input
                  type="checkbox"
                  checked={sendSmsReminders}
                  onChange={(e) => setSendSmsReminders(e.target.checked)}
                />
                SMS
              </label>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-app-text">Custom message (optional)</label>
              <textarea
                value={customReminderMessage}
                onChange={(e) => setCustomReminderMessage(e.target.value)}
                className="mt-1 w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
                rows={3}
                maxLength={500}
                placeholder="Add event-specific details for attendees..."
              />
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={handleSendReminders}
                disabled={sendingReminders}
                className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:opacity-60"
              >
                {sendingReminders ? 'Sending...' : 'Send Reminders'}
              </button>
            </div>
          </div>

          {lastReminderSummary && (
            <div className="mb-4 rounded-lg border border-app-border p-4">
              <p className="text-sm text-app-text">
                Reminder target date: {new Date(lastReminderSummary.eventStartDate).toLocaleString()}
              </p>
              <p className="text-sm text-app-text-muted mt-1">
                Email sent {lastReminderSummary.email.sent}/{lastReminderSummary.email.attempted} · SMS
                sent {lastReminderSummary.sms.sent}/{lastReminderSummary.sms.attempted}
              </p>
              {lastReminderSummary.warnings.length > 0 && (
                <p className="mt-2 text-sm text-amber-600">{lastReminderSummary.warnings[0]}</p>
              )}
            </div>
          )}

          <div className="mb-6 rounded-lg border border-app-border p-4">
            <h3 className="text-lg font-semibold text-app-text">Scheduled Automated Reminders</h3>
            <p className="text-sm text-app-text-muted mt-1">
              Automated reminders run once at their scheduled time and respect do-not-email and
              do-not-text settings at send time.
            </p>

            {loadingReminderAutomations ? (
              <p className="mt-3 text-sm text-app-text-muted">Loading automated reminders...</p>
            ) : reminderAutomations.length === 0 ? (
              <p className="mt-3 text-sm text-app-text-muted">No automated reminders scheduled.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {reminderAutomations.map((automation) => {
                  const status = getAutomationStatus(automation);
                  const isPending = status === 'pending';
                  const attemptSummary = getAttemptSummaryText(automation);

                  return (
                    <div
                      key={automation.id}
                      className="rounded-md border border-app-border bg-app-surface-muted p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-app-text">
                            {automation.timing_type === 'relative'
                              ? formatRelativeTiming(automation.relative_minutes_before)
                              : formatExactReminderTime(
                                  automation.absolute_send_at,
                                  automation.timezone || organizationTimezone
                                )}
                          </p>
                          <p className="text-xs text-app-text-muted mt-1">
                            Channels: {automation.send_email ? 'Email' : ''}
                            {automation.send_email && automation.send_sms ? ' + ' : ''}
                            {automation.send_sms ? 'SMS' : ''}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyles(status)}`}
                        >
                          {status}
                        </span>
                      </div>

                      {attemptSummary && (
                        <p className="mt-2 text-xs text-app-text-muted">{attemptSummary}</p>
                      )}
                      {automation.last_error && (
                        <p className="mt-2 text-xs text-red-700">{automation.last_error}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => void handleCancelAutomation(automation)}
                            disabled={automationActionId === automation.id}
                            className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {automationActionId === automation.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                        {(status === 'failed' || status === 'skipped') && (
                          <button
                            type="button"
                            onClick={() => handlePrefillRetryDraft(automation)}
                            className="px-3 py-1.5 rounded-md border border-app-border hover:bg-app-surface"
                          >
                            Schedule Another Attempt
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {retryDraft && (
              <div className="mt-4 rounded-md border border-app-border p-4 bg-app-surface">
                <h4 className="font-medium text-app-text">Schedule Another Attempt</h4>
                <p className="text-xs text-app-text-muted mt-1">
                  Exact date/time reminders use organization timezone: {retryDraft.timezone}
                </p>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Timing Mode</label>
                    <select
                      value={retryDraft.timingType}
                      onChange={(e) => {
                        const timingType = e.target.value as 'relative' | 'absolute';
                        updateRetryDraft({
                          timingType,
                          absoluteLocalDateTime:
                            timingType === 'absolute' && !retryDraft.absoluteLocalDateTime
                              ? formatDateTimeLocalInTimeZone(event.start_date, retryDraft.timezone)
                              : retryDraft.absoluteLocalDateTime,
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="relative">Before Event Start</option>
                      <option value="absolute">Exact Date & Time</option>
                    </select>
                  </div>

                  {retryDraft.timingType === 'relative' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={retryDraft.relativeValue}
                          onChange={(e) =>
                            updateRetryDraft({
                              relativeValue:
                                e.target.value === '' ? 0 : Number.parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Unit</label>
                        <select
                          value={retryDraft.relativeUnit}
                          onChange={(e) =>
                            updateRetryDraft({
                              relativeUnit: e.target.value as ReminderRelativeUnit,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-1">Send At (Exact)</label>
                      <input
                        type="datetime-local"
                        value={retryDraft.absoluteLocalDateTime}
                        onChange={(e) =>
                          updateRetryDraft({ absoluteLocalDateTime: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-app-text">
                    <input
                      type="checkbox"
                      checked={retryDraft.sendEmail}
                      onChange={(e) => updateRetryDraft({ sendEmail: e.target.checked })}
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-app-text">
                    <input
                      type="checkbox"
                      checked={retryDraft.sendSms}
                      onChange={(e) => updateRetryDraft({ sendSms: e.target.checked })}
                    />
                    SMS
                  </label>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">Custom Message (Optional)</label>
                  <textarea
                    value={retryDraft.customMessage}
                    onChange={(e) => updateRetryDraft({ customMessage: e.target.value })}
                    rows={3}
                    maxLength={MAX_CUSTOM_MESSAGE_LENGTH}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-app-text-muted mt-1">
                    {retryDraft.customMessage.length}/{MAX_CUSTOM_MESSAGE_LENGTH}
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateRetryAutomation}
                    disabled={savingRetryDraft}
                    className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:opacity-60"
                  >
                    {savingRetryDraft ? 'Scheduling...' : 'Schedule Reminder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetryDraft(null)}
                    disabled={savingRetryDraft}
                    className="px-4 py-2 border rounded-md hover:bg-app-surface-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Event Registrations</h3>
            <select
              value={registrationFilter}
              onChange={(e) => setRegistrationFilter(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="registered">Registered</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-8 text-app-text-muted">
              No registrations found for this event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-app-border">
                <thead className="bg-app-surface-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Checked In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Registered At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-app-surface divide-y divide-app-border">
                  {filteredRegistrations.map((registration) => (
                    <tr key={registration.registration_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-app-text">
                          {registration.contact_name}
                        </div>
                        <div className="text-sm text-app-text-muted">{registration.contact_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-app-accent-soft text-app-accent-text">
                          {registration.registration_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {registration.checked_in ? (
                          <div>
                            <span className="text-green-600 font-semibold">✓ Yes</span>
                            {registration.check_in_time && (
                              <div className="text-xs text-app-text-muted">
                                {new Date(registration.check_in_time).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-app-text-subtle">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text-muted">
                        {new Date(registration.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!registration.checked_in && (
                          <button
                            onClick={() => handleCheckIn(registration.registration_id)}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Check In
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelRegistration(registration.registration_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
      </div>
    </NeoBrutalistLayout>
  );
};

export default EventDetail;
