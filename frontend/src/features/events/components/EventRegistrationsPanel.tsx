import { useMemo, useState } from 'react';
import type {
  CreateEventReminderAutomationDTO,
  EventRegistration,
  EventReminderAttemptStatus,
  EventReminderAutomation,
  EventReminderSummary,
} from '../../../types/event';
import type { ReminderRelativeUnit } from '../utils/reminderTime';
import {
  convertZonedDateTimeToUtcIso,
  formatDateTimeLocalInTimeZone,
  formatExactReminderTime,
  formatRelativeTiming,
  toMinutes,
  toRelativeDisplay,
} from '../utils/reminderTime';

const MAX_CUSTOM_MESSAGE_LENGTH = 500;

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

interface EventRegistrationsPanelProps {
  eventStartDate: string;
  organizationTimezone: string;
  registrations: EventRegistration[];
  actionLoading: boolean;
  remindersSending: boolean;
  remindersError: string | null;
  reminderSummary: EventReminderSummary | null;
  reminderAutomations: EventReminderAutomation[];
  automationsLoading: boolean;
  automationsBusy: boolean;
  onCheckIn: (registrationId: string) => Promise<void>;
  onCancelRegistration: (registrationId: string) => Promise<void>;
  onSendReminders: (payload: {
    sendEmail: boolean;
    sendSms: boolean;
    customMessage?: string;
  }) => Promise<void>;
  onCancelAutomation: (automation: EventReminderAutomation) => Promise<void>;
  onCreateAutomation: (payload: CreateEventReminderAutomationDTO) => Promise<void>;
}

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

  return summary.error || null;
};

