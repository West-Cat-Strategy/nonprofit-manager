import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import ConfirmDialog from '../../../components/ConfirmDialog';
import type { EventOccurrence } from '../../../types/event';
import StaffEventsPageShell, {
  staffEventsMetadataBadgeClassName,
  staffEventsPrimaryActionClassName,
  staffEventsSecondaryActionClassName,
} from '../components/StaffEventsPageShell';
import {
  buildCurrentEventRouteTarget,
  createEventCreateTarget,
} from '../navigation/eventRouteTargets';
import useStaffEventsWorkspaceController from './useStaffEventsWorkspaceController';
import StaffEventsWorkspaceFiltersPanel from '../calendar/StaffEventsWorkspaceFiltersPanel';
import StaffEventsWorkspaceCalendarPanel from '../calendar/StaffEventsWorkspaceCalendarPanel';
import StaffEventsWorkspaceAgendaPanel from '../calendar/StaffEventsWorkspaceAgendaPanel';
import StaffEventsWorkspaceDetailsPanel from '../calendar/StaffEventsWorkspaceDetailsPanel';
import {
  buildEventDetailHref,
  formatEventType,
  getOccurrenceDateRange,
} from '../scheduling/staffCalendarEntries';
import { parseValidIsoDate } from '../scheduling/staffCalendarQuery';

const inactivePublicEventStatuses = new Set<EventOccurrence['status']>(['cancelled', 'completed']);

const getPendingCheckIns = (occurrence: EventOccurrence): number =>
  Math.max(0, (occurrence.registered_count || 0) - (occurrence.attended_count || 0));

