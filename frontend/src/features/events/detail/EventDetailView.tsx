import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import AddToCalendar from '../../../components/AddToCalendar';
import ConfirmDialog from '../../../components/ConfirmDialog';
import SocialShare from '../../../components/SocialShare';
import EventInfoPanel from '../components/EventInfoPanel';
import EventSchedulePanel from '../components/EventSchedulePanel';
import StaffEventsPageShell, {
  staffEventsMetadataBadgeClassName,
  staffEventsPrimaryActionClassName,
  staffEventsSecondaryActionClassName,
} from '../components/StaffEventsPageShell';
import useEventDetailController from './useEventDetailController';

const EventRegistrationsPanel = lazy(() => import('../components/EventRegistrationsPanel'));

export default function EventDetailView() {
  const {
    activeTab,
    batchScope,
    calendarEvent,
    detailState,
    event,
    eventOccurrences,
    handleSelectOccurrence,
    handleSelectTab,
    navigateToCalendar,
    navigateToEdit,
    organizationTimezone,
    registrations,
    selectedOccurrence,
    setBatchScope,
    supportsBatchScope,
  } = useEventDetailController();

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
        <div className="rounded-xl border border-app-border bg-app-accent-soft p-6 text-sm text-app-accent-text shadow-sm">
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
            Registrations ({registrations.registrationState.registrations.length || event.registered_count})
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
          supportsBatchScope={supportsBatchScope}
          onSelectOccurrence={handleSelectOccurrence}
          onChangeBatchScope={setBatchScope}
          onOpenCalendar={navigateToCalendar}
          onOpenSeriesEditor={navigateToEdit}
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
            supportsBatchScope={supportsBatchScope}
            organizationTimezone={organizationTimezone}
            registrations={registrations.registrationState.registrations}
            checkInSettings={registrations.checkInSettings}
            checkInSettingsLoading={registrations.checkInSettingsLoading}
            actionLoading={registrations.registrationState.actionLoading}
            remindersSending={registrations.remindersState.sending}
            remindersError={registrations.remindersState.error}
            reminderSummary={registrations.remindersState.lastSummary}
            reminderAutomations={registrations.automationState.automations}
            automationsLoading={registrations.automationState.loading}
            automationsBusy={
              registrations.automationState.cancelling || registrations.automationState.creating
            }
            onCheckIn={registrations.handleCheckIn}
            onUpdateRegistration={registrations.handleUpdateRegistration}
            onScanCheckIn={registrations.handleScanCheckIn}
            onCancelRegistration={registrations.handleCancelRegistration}
            onSendReminders={registrations.handleSendReminders}
            onUpdateCheckInSettings={registrations.handleUpdateCheckInSettings}
            onRotateCheckInPin={registrations.handleRotateCheckInPin}
            onSendConfirmationEmail={registrations.handleSendConfirmationEmail}
            onCancelAutomation={registrations.handleCancelAutomation}
            onCreateAutomation={registrations.handleCreateAutomation}
            onChangeBatchScope={setBatchScope}
            onSelectOccurrence={handleSelectOccurrence}
          />
        </Suspense>
      )}

      <ConfirmDialog
        {...registrations.dialogState}
        onConfirm={registrations.handleConfirm}
        onCancel={registrations.handleCancel}
      />
    </StaffEventsPageShell>
  );
}
