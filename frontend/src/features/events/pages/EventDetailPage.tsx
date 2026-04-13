import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AddToCalendar from '../../../components/AddToCalendar';
import ConfirmDialog from '../../../components/ConfirmDialog';
import SocialShare from '../../../components/SocialShare';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { useToast } from '../../../contexts/useToast';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { getUserTimezoneCached } from '../../../services/userPreferencesService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type {
  CreateEventReminderAutomationDTO,
  EventCheckInSettings,
  EventReminderAutomation,
} from '../../../types/event';
import EventInfoPanel from '../components/EventInfoPanel';
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
} from '../state';
import { clearEventDetailV2 } from '../state/eventDetailSlice';
import { clearEventRegistrationsV2 } from '../state/eventRegistrationSlice';
import { clearEventRemindersStateV2 } from '../state/eventRemindersSlice';
import { getBrowserTimeZone } from '../utils/reminderTime';

const EventRegistrationsPanel = lazy(() => import('../components/EventRegistrationsPanel'));

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useToast();
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();

  const detailState = useAppSelector((state) => state.events.detail);
  const registrationState = useAppSelector((state) => state.events.registration);
  const remindersState = useAppSelector((state) => state.events.reminders);
  const automationState = useAppSelector((state) => state.events.automation);

  const [activeTab, setActiveTab] = useState<'info' | 'registrations'>('info');
  const [registrationsTabLoaded, setRegistrationsTabLoaded] = useState(false);
  const [organizationTimezone, setOrganizationTimezone] = useState(getBrowserTimeZone());
  const [checkInSettings, setCheckInSettings] = useState<EventCheckInSettings | null>(null);
  const [checkInSettingsLoading, setCheckInSettingsLoading] = useState(false);

  useDocumentMeta({
    title: detailState.event?.event_name,
    description: detailState.event?.description || `Join us for ${detailState.event?.event_name}`,
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
    setRegistrationsTabLoaded(false);
    setCheckInSettings(null);
    setCheckInSettingsLoading(false);

    return () => {
      dispatch(clearEventDetailV2());
      dispatch(clearEventRegistrationsV2());
      dispatch(clearEventRemindersStateV2());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!id || activeTab !== 'registrations' || registrationsTabLoaded) return;

    dispatch(fetchEventRegistrationsV2(id));
    dispatch(fetchEventAutomationsV2(id));
    setCheckInSettingsLoading(true);
    void eventsApiClient
      .getCheckInSettings(id)
      .then((settings) => {
        setCheckInSettings(settings);
      })
      .catch(() => {
        setCheckInSettings(null);
      })
      .finally(() => {
        setCheckInSettingsLoading(false);
      });
    setRegistrationsTabLoaded(true);
  }, [activeTab, dispatch, id, registrationsTabLoaded]);

  const refreshDetailData = () => {
    if (!id) return;
    dispatch(fetchEventDetailV2(id));
    dispatch(fetchEventRegistrationsV2(id));
  };

  const handleCheckIn = async (registrationId: string) => {
    const confirmed = await confirm({
      title: 'Check In Attendee',
      message: 'Check in this attendee?',
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
      const summary = await dispatch(sendEventRemindersV2({ eventId: id, payload })).unwrap();
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
      await dispatch(createEventAutomationV2({ eventId: id, payload })).unwrap();
      showSuccess('Automated reminder scheduled');
      await dispatch(fetchEventAutomationsV2(id));
    } catch {
      showError('Failed to schedule automated reminder');
    }
  };

  const handleUpdateCheckInSettings = async (enabled: boolean) => {
    if (!id) return;

    const updated = await eventsApiClient.updateCheckInSettings(id, {
      public_checkin_enabled: enabled,
    });
    setCheckInSettings(updated);
  };

  const handleRotateCheckInPin = async (): Promise<string> => {
    if (!id) {
      throw new Error('Event ID is missing');
    }

    const rotated = await eventsApiClient.rotateCheckInPin(id);
    setCheckInSettings({
      event_id: rotated.event_id,
      public_checkin_enabled: rotated.public_checkin_enabled,
      public_checkin_pin_configured: rotated.public_checkin_pin_configured,
      public_checkin_pin_rotated_at: rotated.public_checkin_pin_rotated_at,
    });
    return rotated.pin;
  };

  if (detailState.loading || !detailState.event) {
    return (
      <NeoBrutalistLayout pageTitle="EVENTS">
        <div className="p-6 text-center">Loading event details...</div>
      </NeoBrutalistLayout>
    );
  }

  const event = detailState.event;

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
      <div className="p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">{event.event_name}</h1>
            <div className="flex gap-2">
              <span className="rounded-full bg-app-accent-soft px-3 py-1 text-sm font-semibold text-app-accent-text">
                {event.event_type}
              </span>
              <span className="rounded-full bg-app-surface-muted px-3 py-1 text-sm font-semibold text-app-text">
                {event.status}
              </span>
              <span className="rounded-full border border-black bg-white px-3 py-1 text-sm font-semibold text-black">
                {event.is_public ? 'Public' : 'Private'}
              </span>
              {event.is_recurring && (
                <span className="rounded-full border border-app-accent bg-app-accent-soft px-3 py-1 text-sm font-semibold text-app-accent-text">
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
              type="button"
              onClick={() => navigate(`/events/${id}/edit`)}
              className="rounded-md bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
            >
              Edit Event
            </button>
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="rounded-md border px-4 py-2 hover:bg-app-surface-muted"
            >
              Back to Events
            </button>
          </div>
        </div>

        <div className="mb-6 border-b">
          <nav className="flex gap-4" aria-label="Event detail sections">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`border-b-2 px-4 py-2 font-medium ${
                activeTab === 'info'
                  ? 'border-app-accent text-app-accent'
                  : 'border-transparent text-app-text-muted hover:text-app-text-muted'
              }`}
            >
              Event Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('registrations')}
              className={`border-b-2 px-4 py-2 font-medium ${
                activeTab === 'registrations'
                  ? 'border-app-accent text-app-accent'
                  : 'border-transparent text-app-text-muted hover:text-app-text-muted'
              }`}
            >
              Registrations ({event.registered_count})
            </button>
          </nav>
        </div>

        {activeTab === 'info' && <EventInfoPanel event={event} />}

        {activeTab === 'registrations' && (
          <Suspense fallback={<div className="rounded-md border border-app-border bg-app-surface p-4 text-center text-sm text-app-text-muted">Loading registrations...</div>}>
            <EventRegistrationsPanel
              eventId={event.event_id}
              eventStartDate={event.start_date}
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
              onScanCheckIn={handleScanCheckIn}
              onCancelRegistration={handleCancelRegistration}
              onSendReminders={handleSendReminders}
              onUpdateCheckInSettings={handleUpdateCheckInSettings}
              onRotateCheckInPin={handleRotateCheckInPin}
              onCancelAutomation={handleCancelAutomation}
              onCreateAutomation={handleCreateAutomation}
            />
          </Suspense>
        )}
      </div>

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </NeoBrutalistLayout>
  );
}
