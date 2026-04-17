import { useCallback, useState } from 'react';
import type {
  CreateEventReminderAutomationDTO,
  EventOccurrence,
  EventReminderAutomation,
} from '../../../types/event';
import type { ReminderRelativeUnit } from '../utils/reminderTime';
import {
  convertZonedDateTimeToUtcIso,
  formatDateTimeLocalInTimeZone,
  toMinutes,
  toRelativeDisplay,
} from '../utils/reminderTime';
import type { ReminderRetryDraft } from '../components/eventRegistrationsPanelShared';
import { MAX_CUSTOM_MESSAGE_LENGTH } from '../components/eventRegistrationsPanelShared';

interface UseEventRegistrationRemindersArgs {
  activeOccurrence: EventOccurrence | null;
  eventStartDate: string;
  organizationTimezone: string;
  onCreateAutomation: (payload: CreateEventReminderAutomationDTO) => Promise<void>;
  onSendReminders: (payload: {
    sendEmail: boolean;
    sendSms: boolean;
    customMessage?: string;
  }) => Promise<void>;
}

export function useEventRegistrationReminders({
  activeOccurrence,
  eventStartDate,
  organizationTimezone,
  onCreateAutomation,
  onSendReminders,
}: UseEventRegistrationRemindersArgs) {
  const [sendEmailReminders, setSendEmailReminders] = useState(true);
  const [sendSmsReminders, setSendSmsReminders] = useState(true);
  const [customReminderMessage, setCustomReminderMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [retryDraft, setRetryDraft] = useState<ReminderRetryDraft | null>(null);

  const startRetryDraft = useCallback(
    (automation: EventReminderAutomation) => {
      const relative = toRelativeDisplay(automation.relative_minutes_before);
      const timezone = automation.timezone || organizationTimezone;

      setLocalError(null);
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
    },
    [eventStartDate, organizationTimezone]
  );

  const submitSendReminders = useCallback(async () => {
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
  }, [customReminderMessage, onSendReminders, sendEmailReminders, sendSmsReminders]);

  const submitRetryAutomation = useCallback(async () => {
    if (!retryDraft) {
      return;
    }

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
          relativeMinutesBefore: toMinutes(
            Math.floor(retryDraft.relativeValue),
            retryDraft.relativeUnit as ReminderRelativeUnit
          ),
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
  }, [activeOccurrence?.occurrence_id, onCreateAutomation, retryDraft]);

  return {
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
  };
}
