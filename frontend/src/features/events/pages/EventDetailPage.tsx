import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AddToCalendar from '../../../components/AddToCalendar';
import ConfirmDialog from '../../../components/ConfirmDialog';
import SocialShare from '../../../components/SocialShare';
import { useToast } from '../../../contexts/useToast';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { getUserTimezoneCached } from '../../../services/userPreferencesService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type {
  CreateEventReminderAutomationDTO,
  EventBatchScope,
  EventCheckInSettings,
  Event,
  EventReminderAutomation,
  UpdateRegistrationDTO,
} from '../../../types/event';
import EventInfoPanel from '../components/EventInfoPanel';
import EventSchedulePanel from '../components/EventSchedulePanel';
import { eventsApiClient } from '../api/eventsApiClient';
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
import { clearEventDetailV2 } from '../state/eventDetailSlice';
import { clearEventRegistrationsV2 } from '../state/eventRegistrationSlice';
import { clearEventRemindersStateV2 } from '../state/eventRemindersSlice';
import {
  buildEventOccurrences,
  getEventOccurrenceById,
} from '../utils/occurrences';
import { getBrowserTimeZone } from '../utils/reminderTime';
import StaffEventsPageShell, {
  staffEventsMetadataBadgeClassName,
  staffEventsPrimaryActionClassName,
  staffEventsSecondaryActionClassName,
} from '../components/StaffEventsPageShell';

