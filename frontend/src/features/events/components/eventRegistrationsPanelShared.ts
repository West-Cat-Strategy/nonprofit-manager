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
import type { ReminderRelativeUnit } from '../utils/reminderTime';

export const MAX_CUSTOM_MESSAGE_LENGTH = 500;

export interface ReminderRetryDraft {
  timingType: 'relative' | 'absolute';
  relativeValue: number;
  relativeUnit: ReminderRelativeUnit;
  absoluteLocalDateTime: string;
  sendEmail: boolean;
  sendSms: boolean;
  customMessage: string;
  timezone: string;
}

export interface RegistrationManageDraft {
  registration_status: RegistrationStatus;
  notes: string;
  case_id: string;
}

export interface RegistrationCaseOption {
  id: string;
  case_number: string;
  title: string;
}

export interface EventRegistrationsPanelProps {
  eventId: string;
  eventStartDate: string;
  selectedOccurrence?: EventOccurrence | null;
  occurrenceOptions?: EventOccurrence[];
  batchScope?: EventBatchScope;
  supportsBatchScope?: boolean;
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
    payload: UpdateRegistrationDTO,
    scope?: EventBatchScope
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

export const nonAttendableStatuses = new Set<RegistrationStatus>(['waitlisted', 'no_show', 'cancelled']);
export const confirmationEmailEligibleStatuses = new Set<RegistrationStatus>(['registered', 'confirmed']);

export const formatRegistrationStatus = (status: RegistrationStatus): string =>
  status.replace('_', ' ');

export const getAutomationStatus = (
  automation: EventReminderAutomation
): 'pending' | EventReminderAttemptStatus => {
  if (!automation.attempted_at && automation.is_active) {
    return 'pending';
  }

  return automation.attempt_status || 'cancelled';
};

export const getStatusStyles = (status: 'pending' | EventReminderAttemptStatus): string => {
  switch (status) {
    case 'sent':
    case 'partial':
    case 'failed':
      return 'bg-app-accent-soft text-app-accent-text';
    case 'skipped':
    case 'cancelled':
      return 'bg-app-surface text-app-text';
    default:
      return 'bg-app-accent-soft text-app-accent-text';
  }
};

export const getAttemptSummaryText = (automation: EventReminderAutomation): string | null => {
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
