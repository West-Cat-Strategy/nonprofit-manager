import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
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
  visibleMonth?: Date | null;
  onDateSelect?: (date: Date) => void;
  onEntryClick?: (entry: BookingCalendarEntry<TMeta>) => void;
  onMonthRangeChange?: (range: { startDate: string; endDate: string }) => void;
  onVisibleMonthChange?: (date: Date) => void;
}

const getEntryClassName = (entry: BookingCalendarEntry): string => {
  if (entry.kind === 'slot') {
    if (entry.status === 'closed' || entry.status === 'cancelled') {
      return 'border-app-border bg-app-surface text-app-text-muted';
    }
    return 'border-app-accent/30 bg-app-accent-soft text-app-accent-text';
  }

  if (entry.kind === 'appointment') {
    if (entry.status === 'completed') {
      return 'border-emerald-200 bg-emerald-100 text-emerald-800';
    }
    if (entry.status === 'cancelled') {
      return 'border-rose-200 bg-rose-100 text-rose-800';
    }
    if (entry.status === 'requested') {
      return 'border-amber-200 bg-amber-100 text-amber-800';
    }
    return 'border-sky-200 bg-sky-100 text-sky-800';
  }

  if (entry.status === 'cancelled') {
    return 'border-rose-200 bg-rose-100 text-rose-800';
  }
  if (entry.status === 'completed') {
    return 'border-app-border bg-app-surface-muted text-app-text-muted';
  }
  return 'border-violet-200 bg-violet-100 text-violet-800';
};

const getEntryStartDate = (entry: BookingCalendarEntry): Date | null => {
  const parsed = parseISO(entry.start);
  return isValid(parsed) ? parsed : null;
};

export default function BookingCalendarView<TMeta = unknown>({
  entries,
  loading = false,
  selectedDate = null,
  selectedEntryId = null,
  visibleMonth = null,
  onDateSelect,
  onEntryClick,
  onMonthRangeChange,
  onVisibleMonthChange,
}: BookingCalendarViewProps<TMeta>) {
  const [uncontrolledMonth, setUncontrolledMonth] = useState(() => startOfMonth(new Date()));
  const activeMonthKey = visibleMonth
    ? startOfMonth(visibleMonth).getTime()
    : startOfMonth(uncontrolledMonth).getTime();
  const activeMonth = useMemo(() => new Date(activeMonthKey), [activeMonthKey]);

  const setActiveMonth = (nextMonth: Date) => {
    const normalizedMonth = startOfMonth(nextMonth);
    if (!visibleMonth) {
      setUncontrolledMonth(normalizedMonth);
    }
    onVisibleMonthChange?.(normalizedMonth);
  };

  useEffect(() => {
    if (!onMonthRangeChange) {
      return;
    }

    onMonthRangeChange({
      startDate: startOfWeek(startOfMonth(activeMonth)).toISOString(),
      endDate: endOfWeek(endOfMonth(activeMonth)).toISOString(),
    });
  }, [activeMonth, onMonthRangeChange]);

  const entriesByDate = useMemo(() => {
    const grouped: Record<string, BookingCalendarEntry<TMeta>[]> = {};

    for (const entry of entries) {
      const entryDate = getEntryStartDate(entry);
      if (!entryDate) {
        continue;
      }
      const dateKey = format(entryDate, 'yyyy-MM-dd');
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
    const monthStart = startOfMonth(activeMonth);
    const monthEnd = endOfMonth(activeMonth);
    const firstDay = startOfWeek(monthStart);
    const lastDay = endOfWeek(monthEnd);
    const days: Date[] = [];

    let day = firstDay;
    while (day <= lastDay) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [activeMonth]);

  return (
    <div className="relative rounded-2xl border border-app-border bg-app-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-app-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-text-muted">Calendar</p>
          <h2 className="mt-1 text-2xl font-semibold text-app-text">{format(activeMonth, 'MMMM yyyy')}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMonth(new Date())}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setActiveMonth(subMonths(activeMonth, 1))}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
            aria-label="Previous month"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setActiveMonth(addMonths(activeMonth, 1))}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
            aria-label="Next month"
          >
            Next
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
            <div
              key={label}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-app-text-muted"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, activeMonth);
            const isSelectedDay = selectedDate ? isSameDay(day, selectedDate) : false;
            const isDayToday = isToday(day);

            return (
              <div
                key={dateKey}
                className={`group relative min-h-32 rounded-xl border p-2 transition-colors ${
                  isCurrentMonth
                    ? 'border-app-border bg-app-surface hover:border-app-accent/40 hover:bg-app-surface-muted'
                    : 'border-app-border bg-app-surface-muted/70 text-app-text-subtle'
                } ${isSelectedDay ? 'border-app-accent bg-app-accent-soft/20 ring-2 ring-app-accent/70' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onDateSelect?.(day)}
                  className="absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
                  aria-label={`Select ${format(day, 'PPP')}`}
                />

                <div className="relative z-10 pointer-events-none">
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        isDayToday
                          ? 'flex h-8 w-8 items-center justify-center rounded-full bg-app-accent text-[var(--app-accent-foreground)]'
                          : isCurrentMonth
                            ? 'text-app-text'
                            : 'text-app-text-subtle'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEntries.length > 0 ? (
                      <span className="rounded-full bg-app-surface px-2 py-0.5 text-[11px] text-app-text-muted">
                        {dayEntries.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    {dayEntries.slice(0, 3).map((entry) => {
                      const entryStart = getEntryStartDate(entry);
                      if (!entryStart) {
                        return null;
                      }

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEntryClick?.(entry);
                            onDateSelect?.(entryStart);
                          }}
                          className={`pointer-events-auto relative z-20 block w-full truncate rounded-md border px-2 py-1 text-left text-[11px] font-medium transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${
                            getEntryClassName(entry)
                          } ${selectedEntryId === entry.id ? 'ring-1 ring-app-accent ring-offset-1 ring-offset-app-surface' : ''}`}
                          title={entry.title}
                        >
                          {format(entryStart, 'HH:mm')} {entry.title}
                        </button>
                      );
                    })}
                    {dayEntries.length > 3 ? (
                      <div className="text-center text-[11px] text-app-text-muted">
                        +{dayEntries.length - 3} more
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-app-surface/75">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-accent border-t-transparent" />
        </div>
      ) : null}
    </div>
  );
}