export default function EventRegistrationsPanel({
  eventStartDate,
  organizationTimezone,
  registrations,
  actionLoading,
  remindersSending,
  remindersError,
  reminderSummary,
  reminderAutomations,
  automationsLoading,
  automationsBusy,
  onCheckIn,
  onCancelRegistration,
  onSendReminders,
  onCancelAutomation,
  onCreateAutomation,
}: EventRegistrationsPanelProps) {
  const [registrationFilter, setRegistrationFilter] = useState('');
  const [sendEmailReminders, setSendEmailReminders] = useState(true);
  const [sendSmsReminders, setSendSmsReminders] = useState(true);
  const [customReminderMessage, setCustomReminderMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [retryDraft, setRetryDraft] = useState<ReminderRetryDraft | null>(null);

  const filteredRegistrations = useMemo(
    () =>
      registrationFilter
        ? registrations.filter((registration) => registration.registration_status === registrationFilter)
        : registrations,
    [registrations, registrationFilter]
  );

  const handleStartRetryDraft = (automation: EventReminderAutomation) => {
    const relative = toRelativeDisplay(automation.relative_minutes_before);
    const timezone = automation.timezone || organizationTimezone;

    setRetryDraft({
      timingType: automation.timing_type,
      relativeValue: relative.value,
      relativeUnit: relative.unit,
      absoluteLocalDateTime:
        automation.absolute_send_at && automation.timing_type === 'absolute'
          ? formatDateTimeLocalInTimeZone(automation.absolute_send_at, timezone)
          : formatDateTimeLocalInTimeZone(eventStartDate, timezone),
      sendEmail: automation.send_email,
      sendSms: automation.send_sms,
      customMessage: automation.custom_message || '',
      timezone,
    });
  };

  const submitSendReminders = async () => {
    if (!sendEmailReminders && !sendSmsReminders) {
      setLocalError('Select at least one reminder channel.');
      return;
    }

    setLocalError(null);
    await onSendReminders({
      sendEmail: sendEmailReminders,
      sendSms: sendSmsReminders,
      customMessage: customReminderMessage.trim() || undefined,
    });
  };

  const submitRetryAutomation = async () => {
    if (!retryDraft) return;

    if (!retryDraft.sendEmail && !retryDraft.sendSms) {
      setLocalError('Select at least one reminder channel (email or SMS).');
      return;
    }

    const customMessage = retryDraft.customMessage.trim();
    if (customMessage.length > MAX_CUSTOM_MESSAGE_LENGTH) {
      setLocalError(`Custom message must be ${MAX_CUSTOM_MESSAGE_LENGTH} characters or less.`);
      return;
    }

    let payload: CreateEventReminderAutomationDTO;

    try {
      if (retryDraft.timingType === 'relative') {
        if (!Number.isFinite(retryDraft.relativeValue) || retryDraft.relativeValue <= 0) {
          setLocalError('Relative reminder time must be a positive value.');
          return;
        }

        payload = {
          timingType: 'relative',
          relativeMinutesBefore: toMinutes(Math.floor(retryDraft.relativeValue), retryDraft.relativeUnit),
          sendEmail: retryDraft.sendEmail,
          sendSms: retryDraft.sendSms,
          customMessage: customMessage || undefined,
          timezone: retryDraft.timezone,
        };
      } else {
        if (!retryDraft.absoluteLocalDateTime) {
          setLocalError('Exact reminder datetime is required.');
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
      setLocalError(error instanceof Error ? error.message : 'Invalid reminder timing');
      return;
    }

    setLocalError(null);
    await onCreateAutomation(payload);
    setRetryDraft(null);
  };

  return (
    <div className="rounded-lg bg-app-surface p-6 shadow-md">
      {(localError || remindersError) && (
        <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{localError || remindersError}</div>
      )}

      <div className="mb-4 rounded-lg border border-app-border bg-app-surface-muted p-4">
        <h3 className="text-lg font-semibold text-app-text">Send Reminders</h3>
        <p className="mt-1 text-sm text-app-text-muted">
          Send reminder messages to contacts with <strong>registered</strong> or <strong>confirmed</strong> status.
        </p>

        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-app-text">
            <input
              type="checkbox"
              checked={sendEmailReminders}
              onChange={(event) => setSendEmailReminders(event.target.checked)}
            />
            Email
          </label>
          <label className="flex items-center gap-2 text-sm text-app-text">
            <input
              type="checkbox"
              checked={sendSmsReminders}
              onChange={(event) => setSendSmsReminders(event.target.checked)}
            />
            SMS
          </label>
        </div>

        <div className="mt-3">
          <label className="text-sm font-medium text-app-text">Custom message (optional)</label>
          <textarea
            value={customReminderMessage}
            onChange={(event) => setCustomReminderMessage(event.target.value)}
            className="mt-1 w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
            rows={3}
            maxLength={MAX_CUSTOM_MESSAGE_LENGTH}
            placeholder="Add event-specific details for attendees..."
          />
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => void submitSendReminders()}
            disabled={remindersSending}
            className="rounded-md bg-app-accent px-4 py-2 text-white hover:bg-app-accent-hover disabled:opacity-60"
          >
            {remindersSending ? 'Sending...' : 'Send Reminders'}
          </button>
        </div>
      </div>

      {reminderSummary && (
        <div className="mb-4 rounded-lg border border-app-border p-4">
          <p className="text-sm text-app-text">
            Reminder target date: {new Date(reminderSummary.eventStartDate).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-app-text-muted">
            Email sent {reminderSummary.email.sent}/{reminderSummary.email.attempted} · SMS sent{' '}
            {reminderSummary.sms.sent}/{reminderSummary.sms.attempted}
          </p>
          {reminderSummary.warnings.length > 0 && (
            <p className="mt-2 text-sm text-amber-600">{reminderSummary.warnings[0]}</p>
          )}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-app-border p-4">
        <h3 className="text-lg font-semibold text-app-text">Scheduled Automated Reminders</h3>
        <p className="mt-1 text-sm text-app-text-muted">
          Automated reminders run once at their scheduled time and respect do-not-email and do-not-text settings.
        </p>

        {automationsLoading ? (
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
                <div key={automation.id} className="rounded-md border border-app-border bg-app-surface-muted p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-app-text">
                        {automation.timing_type === 'relative'
                          ? formatRelativeTiming(automation.relative_minutes_before)
                          : formatExactReminderTime(automation.absolute_send_at, automation.timezone || organizationTimezone)}
                      </p>
                      <p className="mt-1 text-xs text-app-text-muted">
                        Channels: {automation.send_email ? 'Email' : ''}
                        {automation.send_email && automation.send_sms ? ' + ' : ''}
                        {automation.send_sms ? 'SMS' : ''}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusStyles(status)}`}>
                      {status}
                    </span>
                  </div>

                  {attemptSummary && <p className="mt-2 text-xs text-app-text-muted">{attemptSummary}</p>}
                  {automation.last_error && <p className="mt-2 text-xs text-red-700">{automation.last_error}</p>}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => void onCancelAutomation(automation)}
                        disabled={automationsBusy}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {automationsBusy ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                    {(status === 'failed' || status === 'skipped') && (
                      <button
                        type="button"
                        onClick={() => handleStartRetryDraft(automation)}
                        className="rounded-md border border-app-border px-3 py-1.5 hover:bg-app-surface"
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
          <div className="mt-4 rounded-md border border-app-border bg-app-surface p-4">
            <h4 className="font-medium text-app-text">Schedule Another Attempt</h4>

            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Timing Mode</label>
                <select
                  value={retryDraft.timingType}
                  onChange={(event) => {
                    const timingType = event.target.value as 'relative' | 'absolute';
                    setRetryDraft((current) =>
                      current
                        ? {
                            ...current,
                            timingType,
                            absoluteLocalDateTime:
                              timingType === 'absolute' && !current.absoluteLocalDateTime
                                ? formatDateTimeLocalInTimeZone(eventStartDate, current.timezone)
                                : current.absoluteLocalDateTime,
                          }
                        : current
                    );
                  }}
                  className="w-full rounded-md border px-3 py-2"
                >
                  <option value="relative">Before Event Start</option>
                  <option value="absolute">Exact Date & Time</option>
                </select>
              </div>

              {retryDraft.timingType === 'relative' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    value={retryDraft.relativeValue}
                    onChange={(event) =>
                      setRetryDraft((current) =>
                        current
                          ? {
                              ...current,
                              relativeValue:
                                event.target.value === '' ? 0 : Number.parseInt(event.target.value, 10),
                            }
                          : current
                      )
                    }
                    className="w-full rounded-md border px-3 py-2"
                  />
                  <select
                    value={retryDraft.relativeUnit}
                    onChange={(event) =>
                      setRetryDraft((current) =>
                        current ? { ...current, relativeUnit: event.target.value as ReminderRelativeUnit } : current
                      )
                    }
                    className="w-full rounded-md border px-3 py-2"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              ) : (
                <input
                  type="datetime-local"
                  value={retryDraft.absoluteLocalDateTime}
                  onChange={(event) =>
                    setRetryDraft((current) =>
                      current ? { ...current, absoluteLocalDateTime: event.target.value } : current
                    )
                  }
                  className="w-full rounded-md border px-3 py-2"
                />
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-app-text">
                <input
                  type="checkbox"
                  checked={retryDraft.sendEmail}
                  onChange={(event) =>
                    setRetryDraft((current) =>
                      current ? { ...current, sendEmail: event.target.checked } : current
                    )
                  }
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm text-app-text">
                <input
                  type="checkbox"
                  checked={retryDraft.sendSms}
                  onChange={(event) =>
                    setRetryDraft((current) =>
                      current ? { ...current, sendSms: event.target.checked } : current
                    )
                  }
                />
                SMS
              </label>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium">Custom Message (Optional)</label>
              <textarea
                value={retryDraft.customMessage}
                onChange={(event) =>
                  setRetryDraft((current) =>
                    current ? { ...current, customMessage: event.target.value } : current
                  )
                }
                rows={3}
                maxLength={MAX_CUSTOM_MESSAGE_LENGTH}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void submitRetryAutomation()}
                disabled={automationsBusy}
                className="rounded-md bg-app-accent px-4 py-2 text-white hover:bg-app-accent-hover disabled:opacity-60"
              >
                {automationsBusy ? 'Scheduling...' : 'Schedule Reminder'}
              </button>
              <button
                type="button"
                onClick={() => setRetryDraft(null)}
                disabled={automationsBusy}
                className="rounded-md border px-4 py-2 hover:bg-app-surface-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Event Registrations</h3>
        <select
          value={registrationFilter}
          onChange={(event) => setRegistrationFilter(event.target.value)}
          className="rounded-md border px-4 py-2"
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
        <div className="py-8 text-center text-app-text-muted">No registrations found for this event.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-app-border">
            <thead className="bg-app-surface-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Checked In</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Registered At</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-app-surface">
              {filteredRegistrations.map((registration) => (
                <tr key={registration.registration_id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-app-text">{registration.contact_name}</div>
                    <div className="text-sm text-app-text-muted">{registration.contact_email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-semibold text-app-accent-text">
                      {registration.registration_status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {registration.checked_in ? (
                      <div>
                        <span className="font-semibold text-green-600">✓ Yes</span>
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
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-app-text-muted">
                    {new Date(registration.created_at).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    {!registration.checked_in && (
                      <button
                        type="button"
                        onClick={() => void onCheckIn(registration.registration_id)}
                        disabled={actionLoading}
                        className="mr-4 text-green-600 hover:text-green-900 disabled:opacity-60"
                      >
                        Check In
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onCancelRegistration(registration.registration_id)}
                      disabled={actionLoading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-60"
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
  );
}
