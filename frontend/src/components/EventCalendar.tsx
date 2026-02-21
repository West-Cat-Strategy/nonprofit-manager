import { useCallback } from 'react';
import type { Event } from '../types/event';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEventsListV2 } from '../features/events/state';
import EventCalendarView from '../features/events/components/EventCalendarView';

interface EventCalendarProps {
  onEventClick?: (event: Event) => void;
}

export default function EventCalendar({ onEventClick }: EventCalendarProps) {
  const dispatch = useAppDispatch();
  const listState = useAppSelector((state) => state.eventsListV2);

  const handleMonthRangeChange = useCallback(
    ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      dispatch(
        fetchEventsListV2({
          startDate,
          endDate,
          page: 1,
          limit: 250,
          sortBy: 'start_date',
          sortOrder: 'asc',
        })
      );
    },
    [dispatch]
  );

  return (
    <EventCalendarView
      events={listState.events}
      loading={listState.loading}
      onEventClick={onEventClick}
      onMonthRangeChange={handleMonthRangeChange}
    />
  );
}

export { EventCalendar };
