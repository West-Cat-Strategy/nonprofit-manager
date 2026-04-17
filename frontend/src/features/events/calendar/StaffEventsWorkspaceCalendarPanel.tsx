import BookingCalendarView from '../../../components/calendar/BookingCalendarView';
import type { StaffCalendarEntry } from '../scheduling/staffCalendarEntries';

interface StaffEventsWorkspaceCalendarPanelProps {
  entries: StaffCalendarEntry[];
  loading: boolean;
  selectedDate: Date;
  selectedEntryId: string | null;
  visibleMonth: Date;
  onDateSelect: (date: Date) => void;
  onEntryClick: (entry: StaffCalendarEntry) => void;
  onMonthRangeChange: (range: { startDate: string; endDate: string }) => void;
  onVisibleMonthChange: (nextMonth: Date) => void;
}

export default function StaffEventsWorkspaceCalendarPanel({
  entries,
  loading,
  selectedDate,
  selectedEntryId,
  visibleMonth,
  onDateSelect,
  onEntryClick,
  onMonthRangeChange,
  onVisibleMonthChange,
}: StaffEventsWorkspaceCalendarPanelProps) {
  return (
    <BookingCalendarView
      entries={entries}
      loading={loading}
      selectedDate={selectedDate}
      selectedEntryId={selectedEntryId}
      visibleMonth={visibleMonth}
      onDateSelect={onDateSelect}
      onEntryClick={onEntryClick}
      onMonthRangeChange={onMonthRangeChange}
      onVisibleMonthChange={onVisibleMonthChange}
    />
  );
}
