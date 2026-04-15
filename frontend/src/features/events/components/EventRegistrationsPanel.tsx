import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  CreateEventReminderAutomationDTO,
  EventBatchScope,
  EventCheckInSettings,
  EventOccurrence,
  EventRegistration,
  EventReminderAttemptStatus,
  EventReminderAutomation,
  EventReminderSummary,
  RegistrationStatus,
  UpdateRegistrationDTO,
} from '../../../types/event';
import { casesApiClient } from '../../cases/api/casesApiClient';
import type { ReminderRelativeUnit } from '../utils/reminderTime';
import {
  convertZonedDateTimeToUtcIso,
  formatDateTimeLocalInTimeZone,
  formatExactReminderTime,
  formatRelativeTiming,
  toMinutes,
  toRelativeDisplay,
} from '../utils/reminderTime';
import {
  getEventBatchScopeHint,
  getEventBatchScopeLabel,
  getEventOccurrenceLabel,
  getOccurrenceDateRange,
} from '../utils/occurrences';
const EventQrScanner = lazy(() => import('./EventQrScanner'));

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

interface RegistrationManageDraft {
  registration_status: RegistrationStatus;
  notes: string;
  case_id: string;
}

interface RegistrationCaseOption {
  id: string;
  case_number: string;
  title: string;
}

interface EventRegistrationsPanelProps {
  eventId: string;
  eventStartDate: string;
  selectedOccurrence?: EventOccurrence | null;
  occurrenceOptions?: EventOccurrence[];
  batchScope?: EventBatchScope;
  organizationTimezone: string;
  registrations: EventRegistration[];
  checkInSettings: EventCheckInSettings | null;
  checkInSettingsLoading: boolean;
  actionLoading: boolean;
  remindersSending: boolean;
  remindersError: string | null;
  reminderSummary: EventReminderSummary | null;
  reminderAutomations: EventReminderAutomation[];
  automationsLoading: boolean;
  automationsBusy: boolean;
  onCheckIn: (registrationId: string) => Promise<void>;
  onUpdateRegistration: (
    registrationId: string,
    payload: UpdateRegistrationDTO
  ) => Promise<void>;
  onCancelRegistration: (registrationId: string) => Promise<void>;
  onSendReminders: (payload: {
    sendEmail: boolean;
    sendSms: boolean;
    customMessage?: string;
  }) => Promise<void>;
  onUpdateCheckInSettings: (enabled: boolean) => Promise<void>;
  onRotateCheckInPin: () => Promise<string>;
  onScanCheckIn?: (token: string) => Promise<void>;
  onSendConfirmationEmail?: (registrationId: string) => Promise<void>;
  onCancelAutomation: (automation: EventReminderAutomation) => Promise<void>;
  onCreateAutomation: (payload: CreateEventReminderAutomationDTO) => Promise<void>;
  onChangeBatchScope?: (scope: EventBatchScope) => void;
  onSelectOccurrence?: (occurrenceId: string) => void;
}

const nonAttendableStatuses = new Set<RegistrationStatus>(['waitlisted', 'no_show', 'cancelled']);
const confirmationEmailEligibleStatuses = new Set<RegistrationStatus>(['registered', 'confirmed']);

