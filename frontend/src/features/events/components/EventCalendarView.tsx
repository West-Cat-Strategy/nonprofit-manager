import { useEffect, useMemo, useState } from 'react';
import type { Event, EventType } from '../../../types/event';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

interface EventCalendarViewProps {
  events: Event[];
  loading?: boolean;
  onEventClick?: (event: Event) => void;
  onMonthRangeChange?: (range: { startDate: string; endDate: string }) => void;
}

export default function EventCalendarView({
  events,
  loading = false,
  onEventClick,
  onMonthRangeChange,
}: EventCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!onMonthRangeChange) return;

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    onMonthRangeChange({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  }, [currentMonth, onMonthRangeChange]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};

    events.forEach((event) => {
      const dateKey = format(parseISO(event.start_date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const getEventTypeColor = (type: EventType): string => {
    switch (type) {
      case 'fundraiser':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'volunteer':
        return 'bg-app-accent-soft text-app-accent-text hover:bg-app-accent-soft-hover';
      case 'community':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'training':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'meeting':
        return 'bg-app-surface-muted text-app-text hover:bg-app-surface-muted';
      case 'social':
        return 'bg-pink-100 text-pink-800 hover:bg-pink-200';
      default:
        return 'bg-app-surface-muted text-app-text hover:bg-app-surface-muted';
    }
  };

  return (
    <div className="relative rounded-lg bg-app-surface shadow">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-xl font-semibold text-app-text">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted hover:bg-app-surface-muted"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 text-app-text-muted hover:text-app-text"
            aria-label="Previous month"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 text-app-text-muted hover:text-app-text"
            aria-label="Next month"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2 grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-app-text-muted">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={dateKey}
                className={`min-h-24 cursor-pointer rounded-lg border p-2 transition-colors ${
                  !isCurrentMonth
                    ? 'bg-app-surface-muted text-app-text-subtle'
                    : 'bg-app-surface hover:bg-app-surface-muted'
                } ${isSelected ? 'ring-2 ring-app-accent' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${
                      isDayToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-app-accent text-white' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && <span className="text-xs text-app-text-muted">{dayEvents.length}</span>}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.event_id}
                      className={`cursor-pointer truncate rounded px-2 py-1 text-xs font-medium ${getEventTypeColor(event.event_type)}`}
                      onClick={(entryClickEvent) => {
                        entryClickEvent.stopPropagation();
                        onEventClick?.(event);
                      }}
                      title={event.event_name}
                    >
                      {format(parseISO(event.start_date), 'HH:mm')} {event.event_name}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-center text-xs text-app-text-muted">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-app-surface/75">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-accent border-t-transparent" />
        </div>
      )}
    </div>
  );
}