const EventRegistrationsPanel = lazy(() => import('../components/EventRegistrationsPanel'));

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useToast();
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();

  const detailState = useAppSelector((state) => state.events.detail);
  const registrationState = useAppSelector((state) => state.events.registration);
  const remindersState = useAppSelector((state) => state.events.reminders);
  const automationState = useAppSelector((state) => state.events.automation);

  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'registrations'>('overview');
  const [organizationTimezone, setOrganizationTimezone] = useState(getBrowserTimeZone());
  const [checkInSettings, setCheckInSettings] = useState<EventCheckInSettings | null>(null);
  const [checkInSettingsLoading, setCheckInSettingsLoading] = useState(false);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [batchScope, setBatchScope] = useState<EventBatchScope>('occurrence');
  const automationsLoadedForEventId = useRef<string | null>(null);

  const event = detailState.event;
  const eventOccurrences = useMemo(() => buildEventOccurrences(event), [event]);
  const selectedOccurrence = useMemo(
    () => getEventOccurrenceById(eventOccurrences, selectedOccurrenceId),
    [eventOccurrences, selectedOccurrenceId]
  );
  const metaDescription =
    selectedOccurrence && event
      ? `${event.event_name} · ${selectedOccurrence.occurrence_name ?? 'Selected occurrence'}`
      : event?.description
        ? event.description
        : event?.event_name
          ? `Join us for ${event.event_name}`
          : undefined;
  const calendarEvent = useMemo<Event | null>(() => {
    if (!event) {
      return null;
    }

    if (!selectedOccurrence) {
      return event;
    }

    const occurrenceLabel =
      selectedOccurrence.occurrence_name && selectedOccurrence.occurrence_name !== event.event_name
        ? `${event.event_name} · ${selectedOccurrence.occurrence_name}`
        : event.event_name;

    return {
      ...event,
      occurrence_id: selectedOccurrence.occurrence_id,
      event_name: occurrenceLabel,
      start_date: selectedOccurrence.start_date,
      end_date: selectedOccurrence.end_date,
      location_name: selectedOccurrence.location_name ?? event.location_name,
      address_line1: selectedOccurrence.address_line1 ?? event.address_line1,
      address_line2: selectedOccurrence.address_line2 ?? event.address_line2,
      city: selectedOccurrence.city ?? event.city,
      state_province: selectedOccurrence.state_province ?? event.state_province,
      postal_code: selectedOccurrence.postal_code ?? event.postal_code,
      country: selectedOccurrence.country ?? event.country,
      next_occurrence_id: selectedOccurrence.occurrence_id,
    };
  }, [event, selectedOccurrence]);

  useDocumentMeta({
    title: event?.event_name,
    description: metaDescription,
    url: `/events/${id}`,
    type: 'event',
  });

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
    if (!id) return;

    dispatch(fetchEventDetailV2(id));
    setCheckInSettings(null);
    setCheckInSettingsLoading(false);
    setSelectedOccurrenceId(null);
    setBatchScope('occurrence');
    automationsLoadedForEventId.current = null;

    return () => {
      dispatch(clearEventDetailV2());
      dispatch(clearEventRegistrationsV2());
      dispatch(clearEventRemindersStateV2());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!eventOccurrences.length) {
      setSelectedOccurrenceId(null);
      return;
    }

    const nextSelected =
      eventOccurrences.find((occurrence) => occurrence.occurrence_id === selectedOccurrenceId) ??
      (event?.next_occurrence_id
        ? eventOccurrences.find((occurrence) => occurrence.occurrence_id === event.next_occurrence_id)
        : null) ??
      eventOccurrences[0];

    if (nextSelected && nextSelected.occurrence_id !== selectedOccurrenceId) {
      setSelectedOccurrenceId(nextSelected.occurrence_id);
    }
  }, [event?.next_occurrence_id, eventOccurrences, selectedOccurrenceId]);

  useEffect(() => {
    const requestedOccurrenceId = searchParams.get('occurrence');
    if (
      !requestedOccurrenceId ||
      !eventOccurrences.some((occurrence) => occurrence.occurrence_id === requestedOccurrenceId)
    ) {
      return;
    }

    if (requestedOccurrenceId !== selectedOccurrenceId) {
      setSelectedOccurrenceId(requestedOccurrenceId);
    }
  }, [eventOccurrences, searchParams, selectedOccurrenceId]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (
      requestedTab === 'overview' ||
      requestedTab === 'schedule' ||
      requestedTab === 'registrations'
    ) {
      if (requestedTab !== activeTab) {
        setActiveTab(requestedTab);
      }
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    if (!id || activeTab !== 'registrations') return;
    if (automationsLoadedForEventId.current === id) return;

    dispatch(fetchEventAutomationsV2(id));
    automationsLoadedForEventId.current = id;
  }, [activeTab, dispatch, id]);

  useEffect(() => {
    if (!id || activeTab !== 'registrations') return;
    if (eventOccurrences.length > 0 && !selectedOccurrence) return;

    dispatch(
      fetchEventRegistrationsV2({
        eventId: id,
        filters: selectedOccurrence?.occurrence_id
          ? { occurrence_id: selectedOccurrence.occurrence_id }
          : undefined,
      })
    );
    setCheckInSettingsLoading(true);
    void eventsApiClient
      .getCheckInSettings(id, selectedOccurrence?.occurrence_id ?? undefined)
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
    dispatch,
    eventOccurrences.length,
    id,
    selectedOccurrence,
    selectedOccurrence?.occurrence_id,
  ]);

  const writeDetailSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const refreshDetailData = () => {
    if (!id) return;
    dispatch(fetchEventDetailV2(id));
    dispatch(
      fetchEventRegistrationsV2({
        eventId: id,
        filters: selectedOccurrence?.occurrence_id
          ? { occurrence_id: selectedOccurrence.occurrence_id }
          : undefined,
      })
    );
  };

  const handleCheckIn = async (registrationId: string) => {
    const confirmed = await confirm({
      title: 'Check In Attendee',
      message: selectedOccurrence
        ? `Check in this attendee for ${selectedOccurrence.occurrence_name ?? 'the selected occurrence'}?`
        : 'Check in this attendee?',
      confirmLabel: 'Check In',
      variant: 'warning',
    });
    if (!confirmed) return;

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
    if (!confirmed) return;

    try {
      await dispatch(cancelEventRegistrationV2(registrationId)).unwrap();
      showSuccess('Registration cancelled');
      refreshDetailData();
    } catch {
      showError('Failed to cancel registration');
    }
  };

  const handleUpdateRegistration = async (registrationId: string, payload: UpdateRegistrationDTO) => {
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
    if (!id) return;

    try {
      await eventsApiClient.scanCheckIn(id, token);
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
    if (!id) return;

    const channelLabel = [payload.sendEmail ? 'email' : '', payload.sendSms ? 'sms' : '']
      .filter(Boolean)
      .join(' and ');

    const confirmed = await confirm({
      title: 'Send Event Reminders',
      message: `Send ${channelLabel.toUpperCase()} reminders to registered attendees?`,
      confirmLabel: 'Send Reminders',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      const summary = await dispatch(
        sendEventRemindersV2({
          eventId: id,
          payload: {
            ...payload,
            occurrence_id: selectedOccurrence?.occurrence_id ?? undefined,
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
    if (!id) return;

    const confirmed = await confirm({
      title: 'Cancel Automated Reminder',
      message: 'Cancel this pending automated reminder?',
      confirmLabel: 'Cancel Reminder',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await dispatch(cancelEventAutomationV2({ eventId: id, automationId: automation.id })).unwrap();
      showSuccess('Automated reminder cancelled');
      await dispatch(fetchEventAutomationsV2(id));
    } catch {
      showError('Failed to cancel automated reminder');
    }
  };

  const handleCreateAutomation = async (payload: CreateEventReminderAutomationDTO) => {
    if (!id) return;

    try {
      await dispatch(
        createEventAutomationV2({
          eventId: id,
          payload: {
            ...payload,
            occurrenceId: selectedOccurrence?.occurrence_id ?? payload.occurrenceId,
          },
        })
      ).unwrap();
      showSuccess('Automated reminder scheduled');
      await dispatch(fetchEventAutomationsV2(id));
    } catch {
      showError('Failed to schedule automated reminder');
    }
  };

  const handleUpdateCheckInSettings = async (enabled: boolean) => {
    if (!id) return;

    const updated = await eventsApiClient.updateCheckInSettings(id, {
      occurrence_id: selectedOccurrence?.occurrence_id ?? undefined,
      public_checkin_enabled: enabled,
    });
    setCheckInSettings(updated);
  };

  const handleRotateCheckInPin = async (): Promise<string> => {
    if (!id) {
      throw new Error('Event ID is missing');
    }

    const rotated = await eventsApiClient.rotateCheckInPin(id, selectedOccurrence?.occurrence_id ?? undefined);
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

  const handleSelectTab = useCallback(
    (tab: 'overview' | 'schedule' | 'registrations') => {
      setActiveTab(tab);
      writeDetailSearchParams({ tab });
    },
    [writeDetailSearchParams]
  );

  const handleSelectOccurrence = useCallback(
    (occurrenceId: string) => {
      setSelectedOccurrenceId(occurrenceId);
      writeDetailSearchParams({ occurrence: occurrenceId });
    },
    [writeDetailSearchParams]
  );

  if (detailState.loading) {
    return (
      <StaffEventsPageShell
        title="Event detail"
        description="Loading the latest event overview, schedule, and registration data."
        backHref="/events"
        backLabel="Back to events"
      >
        <div className="rounded-xl border border-app-border bg-app-surface p-6 text-sm text-app-text-muted shadow-sm">
          Loading event details...
        </div>
      </StaffEventsPageShell>
    );
  }

  if (!event) {
    return (
      <StaffEventsPageShell
        title="Event detail"
        description="This event could not be loaded."
        backHref="/events"
        backLabel="Back to events"
      >
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
          We could not load this event. Try reopening it from the events calendar.
        </div>
      </StaffEventsPageShell>
    );
  }

  return (
    <StaffEventsPageShell
      title={event.event_name}
      description="Review the overview, schedule, registrations, reminders, and check-in settings for this event."
      backHref="/events"
      backLabel="Back to events"
      metadata={
        <>
          <span className={staffEventsMetadataBadgeClassName}>{event.event_type}</span>
          <span className={staffEventsMetadataBadgeClassName}>{event.status}</span>
          <span className={staffEventsMetadataBadgeClassName}>
            {event.is_public ? 'Public' : 'Private'}
          </span>
          {event.is_recurring ? (
            <span className={staffEventsMetadataBadgeClassName}>Recurring series</span>
          ) : null}
          {selectedOccurrence ? (
            <span className={staffEventsMetadataBadgeClassName}>
              {selectedOccurrence.occurrence_name ?? 'Selected occurrence'}
            </span>
          ) : null}
        </>
      }
      actions={
        <>
          {calendarEvent ? <AddToCalendar event={calendarEvent} /> : null}
          <SocialShare
            data={{
              url: `/events/${event.event_id}`,
              title: event.event_name,
              description: event.description || `Join us for ${event.event_name}`,
            }}
          />
          <Link to="/events/calendar" className={staffEventsSecondaryActionClassName}>
            Back to calendar
          </Link>
          <Link to={`/events/${event.event_id}/edit`} className={staffEventsPrimaryActionClassName}>
            Edit event
          </Link>
        </>
      }
    >
      <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
        <nav className="flex flex-wrap gap-2" aria-label="Event detail sections">
          <button
            type="button"
            onClick={() => handleSelectTab('overview')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                : 'bg-app-surface-muted text-app-text hover:bg-app-surface-muted/80'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('schedule')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                : 'bg-app-surface-muted text-app-text hover:bg-app-surface-muted/80'
            }`}
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('registrations')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'registrations'
                ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                : 'bg-app-surface-muted text-app-text hover:bg-app-surface-muted/80'
            }`}
          >
            Registrations ({registrationState.registrations.length || event.registered_count})
          </button>
        </nav>
      </section>

      {activeTab === 'overview' && (
        <EventInfoPanel
          event={event}
          occurrences={eventOccurrences}
          selectedOccurrence={selectedOccurrence}
        />
      )}

      {activeTab === 'schedule' && (
        <EventSchedulePanel
          event={event}
          occurrences={eventOccurrences}
          selectedOccurrenceId={selectedOccurrence?.occurrence_id ?? null}
          batchScope={batchScope}
          onSelectOccurrence={handleSelectOccurrence}
          onChangeBatchScope={setBatchScope}
          onOpenCalendar={() => navigate('/events/calendar')}
          onOpenSeriesEditor={() => navigate(`/events/${event.event_id}/edit`)}
        />
      )}

      {activeTab === 'registrations' && (
        <Suspense
          fallback={
            <div className="rounded-md border border-app-border bg-app-surface p-4 text-center text-sm text-app-text-muted">
              Loading registrations...
            </div>
          }
        >
          <EventRegistrationsPanel
            eventId={event.event_id}
            eventStartDate={selectedOccurrence?.start_date ?? event.start_date}
            selectedOccurrence={selectedOccurrence}
            occurrenceOptions={eventOccurrences}
            batchScope={batchScope}
            organizationTimezone={organizationTimezone}
            registrations={registrationState.registrations}
            checkInSettings={checkInSettings}
            checkInSettingsLoading={checkInSettingsLoading}
            actionLoading={registrationState.actionLoading}
            remindersSending={remindersState.sending}
            remindersError={remindersState.error}
            reminderSummary={remindersState.lastSummary}
            reminderAutomations={automationState.automations}
            automationsLoading={automationState.loading}
            automationsBusy={automationState.cancelling || automationState.creating}
            onCheckIn={handleCheckIn}
            onUpdateRegistration={handleUpdateRegistration}
            onScanCheckIn={handleScanCheckIn}
            onCancelRegistration={handleCancelRegistration}
            onSendReminders={handleSendReminders}
            onUpdateCheckInSettings={handleUpdateCheckInSettings}
            onRotateCheckInPin={handleRotateCheckInPin}
            onSendConfirmationEmail={handleSendConfirmationEmail}
            onCancelAutomation={handleCancelAutomation}
            onCreateAutomation={handleCreateAutomation}
            onChangeBatchScope={setBatchScope}
            onSelectOccurrence={handleSelectOccurrence}
          />
        </Suspense>
      )}

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </StaffEventsPageShell>
  );
}