const getOccurrenceStartTime = (occurrence: EventOccurrence): number =>
  parseValidIsoDate(occurrence.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;

const getWaitlistReadinessLabel = (occurrence: EventOccurrence): string =>
  occurrence.waitlist_enabled ? 'Ready' : 'Off';

const getCheckInReadinessLabel = (occurrence: EventOccurrence): string => {
  if (!occurrence.public_checkin_enabled) {
    return 'Closed';
  }

  return occurrence.public_checkin_pin_required === false ||
    occurrence.public_checkin_pin_configured
    ? 'Ready'
    : 'Needs PIN';
};

export default function StaffEventsWorkspaceView() {
  const location = useLocation();
  const controller = useStaffEventsWorkspaceController();
  const {
    dialogState,
    handleCancel,
    handleConfirm,
    isAdmin,
    visibleMonth,
    selectedDate,
    selectedDateEntries,
    entries,
    selectedEntryId,
    selectedEntry,
    selectedOccurrence,
    selectedAppointment,
    selectedSlot,
    selectedOccurrenceLabel,
    searchInput,
    selectedEventType,
    selectedStatus,
    selectedScope,
    activeFilterCount,
    loading,
    calendarLoading,
    error,
    savingEntryId,
    canUseEventActions,
    setSearchInput,
    handleTypeChange,
    handleStatusChange,
    handleScopeChange,
    handleMonthRangeChange,
    handleVisibleMonthChange,
    handleSelectDate,
    handleSelectEntry,
    clearFilters,
    handleConfirmAppointment,
    handleCheckInAppointment,
    handleCancelAppointment,
    handleToggleSlotStatus,
    handleManageSlots,
  } = controller;
  const workspaceTarget = buildCurrentEventRouteTarget(location.pathname, location.search);
  const workspaceReturnTo =
    location.pathname !== '/events' || location.search ? workspaceTarget : null;
  const publicEventSnapshot = useMemo(() => {
    const publicOccurrences = entries.flatMap((entry) =>
      entry.metadata.kind === 'event' && entry.metadata.occurrence.is_public
        ? [entry.metadata.occurrence]
        : []
    );
    const sortedPublicOccurrences = [...publicOccurrences].sort(
      (left, right) => getOccurrenceStartTime(left) - getOccurrenceStartTime(right)
    );
    const activePublicOccurrences = sortedPublicOccurrences.filter(
      (occurrence) => !inactivePublicEventStatuses.has(occurrence.status)
    );
    const nextOccurrence = activePublicOccurrences[0] ?? sortedPublicOccurrences[0] ?? null;

    return {
      events: publicOccurrences.length,
      waitlistEnabled: publicOccurrences.filter((occurrence) => occurrence.waitlist_enabled).length,
      checkInEnabled: publicOccurrences.filter((occurrence) => occurrence.public_checkin_enabled)
        .length,
      pendingCheckIns: publicOccurrences.reduce(
        (total, occurrence) => total + getPendingCheckIns(occurrence),
        0
      ),
      nextOccurrence,
      nextPendingCheckIns: nextOccurrence ? getPendingCheckIns(nextOccurrence) : 0,
      nextWaitlistReadiness: nextOccurrence ? getWaitlistReadinessLabel(nextOccurrence) : null,
      nextCheckInReadiness: nextOccurrence ? getCheckInReadinessLabel(nextOccurrence) : null,
    };
  }, [entries]);

  return (
    <StaffEventsPageShell
      title="Events"
      description="See event occurrences on a real calendar, review the day agenda, and jump straight into details, registrations, reminders, or check-in."
      metadata={
        <>
          <span className={staffEventsMetadataBadgeClassName}>
            {format(visibleMonth, 'MMMM yyyy')}
          </span>
          {activeFilterCount > 0 ? (
            <span className={staffEventsMetadataBadgeClassName}>
              {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
            </span>
          ) : null}
        </>
      }
      actions={
        <>
          <Link
            to={createEventCreateTarget(workspaceReturnTo)}
            className={staffEventsPrimaryActionClassName}
          >
            Create event
          </Link>
          <Link to="/events/check-in" className={staffEventsSecondaryActionClassName}>
            Check-in desk
          </Link>
        </>
      }
    >
      <StaffEventsWorkspaceFiltersPanel
        isAdmin={isAdmin}
        selectedScope={selectedScope}
        searchInput={searchInput}
        selectedEventType={selectedEventType}
        selectedStatus={selectedStatus}
        onSearchInputChange={setSearchInput}
        onTypeChange={handleTypeChange}
        onStatusChange={handleStatusChange}
        onScopeChange={handleScopeChange}
        onClearFilters={clearFilters}
      />

      <section
        aria-labelledby="public-event-operations-title"
        className="rounded-lg border border-app-border bg-app-surface p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="public-event-operations-title"
              className="text-xs font-semibold uppercase text-app-text-muted"
            >
              Public event operations
            </h2>
            <p className="mt-1 text-sm text-app-text-muted">Visible public event readiness</p>
          </div>
          {publicEventSnapshot.nextOccurrence ? (
            <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-medium text-app-accent-text">
              Next in view
            </span>
          ) : null}
        </div>

        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dd className="text-2xl font-semibold text-app-text">{publicEventSnapshot.events}</dd>
            <dt className="text-app-text-muted">public occurrences</dt>
          </div>
          <div>
            <dd className="text-2xl font-semibold text-app-text">
              {publicEventSnapshot.waitlistEnabled}
            </dd>
            <dt className="text-app-text-muted">waitlist enabled</dt>
          </div>
          <div>
            <dd className="text-2xl font-semibold text-app-text">
              {publicEventSnapshot.checkInEnabled}
            </dd>
            <dt className="text-app-text-muted">check-in enabled</dt>
          </div>
          <div>
            <dd className="text-2xl font-semibold text-app-text">
              {publicEventSnapshot.pendingCheckIns}
            </dd>
            <dt className="text-app-text-muted">pending check-ins</dt>
          </div>
        </dl>

        <div className="mt-4 border-t border-app-border pt-4">
          {publicEventSnapshot.nextOccurrence ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-app-text-muted">
                    Next public occurrence
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-app-text">
                    {publicEventSnapshot.nextOccurrence.event_name ||
                      publicEventSnapshot.nextOccurrence.occurrence_name ||
                      'Public event'}
                  </h3>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {getOccurrenceDateRange(publicEventSnapshot.nextOccurrence)}
                    {publicEventSnapshot.nextOccurrence.location_name
                      ? ` at ${publicEventSnapshot.nextOccurrence.location_name}`
                      : ''}
                  </p>
                </div>
                <span className="rounded-full border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text-muted">
                  {formatEventType(publicEventSnapshot.nextOccurrence.event_type)}
                </span>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-app-text-muted">Waitlist</p>
                  <p className="mt-1 font-medium text-app-text">
                    {publicEventSnapshot.nextWaitlistReadiness}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-app-text-muted">Check-in</p>
                  <p className="mt-1 font-medium text-app-text">
                    {publicEventSnapshot.nextCheckInReadiness}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-app-text-muted">Attendance</p>
                  <p className="mt-1 font-medium text-app-text">
                    {publicEventSnapshot.nextPendingCheckIns} pending
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={buildEventDetailHref(publicEventSnapshot.nextOccurrence, {
                    returnTo: workspaceReturnTo,
                  })}
                  className={staffEventsPrimaryActionClassName}
                >
                  Open details
                </Link>
                <Link
                  to={buildEventDetailHref(publicEventSnapshot.nextOccurrence, {
                    tab: 'registrations',
                    returnTo: workspaceReturnTo,
                  })}
                  className={staffEventsSecondaryActionClassName}
                >
                  Review registrations
                </Link>
                {publicEventSnapshot.nextOccurrence.public_checkin_enabled ? (
                  <Link
                    to={`/events/check-in?eventId=${publicEventSnapshot.nextOccurrence.event_id}`}
                    className={staffEventsSecondaryActionClassName}
                  >
                    Open check-in desk
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-app-text-muted">No public event occurrences in this view.</p>
          )}
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-app-border bg-app-accent-soft p-4 text-sm text-app-accent-text">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
        <StaffEventsWorkspaceCalendarPanel
          entries={entries}
          loading={loading || calendarLoading}
          selectedDate={selectedDate}
          selectedEntryId={selectedEntryId}
          visibleMonth={visibleMonth}
          onDateSelect={handleSelectDate}
          onEntryClick={handleSelectEntry}
          onMonthRangeChange={handleMonthRangeChange}
          onVisibleMonthChange={handleVisibleMonthChange}
        />

        <div className="space-y-4">
          <StaffEventsWorkspaceAgendaPanel
            selectedDate={selectedDate}
            selectedDateEntries={selectedDateEntries}
            selectedEntryId={selectedEntryId}
            onSelectEntry={handleSelectEntry}
          />

          <StaffEventsWorkspaceDetailsPanel
            selectedEntry={selectedEntry}
            selectedOccurrence={selectedOccurrence}
            selectedAppointment={selectedAppointment}
            selectedSlot={selectedSlot}
            selectedOccurrenceLabel={selectedOccurrenceLabel}
            canUseEventActions={canUseEventActions}
            savingEntryId={savingEntryId}
            workspaceTarget={workspaceReturnTo}
            onConfirmAppointment={handleConfirmAppointment}
            onCheckInAppointment={handleCheckInAppointment}
            onCancelAppointment={handleCancelAppointment}
            onToggleSlotStatus={handleToggleSlotStatus}
            onManageSlots={handleManageSlots}
          />
        </div>
      </div>

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </StaffEventsPageShell>
  );
}
