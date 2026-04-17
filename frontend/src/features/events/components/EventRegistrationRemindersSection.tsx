import type {
  CreateEventReminderAutomationDTO,
  EventOccurrence,
  EventReminderAutomation,
  EventReminderSummary,
} from '../../../types/event';
import type { ReminderRelativeUnit } from '../utils/reminderTime';
import { formatDateTimeLocalInTimeZone, formatExactReminderTime, formatRelativeTiming } from '../utils/reminderTime';
import { getAttemptSummaryText, getAutomationStatus, getStatusStyles, MAX_CUSTOM_MESSAGE_LENGTH } from './eventRegistrationsPanelShared';
import { useEventRegistrationReminders } from '../registrations/useEventRegistrationReminders';

interface EventRegistrationRemindersSectionProps {
  activeOccurrence: EventOccurrence | null;
  automationsBusy: boolean;
  automationsLoading: boolean;
  eventStartDate: string;
  organizationTimezone: string;
  reminderSummary: EventReminderSummary | null;
  remindersSending: boolean;
  scopedAutomations: EventReminderAutomation[];
  onCancelAutomation: (automation: EventReminderAutomation) => Promise<void>;
  onCreateAutomation: (payload: CreateEventReminderAutomationDTO) => Promise<void>;
  onSendReminders: (payload: {
    sendEmail: boolean;
    sendSms: boolean;
    customMessage?: string;
  }) => Promise<void>;
}

export function EventRegistrationRemindersSection({
  activeOccurrence,
  automationsBusy,
  automationsLoading,
  eventStartDate,
  organizationTimezone,
  reminderSummary,
  remindersSending,
  scopedAutomations,
  onCancelAutomation,
  onCreateAutomation,
  onSendReminders,
}: EventRegistrationRemindersSectionProps) {
  const {
    customReminderMessage,
    localError,
    retryDraft,
    sendEmailReminders,
    sendSmsReminders,
    setCustomReminderMessage,
    setRetryDraft,
    setSendEmailReminders,
    setSendSmsReminders,
    startRetryDraft,
    submitRetryAutomation,
    submitSendReminders,
  } = useEventRegistrationReminders({
    activeOccurrence,
    eventStartDate,
    organizationTimezone,
    onCreateAutomation,
    onSendReminders,
  });

  return (
    <>
      {localError && (
        <div className="mb-4 rounded-md bg-app-accent-soft p-3 text-sm text-app-accent-text">
          {localError}
        </div>
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
            className="rounded-md bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-60"
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
            <p className="mt-2 text-sm text-app-accent">{reminderSummary.warnings[0]}</p>
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
        ) : scopedAutomations.length === 0 ? (
          <p className="mt-3 text-sm text-app-text-muted">No automated reminders scheduled.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {scopedAutomations.map((automation) => {
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
                  {automation.last_error && <p className="mt-2 text-xs text-app-accent-text">{automation.last_error}</p>}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => void onCancelAutomation(automation)}
                        disabled={automationsBusy}
                        className="rounded-md border border-app-border px-3 py-1.5 text-app-accent-text hover:bg-app-accent-soft disabled:opacity-60"
                      >
                        {automationsBusy ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                    {(status === 'failed' || status === 'skipped') && (
                      <button
                        type="button"
                        onClick={() => startRetryDraft(automation)}
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
                className="rounded-md bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-60"
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
    </>
  );
}
