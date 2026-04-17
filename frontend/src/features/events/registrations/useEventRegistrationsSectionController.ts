import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../../../contexts/useToast';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import type { RootState } from '../../../store';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type {
  CreateEventReminderAutomationDTO,
  EventCheckInSettings,
  EventOccurrence,
  EventReminderAutomation,
  UpdateRegistrationDTO,
} from '../../../types/event';
import { eventsApiClient } from '../api/eventsApiClient';
import type { EventDetailTab } from '../scheduling/useEventScheduleState';
import {
  cancelEventAutomationV2,
  cancelEventRegistrationV2,
  checkInRegistrationV2,
  createEventAutomationV2,
  fetchEventAutomationsV2,
  fetchEventDetailV2,
  fetchEventRegistrationsV2,
  sendEventRemindersV2,
  updateEventRegistrationV2,
} from '../state';
import { clearEventRegistrationsV2 } from '../state/eventRegistrationSlice';
import { clearEventRemindersStateV2 } from '../state/eventRemindersSlice';

interface UseEventRegistrationsSectionControllerArgs {
  activeTab: EventDetailTab;
  eventId: string | null;
  eventOccurrences: EventOccurrence[];
  selectedOccurrence: EventOccurrence | null;
}

export interface EventRegistrationsSectionController {
  automationState: RootState['events']['automation'];
  checkInSettings: EventCheckInSettings | null;
  checkInSettingsLoading: boolean;
  dialogState: ReturnType<typeof useConfirmDialog>['dialogState'];
  handleCancel: ReturnType<typeof useConfirmDialog>['handleCancel'];
  handleCancelAutomation: (automation: EventReminderAutomation) => Promise<void>;
  handleCancelRegistration: (registrationId: string) => Promise<void>;
  handleCheckIn: (registrationId: string) => Promise<void>;
  handleConfirm: ReturnType<typeof useConfirmDialog>['handleConfirm'];
  handleCreateAutomation: (payload: CreateEventReminderAutomationDTO) => Promise<void>;
  handleRotateCheckInPin: () => Promise<string>;
  handleScanCheckIn: (token: string) => Promise<void>;
  handleSendConfirmationEmail: (registrationId: string) => Promise<void>;
  handleSendReminders: (payload: {
    sendEmail: boolean;
    sendSms: boolean;
    customMessage?: string;
  }) => Promise<void>;
  handleUpdateCheckInSettings: (enabled: boolean) => Promise<void>;
  handleUpdateRegistration: (
    registrationId: string,
    payload: UpdateRegistrationDTO
  ) => Promise<void>;
  registrationState: RootState['events']['registration'];
  remindersState: RootState['events']['reminders'];
}

