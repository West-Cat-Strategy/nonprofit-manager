import BookingCalendarView from '../../../components/calendar/BookingCalendarView';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalCalendarSidebar from './portalCalendar/PortalCalendarSidebar';
import PortalCalendarToolbar from './portalCalendar/PortalCalendarToolbar';
import { usePortalCalendarController } from './portalCalendar/usePortalCalendarController';

export default function PortalCalendarPage() {
  const controller = usePortalCalendarController();

  return (
    <PortalPageShell
      title="Calendar"
      description="See appointments, open booking slots, and events together in one place."
    >
      <PortalPageState
        loading={controller.loading}
        error={controller.error}
        empty={false}
        loadingLabel="Loading calendar..."
        onRetry={() => void controller.loadContext()}
      />

      {!controller.loading && !controller.error && (
        <div className="space-y-4">
          <PortalCalendarToolbar controller={controller} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <BookingCalendarView
              entries={controller.filteredEntries}
              loading={controller.calendarLoading}
              selectedDate={controller.selectedDate}
              selectedEntryId={controller.selectedEntryId}
              onDateSelect={controller.handleSelectDate}
              onEntryClick={controller.handleSelectEntry}
              onMonthRangeChange={controller.handleMonthRangeChange}
            />

            <PortalCalendarSidebar controller={controller} />
          </div>
        </div>
      )}

      <ConfirmDialog
        {...controller.dialogState}
        onConfirm={controller.handleConfirm}
        onCancel={controller.handleCancel}
      />
    </PortalPageShell>
  );
}
