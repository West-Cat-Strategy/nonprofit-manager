import { useEffect, useMemo, useState } from 'react';
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

export type BookingCalendarEntryKind = 'event' | 'appointment' | 'slot';

export interface BookingCalendarEntry<TMeta = unknown> {
  id: string;
  kind: BookingCalendarEntryKind;
  title: string;
  start: string;
  end?: string | null;
  status?: string | null;
  location?: string | null;
  metadata: TMeta;
}

interface BookingCalendarViewProps<TMeta = unknown> {
  entries: BookingCalendarEntry<TMeta>[];
  loading?: boolean;
  selectedDate?: Date | null;
  selectedEntryId?: string | null;
  onDateSelect?: (date: Date) => void;
  onEntryClick?: (entry: BookingCalendarEntry<TMeta>) => void;
  onMonthRangeChange?: (range: { startDate: string; endDate: string }) => void;
}

const getEntryClassName = (entry: BookingCalendarEntry): string => {
  if (entry.kind === 'slot') {
    if (entry.status === 'closed' || entry.status === 'cancelled') {
      return 'bg-app-surface-muted text-app-text-muted';
    }
    return 'bg-app-accent-soft text-app-accent-text';
  }

  if (entry.kind === 'appointment') {
    if (entry.status === 'completed') {
      return 'bg-emerald-100 text-emerald-800';
    }
    if (entry.status === 'cancelled') {
      return 'bg-rose-100 text-rose-800';
    }
    if (entry.status === 'requested') {
      return 'bg-amber-100 text-amber-800';
    }
    return 'bg-sky-100 text-sky-800';
  }

  if (entry.status === 'cancelled') {
    return 'bg-rose-100 text-rose-800';
  }
  if (entry.status === 'completed') {
    return 'bg-app-surface-muted text-app-text-muted';
  }
  return 'bg-violet-100 text-violet-800';
};

export default function BookingCalendarView<TMeta = unknown>({
  entries,
  loading = false,
  selectedDate = null,
  selectedEntryId = null,
  onDateSelect,
  onEntryClick,
  onMonthRangeChange,
}: BookingCalendarViewProps<TMeta>) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!onMonthRangeChange) {
      return;
    }

    onMonthRangeChange({
      startDate: startOfMonth(currentMonth).toISOString(),
      endDate: endOfMonth(currentMonth).toISOString(),
    });
  }, [currentMonth, onMonthRangeChange]);

  const entriesByDate = useMemo(() => {
    const grouped: Record<string, BookingCalendarEntry<TMeta>[]> = {};

    for (const entry of entries) {
      const parsed = parseISO(entry.start);
      if (Number.isNaN(parsed.getTime())) {
        continue;
      }
      const dateKey = format(parsed, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    }

    for (const rows of Object.values(grouped)) {
      rows.sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());
    }

    return grouped;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const firstDay = startOfWeek(monthStart);
    const lastDay = endOfWeek(monthEnd);
    const days: Date[] = [];

    let day = firstDay;
    while (day <= lastDay) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  return (
    <div className="relative rounded-lg border border-app-border bg-app-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
        <h2 className="text-xl font-semibold text-app-text">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text hover:bg-app-surface-muted"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text hover:bg-app-surface-muted"
            aria-label="Previous month"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text hover:bg-app-surface-muted"
            aria-label="Next month"
          >
            Next
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2 grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
            <div key={label} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-app-text-muted">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelectedDay = selectedDate ? isSameDay(day, selectedDate) : false;
            const isDayToday = isToday(day);

            return (
              <div
                key={dateKey}
                role="button"
                tabIndex={0}
                onClick={() => onDateSelect?.(day)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onDateSelect?.(day);
                  }
                }}
                className={`min-h-28 rounded-lg border p-2 text-left transition-colors ${
                  isCurrentMonth
                    ? 'border-app-border bg-app-surface hover:bg-app-surface-muted'
                    : 'border-app-border bg-app-surface-muted text-app-text-subtle'
                } ${isSelectedDay ? 'ring-2 ring-app-accent' : ''}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isDayToday ? 'flex h-7 w-7 items-center justify-center rounded-full bg-app-accent text-[var(--app-accent-foreground)]' : 'text-app-text'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEntries.length > 0 && (
                    <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-[11px] text-app-text-muted">
                      {dayEntries.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEntryClick?.(entry);
                        onDateSelect?.(parseISO(entry.start));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onEntryClick?.(entry);
                          onDateSelect?.(parseISO(entry.start));
                        }
                      }}
                      className={`truncate rounded px-2 py-1 text-[11px] font-medium ${getEntryClassName(entry)} ${
                        selectedEntryId === entry.id ? 'ring-1 ring-app-accent' : ''
                      }`}
                      title={entry.title}
                    >
                      {format(parseISO(entry.start), 'HH:mm')} {entry.title}
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-center text-[11px] text-app-text-muted">
                      +{dayEntries.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-app-surface/75">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-accent border-t-transparent" />
        </div>
      )}
    </div>
  );
}