export default function useEventRegistrationsSectionController({
  activeTab,
  eventId,
  eventOccurrences,
  selectedOccurrence,
}: UseEventRegistrationsSectionControllerArgs): EventRegistrationsSectionController {
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useToast();
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();
  const registrationState = useAppSelector((state) => state.events.registration);
  const remindersState = useAppSelector((state) => state.events.reminders);
  const automationState = useAppSelector((state) => state.events.automation);
  const [checkInSettings, setCheckInSettings] = useState<EventCheckInSettings | null>(null);
  const [checkInSettingsLoading, setCheckInSettingsLoading] = useState(false);
  const automationsLoadedForEventId = useRef<string | null>(null);
  const selectedOccurrenceId = selectedOccurrence?.occurrence_id ?? null;

  const fetchRegistrations = useCallback(() => {
    if (!eventId) {
      return;
    }

    dispatch(
      fetchEventRegistrationsV2({
        eventId,
        filters: selectedOccurrenceId ? { occurrence_id: selectedOccurrenceId } : undefined,
      })
    );
  }, [dispatch, eventId, selectedOccurrenceId]);

  const refreshDetailData = useCallback(() => {
    if (!eventId) {
      return;
    }

    dispatch(fetchEventDetailV2(eventId));
    fetchRegistrations();
  }, [dispatch, eventId, fetchRegistrations]);

  useEffect(() => {
    setCheckInSettings(null);
    setCheckInSettingsLoading(false);
    automationsLoadedForEventId.current = null;
  }, [eventId]);

  useEffect(() => {
    return () => {
      dispatch(clearEventRegistrationsV2());
      dispatch(clearEventRemindersStateV2());
    };
  }, [dispatch, eventId]);

  useEffect(() => {
    if (!eventId || activeTab !== 'registrations') {
      return;
    }

    if (automationsLoadedForEventId.current === eventId) {
      return;
    }

    dispatch(fetchEventAutomationsV2(eventId));
    automationsLoadedForEventId.current = eventId;
  }, [activeTab, dispatch, eventId]);

  useEffect(() => {
    if (!eventId || activeTab !== 'registrations') {
      return;
    }

    if (eventOccurrences.length > 0 && !selectedOccurrence) {
      return;
    }

    fetchRegistrations();
    setCheckInSettingsLoading(true);

    void eventsApiClient
      .getCheckInSettings(eventId, selectedOccurrenceId ?? undefined)
      .then((settings) => {
        setCheckInSettings(settings);
      })
      .catch(() => {
        setCheckInSettings(null);
      })
      .finally(() => {
        setCheckInSettingsLoading(false);
      });
  }, [
    activeTab,
    eventId,
    eventOccurrences.length,
    fetchRegistrations,
    selectedOccurrence,
    selectedOccurrenceId,
  ]);

  const handleCheckIn = async (registrationId: string) => {
    const confirmed = await confirm({
      title: 'Check In Attendee',
      message: selectedOccurrence
        ? `Check in this attendee for ${selectedOccurrence.occurrence_name ?? 'the selected occurrence'}?`
        : 'Check in this attendee?',
      confirmLabel: 'Check In',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }

    try {
      await dispatch(checkInRegistrationV2(registrationId)).unwrap();
      showSuccess('Attendee checked in');
      refreshDetailData();
    } catch {
      showError('Failed to check in attendee');
    }
  };

  const handleCancelRegistration = async (registrationId: string) => {
    const confirmed = await confirm({
      title: 'Cancel Registration',
      message: 'Cancel this registration? This will reduce the event capacity.',
      confirmLabel: 'Cancel Registration',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      await dispatch(cancelEventRegistrationV2(registrationId)).unwrap();
      showSuccess('Registration cancelled');
      refreshDetailData();
    } catch {
      showError('Failed to cancel registration');
    }
  };

  const handleUpdateRegistration = async (
    registrationId: string,
    payload: UpdateRegistrationDTO
  ) => {
    try {
      await dispatch(updateEventRegistrationV2({ registrationId, payload })).unwrap();
      showSuccess('Registration updated');
      refreshDetailData();
    } catch (error) {
      showError('Failed to update registration');
      throw error;
    }
  };

  const handleScanCheckIn = async (token: string) => {
    if (!eventId) {
      return;
    }

    try {
      await eventsApiClient.scanCheckIn(eventId, token);
      showSuccess('QR check-in successful');
      refreshDetailData();
    } catch {
      showError('Failed to check in with scanned token');
    }
  };

  const handleSendReminders = async (payload: {
    sendEmail: boolean;
    sendSms: boolean;
    customMessage?: string;
  }) => {
    if (!eventId) {
      return;
    }

    const channelLabel = [payload.sendEmail ? 'email' : '', payload.sendSms ? 'sms' : '']
      .filter(Boolean)
      .join(' and ');

    const confirmed = await confirm({
      title: 'Send Event Reminders',
      message: `Send ${channelLabel.toUpperCase()} reminders to registered attendees?`,
      confirmLabel: 'Send Reminders',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }

    try {
      const summary = await dispatch(
        sendEventRemindersV2({
          eventId,
          payload: {
            ...payload,
            occurrence_id: selectedOccurrenceId ?? undefined,
          },
        })
      ).unwrap();
      showSuccess(`Reminders processed. Email sent: ${summary.email.sent}, SMS sent: ${summary.sms.sent}.`);
      if (summary.warnings.length > 0) {
        showError(summary.warnings[0]);
      }
    } catch {
      showError('Failed to send reminders');
    }
  };

  const handleCancelAutomation = async (automation: EventReminderAutomation) => {
    if (!eventId) {
      return;
    }

    const confirmed = await confirm({
      title: 'Cancel Automated Reminder',
      message: 'Cancel this pending automated reminder?',
      confirmLabel: 'Cancel Reminder',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      await dispatch(cancelEventAutomationV2({ eventId, automationId: automation.id })).unwrap();
      showSuccess('Automated reminder cancelled');
      await dispatch(fetchEventAutomationsV2(eventId));
    } catch {
      showError('Failed to cancel automated reminder');
    }
  };

  const handleCreateAutomation = async (payload: CreateEventReminderAutomationDTO) => {
    if (!eventId) {
      return;
    }

    try {
      await dispatch(
        createEventAutomationV2({
          eventId,
          payload: {
            ...payload,
            occurrenceId: selectedOccurrenceId ?? payload.occurrenceId,
          },
        })
      ).unwrap();
      showSuccess('Automated reminder scheduled');
      await dispatch(fetchEventAutomationsV2(eventId));
    } catch {
      showError('Failed to schedule automated reminder');
    }
  };

  const handleUpdateCheckInSettings = async (enabled: boolean) => {
    if (!eventId) {
      return;
    }

    const updated = await eventsApiClient.updateCheckInSettings(eventId, {
      occurrence_id: selectedOccurrenceId ?? undefined,
      public_checkin_enabled: enabled,
    });
    setCheckInSettings(updated);
  };

  const handleRotateCheckInPin = async (): Promise<string> => {
    if (!eventId) {
      throw new Error('Event ID is missing');
    }

    const rotated = await eventsApiClient.rotateCheckInPin(
      eventId,
      selectedOccurrenceId ?? undefined
    );
    setCheckInSettings({
      event_id: rotated.event_id,
      occurrence_id: rotated.occurrence_id,
      public_checkin_enabled: rotated.public_checkin_enabled,
      public_checkin_pin_configured: rotated.public_checkin_pin_configured,
      public_checkin_pin_rotated_at: rotated.public_checkin_pin_rotated_at,
    });
    return rotated.pin;
  };

  const handleSendConfirmationEmail = async (registrationId: string) => {
    try {
      const response = await eventsApiClient.sendRegistrationConfirmationEmail(registrationId);
      showSuccess(response.message || 'Confirmation email sent');
      refreshDetailData();
    } catch {
      showError('Failed to send confirmation email');
    }
  };

  return {
    automationState,
    checkInSettings,
    checkInSettingsLoading,
    dialogState,
    handleCancel,
    handleCancelAutomation,
    handleCancelRegistration,
    handleCheckIn,
    handleConfirm,
    handleCreateAutomation,
    handleRotateCheckInPin,
    handleScanCheckIn,
    handleSendConfirmationEmail,
    handleSendReminders,
    handleUpdateCheckInSettings,
    handleUpdateRegistration,
    registrationState,
    remindersState,
  };
}
