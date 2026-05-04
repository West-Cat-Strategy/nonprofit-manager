import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import ConfirmDialog from '../../../components/ConfirmDialog';
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

    return {
      events: publicOccurrences.length,
      waitlistEnabled: publicOccurrences.filter((occurrence) => occurrence.waitlist_enabled).length,
      checkInEnabled: publicOccurrences.filter((occurrence) => occurrence.public_checkin_enabled)
        .length,
      pendingCheckIns: publicOccurrences.reduce(
        (total, occurrence) =>
          total +
          Math.max(0, (occurrence.registered_count || 0) - (occurrence.attended_count || 0)),
        0
      ),
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

      <div className="rounded-lg border p-4">
        <div className="text-xs uppercase tracking-[0.18em]">
          Public event operations
        </div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <div className="text-2xl font-semibold">{publicEventSnapshot.events}</div>
            <div>public occurrences</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">
              {publicEventSnapshot.waitlistEnabled}
            </div>
            <div>waitlist enabled</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">
              {publicEventSnapshot.checkInEnabled}
            </div>
            <div>check-in enabled</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">
              {publicEventSnapshot.pendingCheckIns}
            </div>
            <div>pending check-ins</div>
          </div>
        </div>
      </div>

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