const formatRegistrationStatus = (status: RegistrationStatus): string =>
  status.replace('_', ' ');

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
      return 'bg-app-accent-soft text-app-accent-text';
    case 'partial':
      return 'bg-app-accent-soft text-app-accent-text';
    case 'failed':
      return 'bg-app-accent-soft text-app-accent-text';
    case 'skipped':
      return 'bg-app-surface text-app-text';
    case 'cancelled':
      return 'bg-app-surface text-app-text';
    default:
      return 'bg-app-accent-soft text-app-accent-text';
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
  eventId,
  eventStartDate,
  selectedOccurrence,
  occurrenceOptions = [],
  batchScope = 'occurrence',
  organizationTimezone,
  registrations,
  checkInSettings,
  checkInSettingsLoading,
  actionLoading,
  remindersSending,
  remindersError,
  reminderSummary,
  reminderAutomations,
  automationsLoading,
  automationsBusy,
  onCheckIn,
  onUpdateRegistration,
  onCancelRegistration,
  onSendReminders,
  onUpdateCheckInSettings,
  onRotateCheckInPin,
  onScanCheckIn,
  onSendConfirmationEmail,
  onCancelAutomation,
  onCreateAutomation,
  onChangeBatchScope,
  onSelectOccurrence,
}: EventRegistrationsPanelProps) {
  const [registrationFilter, setRegistrationFilter] = useState('');
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [qrCodesByRegistration, setQrCodesByRegistration] = useState<Record<string, string>>({});
  const [sendEmailReminders, setSendEmailReminders] = useState(true);
  const [sendSmsReminders, setSendSmsReminders] = useState(true);
  const [customReminderMessage, setCustomReminderMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [retryDraft, setRetryDraft] = useState<ReminderRetryDraft | null>(null);
  const [scanToken, setScanToken] = useState('');
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [kioskEnabledDraft, setKioskEnabledDraft] = useState(false);
  const [kioskBusy, setKioskBusy] = useState(false);
  const [kioskMessage, setKioskMessage] = useState<string | null>(null);
  const [kioskError, setKioskError] = useState<string | null>(null);
  const [latestPin, setLatestPin] = useState<string | null>(null);
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const [manageDraft, setManageDraft] = useState<RegistrationManageDraft | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [caseOptionsByContact, setCaseOptionsByContact] = useState<
    Record<string, RegistrationCaseOption[]>
  >({});
  const [caseOptionsLoadingContactId, setCaseOptionsLoadingContactId] = useState<string | null>(null);
  const [confirmationEmailLoadingId, setConfirmationEmailLoadingId] = useState<string | null>(null);
  const activeOccurrence = selectedOccurrence ?? occurrenceOptions[0] ?? null;
  const batchScopeLabel = getEventBatchScopeLabel(batchScope);
  const batchScopeHint = getEventBatchScopeHint(batchScope);
  const scopedRegistrations = useMemo(() => {
    if (!activeOccurrence) {
      return registrations;
    }

    return registrations.filter(
      (registration) =>
        !registration.occurrence_id || registration.occurrence_id === activeOccurrence.occurrence_id
    );
  }, [activeOccurrence, registrations]);
  const scopedAutomations = useMemo(() => {
    if (!activeOccurrence) {
      return reminderAutomations;
    }

    return reminderAutomations.filter(
      (automation) =>
        !automation.occurrence_id || automation.occurrence_id === activeOccurrence.occurrence_id
    );
  }, [activeOccurrence, reminderAutomations]);

  const filteredRegistrations = useMemo(() => {
    const needle = registrationSearch.trim().toLowerCase();

    return scopedRegistrations.filter((registration) => {
      const matchesStatus = registrationFilter
        ? registration.registration_status === registrationFilter
        : true;

      if (!matchesStatus) return false;
      if (!needle) return true;

      const haystack = [
        registration.contact_name,
        registration.contact_email,
        registration.registration_status,
        registration.check_in_token,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [registrationFilter, registrationSearch, scopedRegistrations]);

  useEffect(() => {
    let cancelled = false;

    const generateCodes = async () => {
      try {
        const registrationsWithTokens = filteredRegistrations.filter(
          (registration) => registration.check_in_token
        );
        if (registrationsWithTokens.length === 0) {
          if (!cancelled) {
            setQrCodesByRegistration({});
          }
          return;
        }

        const { toDataURL } = await import('qrcode');
        const entries = await Promise.all(
          filteredRegistrations.map(async (registration) => {
            if (!registration.check_in_token) {
              return [registration.registration_id, ''] as const;
            }

            try {
              const dataUrl = await toDataURL(registration.check_in_token, {
                width: 96,
                margin: 1,
              });
              return [registration.registration_id, dataUrl] as const;
            } catch {
              return [registration.registration_id, ''] as const;
            }
          })
        );

        if (cancelled) return;
        setQrCodesByRegistration(
          entries.reduce<Record<string, string>>((accumulator, [registrationId, dataUrl]) => {
            if (dataUrl) {
              accumulator[registrationId] = dataUrl;
            }
            return accumulator;
          }, {})
        );
      } catch {
        if (!cancelled) {
          setQrCodesByRegistration({});
        }
      }
    };

    void generateCodes();

    return () => {
      cancelled = true;
    };
  }, [filteredRegistrations]);

  useEffect(() => {
    if (checkInSettings) {
      setKioskEnabledDraft(checkInSettings.public_checkin_enabled);
    }
  }, [checkInSettings]);

  const kioskUrl =
    typeof window === 'undefined'
      ? activeOccurrence?.occurrence_id
        ? `/event-check-in/${eventId}?occurrence_id=${activeOccurrence.occurrence_id}`
        : `/event-check-in/${eventId}`
      : activeOccurrence?.occurrence_id
        ? `${window.location.origin}/event-check-in/${eventId}?occurrence_id=${activeOccurrence.occurrence_id}`
        : `${window.location.origin}/event-check-in/${eventId}`;

  const saveKioskSettings = async () => {
    setKioskBusy(true);
    setKioskError(null);
    setKioskMessage(null);
    try {
      await onUpdateCheckInSettings(kioskEnabledDraft);
      setKioskMessage(
        kioskEnabledDraft ? 'Public kiosk enabled.' : 'Public kiosk disabled.'
      );
    } catch {
      setKioskError('Failed to update kiosk settings.');
    } finally {
      setKioskBusy(false);
    }
  };

  const rotateKioskPin = async () => {
    setKioskBusy(true);
    setKioskError(null);
    setKioskMessage(null);
    try {
      const pin = await onRotateCheckInPin();
      setLatestPin(pin);
      setKioskMessage('PIN rotated. Share this PIN with on-site staff only.');
    } catch {
      setKioskError('Failed to rotate kiosk PIN.');
    } finally {
      setKioskBusy(false);
    }
  };

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
    await onCreateAutomation({
      ...payload,
      occurrenceId: activeOccurrence?.occurrence_id ?? payload.occurrenceId,
    });
    setRetryDraft(null);
  };

  const submitScanCheckIn = useCallback(
    async (rawToken: string) => {
      if (!onScanCheckIn) return;

      const token = rawToken.trim();
      if (!token) return;

      setScanError(null);
      setScanStatusMessage(null);

      try {
        await onScanCheckIn(token);
        setScanStatusMessage(`Checked in token ${token.slice(0, 10)}${token.length > 10 ? '...' : ''}`);
      } catch {
        setScanError('Failed to check in scanned token.');
      }
    },
    [onScanCheckIn]
  );

  const handleCameraTokenScanned = useCallback(
    (token: string) => {
      setScanToken(token);
      void submitScanCheckIn(token).then(() => {
        setScanToken('');
      });
    },
    [submitScanCheckIn]
  );

  const loadCasesForRegistration = useCallback(async (registration: EventRegistration) => {
    if (caseOptionsByContact[registration.contact_id]) {
      return;
    }

    setCaseOptionsLoadingContactId(registration.contact_id);
    try {
      const response = await casesApiClient.listCases({
        contactId: registration.contact_id,
        limit: 100,
      });
      setCaseOptionsByContact((current) => ({
        ...current,
        [registration.contact_id]: (response.cases || []).map((caseItem) => ({
          id: caseItem.id,
          case_number: caseItem.case_number,
          title: caseItem.title,
        })),
      }));
    } finally {
      setCaseOptionsLoadingContactId((current) =>
        current === registration.contact_id ? null : current
      );
    }
  }, [caseOptionsByContact]);

  const openManageRegistration = useCallback(
    async (registration: EventRegistration) => {
      setEditingRegistrationId(registration.registration_id);
      setManageDraft({
        registration_status: registration.registration_status,
        notes: registration.notes || '',
        case_id: registration.case_id || '',
      });
      setManageError(null);
      setManageMessage(null);
      await loadCasesForRegistration(registration);
    },
    [loadCasesForRegistration]
  );

  const handleSendConfirmationEmail = useCallback(
    async (registrationId: string) => {
      if (!onSendConfirmationEmail) {
        return;
      }

      setConfirmationEmailLoadingId(registrationId);
      setManageError(null);
      try {
        await onSendConfirmationEmail(registrationId);
        setManageMessage('Confirmation email sent.');
      } catch (error) {
        setManageError(error instanceof Error ? error.message : 'Failed to send confirmation email.');
      } finally {
        setConfirmationEmailLoadingId((current) => (current === registrationId ? null : current));
      }
    },
    [onSendConfirmationEmail]
  );

  const closeManageRegistration = useCallback(() => {
    setEditingRegistrationId(null);
    setManageDraft(null);
    setManageError(null);
    setManageMessage(null);
  }, []);

  const submitManageRegistration = useCallback(async () => {
    if (!editingRegistrationId || !manageDraft) {
      return;
    }

    setManageError(null);
    setManageMessage(null);

    try {
      await onUpdateRegistration(editingRegistrationId, {
        registration_status: manageDraft.registration_status,
        notes: manageDraft.notes.trim() || undefined,
        case_id: manageDraft.case_id || null,
        occurrence_id: activeOccurrence?.occurrence_id ?? undefined,
        scope: batchScope,
      });
      setManageMessage('Registration updated.');
    } catch (error) {
      setManageError(error instanceof Error ? error.message : 'Failed to update registration.');
    }
  }, [activeOccurrence?.occurrence_id, batchScope, editingRegistrationId, manageDraft, onUpdateRegistration]);

  return (
    <div className="rounded-lg bg-app-surface p-6 shadow-md">
      {(localError || remindersError) && (
        <div className="mb-4 rounded-md bg-app-accent-soft p-3 text-sm text-app-accent-text">{localError || remindersError}</div>
      )}

      <div className="mb-4 rounded-lg border border-app-border bg-app-surface-muted p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-app-text">Occurrence context</h3>
            <p className="mt-1 text-sm text-app-text-muted">
              Scope-sensitive registration, check-in, and reminder work starts here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-semibold text-app-accent-text">
              {batchScopeLabel}
            </span>
            <span className="rounded-full bg-app-surface px-3 py-1 text-xs text-app-text-muted">
              {batchScopeHint}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
          <div className="rounded-md border border-app-border bg-app-surface p-3">
            <label htmlFor="event-occurrence-select" className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
              Selected occurrence
            </label>
            <select
              id="event-occurrence-select"
              value={occurrenceOptions.length === 0 ? '' : activeOccurrence?.occurrence_id ?? ''}
              onChange={(event) => onSelectOccurrence?.(event.target.value)}
              disabled={occurrenceOptions.length === 0}
              className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
            >
              {occurrenceOptions.length === 0 && (
                <option value="">Series overview only</option>
              )}
              {occurrenceOptions.map((occurrence) => (
                <option key={occurrence.occurrence_id} value={occurrence.occurrence_id}>
                  {getEventOccurrenceLabel(occurrence)}
                </option>
              ))}
            </select>
            {activeOccurrence ? (
              <p className="mt-2 text-xs text-app-text-muted">
                {getOccurrenceDateRange(activeOccurrence)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-app-text-muted">
                This event currently behaves like a single occurrence series placeholder.
              </p>
            )}
          </div>

          <div className="rounded-md border border-app-border bg-app-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">Batch scope</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['occurrence', 'future_occurrences', 'series'] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => onChangeBatchScope?.(scope)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    batchScope === scope
                      ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                      : 'bg-app-surface-muted text-app-text-muted'
                  }`}
                >
                  {getEventBatchScopeLabel(scope)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-app-text-muted">
              Registration updates respect the selected scope so occurrence-only fixes and broader series actions stay
              explicit.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-app-border bg-app-surface-muted p-4">
        <h3 className="text-lg font-semibold text-app-text">Public Kiosk Check-In</h3>
        <p className="mt-1 text-sm text-app-text-muted">
          Allow attendees to self check-in at the event with a staff-issued PIN.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-app-text">
            <input
              type="checkbox"
              checked={kioskEnabledDraft}
              disabled={checkInSettingsLoading || kioskBusy}
              onChange={(event) => setKioskEnabledDraft(event.target.checked)}
            />
            Enable public kiosk
          </label>
          <button
            type="button"
            onClick={() => void saveKioskSettings()}
            disabled={checkInSettingsLoading || kioskBusy}
            className="rounded-md border border-app-border px-3 py-1.5 text-sm hover:bg-app-surface disabled:opacity-60"
          >
            {kioskBusy ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => void rotateKioskPin()}
            disabled={checkInSettingsLoading || kioskBusy}
            className="rounded-md bg-app-accent px-3 py-1.5 text-sm text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-60"
          >
            Rotate PIN
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded bg-app-surface px-2 py-1 text-xs text-app-text">{kioskUrl}</code>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(kioskUrl)}
            className="rounded border border-app-border px-2 py-1 text-xs hover:bg-app-surface"
          >
            Copy URL
          </button>
        </div>

        {checkInSettings?.public_checkin_pin_rotated_at && (
          <p className="mt-2 text-xs text-app-text-muted">
            Last PIN rotation:{' '}
            {new Date(checkInSettings.public_checkin_pin_rotated_at).toLocaleString()}
          </p>
        )}

        {latestPin && (
          <p className="mt-2 text-sm font-medium text-app-accent-text">
            Current PIN: <span className="font-mono">{latestPin}</span>
          </p>
        )}
        {kioskMessage && <p className="mt-2 text-sm text-app-accent">{kioskMessage}</p>}
        {kioskError && <p className="mt-2 text-sm text-app-accent-text">{kioskError}</p>}
      </div>

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

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold">Event Registrations</h3>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {onScanCheckIn && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  value={scanToken}
                  onChange={(event) => setScanToken(event.target.value)}
                  placeholder="Scan token"
                  className="rounded-md border px-3 py-2"
                />
                <button
                  type="button"
                  disabled={!scanToken.trim() || actionLoading}
                  onClick={() => {
                    const token = scanToken.trim();
                    if (!token) return;
                    void submitScanCheckIn(token).then(() => {
                      setScanToken('');
                    });
                  }}
                  className="rounded-md bg-app-accent px-3 py-2 text-xs text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-50"
                >
                  QR Check-In
                </button>
                <button
                  type="button"
                  onClick={() => setCameraScannerOpen((current) => !current)}
                  className="rounded-md border px-3 py-2 text-xs hover:bg-app-surface-muted"
                >
                  {cameraScannerOpen ? 'Close Camera' : 'Open Camera'}
                </button>
              </div>
              {scanStatusMessage && <p className="text-xs text-app-accent">{scanStatusMessage}</p>}
              {scanError && <p className="text-xs text-app-accent-text">{scanError}</p>}
              {cameraScannerOpen && (
                <Suspense fallback={<div className="mt-2 rounded-md border border-app-border bg-app-surface p-3 text-xs text-app-text-muted">Initializing camera scanner...</div>}>
                  <EventQrScanner
                    enabled={cameraScannerOpen}
                    disabled={actionLoading}
                    onTokenScanned={handleCameraTokenScanned}
                  />
                </Suspense>
              )}
            </div>
          )}
          <input
            value={registrationSearch}
            onChange={(event) => setRegistrationSearch(event.target.value)}
            placeholder="Search attendee or token"
            className="rounded-md border px-3 py-2"
          />
          <select
            value={registrationFilter}
            onChange={(event) => setRegistrationFilter(event.target.value)}
            className="rounded-md border px-4 py-2"
          >
            <option value="">All Statuses</option>
            <option value="registered">Registered</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="confirmed">Confirmed</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {filteredRegistrations.length === 0 ? (
        <div className="py-8 text-center text-app-text-muted">No registrations found for this event.</div>
      ) : (
        <div className="overflow-x-auto">
          {(manageError || manageMessage) && (
            <div className="mb-4 rounded-md border border-app-border bg-app-surface-muted p-3 text-sm">
              {manageError ? (
                <p className="text-app-accent-text">{manageError}</p>
              ) : (
                <p className="text-app-accent">{manageMessage}</p>
              )}
            </div>
          )}
          <table className="min-w-full divide-y divide-app-border">
            <thead className="bg-app-surface-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">QR Check-In</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Checked In</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Registered At</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-app-surface">
              {filteredRegistrations.map((registration) => {
                const isManaging = editingRegistrationId === registration.registration_id;
                const caseOptions = caseOptionsByContact[registration.contact_id] || [];
                const manageLoading = caseOptionsLoadingContactId === registration.contact_id;
                const canCheckIn =
                  !registration.checked_in &&
                  !nonAttendableStatuses.has(registration.registration_status);
                const checkInUnavailableReason =
                  registration.checked_in
                    ? 'Already checked in'
                    : registration.registration_status === 'waitlisted'
                    ? 'Waitlisted contacts cannot check in'
                    : registration.registration_status === 'no_show'
                    ? 'No-show contacts cannot check in'
                    : registration.registration_status === 'cancelled'
                    ? 'Cancelled registrations cannot check in'
                    : null;
                const linkedCase = caseOptions.find(
                  (caseOption) => caseOption.id === registration.case_id
                );

                return (
                  <Fragment key={registration.registration_id}>
                    <tr>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-app-text">
                          {registration.contact_name}
                        </div>
                        <div className="text-sm text-app-text-muted">{registration.contact_email}</div>
                        {registration.occurrence_name && (
                          <p className="mt-1 text-xs text-app-text-muted">
                            {registration.occurrence_name}
                          </p>
                        )}
                        {registration.confirmation_email_status && (
                          <p className="mt-1 text-xs text-app-text-muted">
                            Confirmation email:{' '}
                            <span className="font-medium text-app-text">
                              {registration.confirmation_email_status}
                            </span>
                          </p>
                        )}
                        {registration.confirmation_email_sent_at && (
                          <p className="mt-1 text-xs text-app-text-muted">
                            Sent {new Date(registration.confirmation_email_sent_at).toLocaleString()}
                          </p>
                        )}
                        {registration.notes && (
                          <p className="mt-2 max-w-sm whitespace-pre-wrap text-xs text-app-text-muted">
                            {registration.notes}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            to={`/contacts/${registration.contact_id}`}
                            className="text-xs font-semibold text-app-accent hover:text-app-accent-text"
                          >
                            Open Contact
                          </Link>
                          {registration.case_id && (
                            <Link
                              to={`/cases/${registration.case_id}`}
                              className="text-xs font-semibold text-app-accent hover:text-app-accent-text"
                            >
                              Open Case
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {registration.check_in_token ? (
                          <div className="flex items-center gap-3">
                            {qrCodesByRegistration[registration.registration_id] ? (
                              <img
                                src={qrCodesByRegistration[registration.registration_id]}
                                alt="Check-in QR"
                                className="h-14 w-14 rounded border border-app-border bg-white p-1"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded border border-app-border bg-app-surface-muted" />
                            )}
                            <div className="max-w-[240px]">
                              <div className="truncate text-xs text-app-text-muted font-mono">
                                {registration.check_in_token}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  void navigator.clipboard?.writeText(registration.check_in_token || '')
                                }
                                className="mt-1 text-xs text-app-accent hover:text-app-accent-text"
                              >
                                Copy Token
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-app-text-subtle">N/A</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-semibold text-app-accent-text uppercase">
                          {formatRegistrationStatus(registration.registration_status)}
                        </span>
                        {registration.registration_status === 'confirmed' && (
                          <p className="mt-2 text-xs text-app-text-muted">
                            Counts toward attendance totals.
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {registration.checked_in ? (
                          <div>
                            <span className="font-semibold text-app-accent">✓ Yes</span>
                            {registration.check_in_time && (
                              <div className="text-xs text-app-text-muted">
                                {new Date(registration.check_in_time).toLocaleString()}
                              </div>
                            )}
                            {registration.check_in_method && (
                              <div className="text-xs text-app-text-subtle">
                                Method: {registration.check_in_method}
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
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void openManageRegistration(registration)}
                            disabled={actionLoading}
                            className="text-app-accent hover:text-app-accent-text disabled:opacity-60"
                          >
                            Manage
                          </button>
                          {canCheckIn && (
                            <button
                              type="button"
                              onClick={() => void onCheckIn(registration.registration_id)}
                              disabled={actionLoading}
                              className="text-app-accent hover:text-app-accent-text disabled:opacity-60"
                            >
                              Check In
                            </button>
                          )}
                          {!canCheckIn && !registration.checked_in && (
                            <span className="text-xs text-app-text-muted">
                              {checkInUnavailableReason || 'Check-in unavailable'}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => void onCancelRegistration(registration.registration_id)}
                            disabled={actionLoading}
                            className="text-app-accent hover:text-app-accent-text disabled:opacity-60"
                          >
                            Remove
                          </button>
                          {onSendConfirmationEmail && confirmationEmailEligibleStatuses.has(registration.registration_status) && (
                            <button
                              type="button"
                              onClick={() => void handleSendConfirmationEmail(registration.registration_id)}
                              disabled={actionLoading || confirmationEmailLoadingId === registration.registration_id}
                              className="text-app-accent hover:text-app-accent-text disabled:opacity-60"
                            >
                              {confirmationEmailLoadingId === registration.registration_id
                                ? 'Sending email...'
                                : registration.confirmation_email_sent_at
                                  ? 'Resend QR Email'
                                  : 'Send QR Email'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isManaging && manageDraft && (
                      <tr key={`${registration.registration_id}-manage`}>
                        <td colSpan={6} className="px-6 py-4 bg-app-surface-muted">
                          <div className="mb-4 flex flex-wrap gap-2 text-xs text-app-text-muted">
                            <span className="rounded bg-app-surface px-2 py-1">
                              Current status: {formatRegistrationStatus(registration.registration_status)}
                            </span>
                            <span className="rounded bg-app-surface px-2 py-1">
                              Check-in: {registration.checked_in ? 'Complete' : 'Pending'}
                            </span>
                            {linkedCase && (
                              <span className="rounded bg-app-surface px-2 py-1">
                                Linked case: {linkedCase.case_number}
                              </span>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <label
                                htmlFor={`registration-status-${registration.registration_id}`}
                                className="mb-1 block text-xs font-black uppercase text-app-text-muted"
                              >
                                Status
                              </label>
                              <select
                                id={`registration-status-${registration.registration_id}`}
                                value={manageDraft.registration_status}
                                onChange={(event) =>
                                  setManageDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          registration_status: event.target
                                            .value as RegistrationStatus,
                                        }
                                      : current
                                  )
                                }
                                className="w-full rounded-md border px-3 py-2"
                              >
                                <option value="registered">Registered</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="waitlisted">Waitlisted</option>
                                <option value="no_show">No Show</option>
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor={`registration-case-${registration.registration_id}`}
                                className="mb-1 block text-xs font-black uppercase text-app-text-muted"
                              >
                                Linked Case
                              </label>
                              <select
                                id={`registration-case-${registration.registration_id}`}
                                value={manageDraft.case_id}
                                onChange={(event) =>
                                  setManageDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          case_id: event.target.value,
                                        }
                                      : current
                                  )
                                }
                                className="w-full rounded-md border px-3 py-2"
                                disabled={manageLoading}
                              >
                                <option value="">No linked case</option>
                                {caseOptions.map((caseOption) => (
                                  <option key={caseOption.id} value={caseOption.id}>
                                    {caseOption.case_number} - {caseOption.title}
                                  </option>
                                ))}
                              </select>
                              {manageLoading && (
                                <p className="mt-1 text-xs text-app-text-muted">
                                  Loading cases...
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor={`registration-notes-${registration.registration_id}`}
                                className="mb-1 block text-xs font-black uppercase text-app-text-muted"
                              >
                                Internal Notes
                              </label>
                              <textarea
                                id={`registration-notes-${registration.registration_id}`}
                                value={manageDraft.notes}
                                onChange={(event) =>
                                  setManageDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          notes: event.target.value,
                                        }
                                      : current
                                  )
                                }
                                rows={3}
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="Registration notes for staff..."
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              to={`/contacts/${registration.contact_id}`}
                              className="rounded border border-app-border bg-app-surface px-3 py-2 text-xs font-black uppercase text-app-text hover:bg-app-hover"
                            >
                              Open Contact
                            </Link>
                            {manageDraft.case_id && (
                              <Link
                                to={`/cases/${manageDraft.case_id}`}
                                className="rounded border border-app-border bg-app-surface px-3 py-2 text-xs font-black uppercase text-app-text hover:bg-app-hover"
                              >
                                Open Linked Case
                              </Link>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void submitManageRegistration()}
                              disabled={actionLoading}
                              className="rounded-md bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-60"
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => closeManageRegistration()}
                              disabled={actionLoading}
                              className="rounded-md border px-4 py-2 hover:bg-app-surface disabled:opacity-60"
                            >
                              Close
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
