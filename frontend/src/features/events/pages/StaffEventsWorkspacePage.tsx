import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  format,
  getDate,
  getDaysInMonth,
  isValid,
  parse,
  parseISO,
  setDate,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import BookingCalendarView, {
  type BookingCalendarEntry,
} from '../../../components/calendar/BookingCalendarView';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { portalAdminAppointmentsApiClient } from '../../adminOps/api/portalAdminAppointmentsApiClient';
import type {
  PortalAdminAppointmentInboxItem,
  PortalAppointmentSlot,
} from '../../adminOps/contracts';
import { canAccessAdminSettings } from '../../auth/state/adminAccess';
import { useToast } from '../../../contexts/useToast';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { useAppSelector } from '../../../store/hooks';
import type { EventOccurrence, EventStatus } from '../../../types/event';
import { formatApiErrorMessage } from '../../../utils/apiError';
import { eventsApiClient } from '../api/eventsApiClient';
import StaffEventsPageShell, {
  staffEventsMetadataBadgeClassName,
  staffEventsPrimaryActionClassName,
  staffEventsSecondaryActionClassName,
} from '../components/StaffEventsPageShell';
import { getEventOccurrenceLabel, getOccurrenceDateRange } from '../utils/occurrences';

type CalendarScope = 'events' | 'all' | 'appointments' | 'slots';

type StaffCalendarEntryMeta =
  | { kind: 'event'; occurrence: EventOccurrence }
  | { kind: 'appointment'; appointment: PortalAdminAppointmentInboxItem }
  | { kind: 'slot'; slot: PortalAppointmentSlot };

const EVENT_TYPE_OPTIONS = [
  ['fundraiser', 'Fundraiser'],
  ['community', 'Community'],
  ['training', 'Training'],
  ['meeting', 'Meeting'],
  ['workshop', 'Workshop'],
  ['webinar', 'Webinar'],
  ['conference', 'Conference'],
  ['outreach', 'Outreach'],
  ['volunteer', 'Volunteer'],
  ['social', 'Social'],
  ['other', 'Other'],
] as const;

const EVENT_STATUS_OPTIONS: Array<[EventStatus, string]> = [
  ['planned', 'Planned'],
  ['active', 'Active'],
  ['postponed', 'Postponed'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
];

const SCOPE_OPTIONS: Array<{ value: CalendarScope; label: string }> = [
  { value: 'events', label: 'Events' },
  { value: 'all', label: 'All Items' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'slots', label: 'Open Slots' },
];

const entryKindLabel: Record<StaffCalendarEntryMeta['kind'], string> = {
  event: 'Event',
  appointment: 'Appointment',
  slot: 'Open Slot',
};

const parseMonthParam = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = parse(value, 'yyyy-MM', new Date());
  return isValid(parsed) ? startOfMonth(parsed) : null;
};

const parseDateParam = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? startOfDay(parsed) : null;
};

const parseValidIsoDate = (value: string): Date | null => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const formatMonthParam = (value: Date): string => format(startOfMonth(value), 'yyyy-MM');

const formatDateParam = (value: Date): string => format(startOfDay(value), 'yyyy-MM-dd');

const formatEventType = (value: string | undefined): string => {
  if (!value) {
    return 'Event';
  }

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const normalizeScope = (value: string | null, isAdmin: boolean): CalendarScope => {
  if (!isAdmin) {
    return 'events';
  }

  switch (value) {
    case 'all':
    case 'appointments':
    case 'slots':
    case 'events':
      return value;
    default:
      return 'events';
  }
};

const normalizeEventStatus = (value: string | null): EventStatus | '' => {
  if (!value) {
    return '';
  }

  return EVENT_STATUS_OPTIONS.some(([status]) => status === value) ? (value as EventStatus) : '';
};

const buildEventDetailHref = (
  occurrence: EventOccurrence,
  options: { tab?: 'overview' | 'schedule' | 'registrations' } = {}
): string => {
  const params = new URLSearchParams();

  if (options.tab) {
    params.set('tab', options.tab);
  }
  if (occurrence.occurrence_id) {
    params.set('occurrence', occurrence.occurrence_id);
  }

  const query = params.toString();
  return query ? `/events/${occurrence.event_id}?${query}` : `/events/${occurrence.event_id}`;
};

const normalizeOccurrenceEntry = (
  occurrence: EventOccurrence
): BookingCalendarEntry<StaffCalendarEntryMeta> => ({
  id: `event:${occurrence.event_id}:${occurrence.occurrence_id}`,
  kind: 'event',
  title: occurrence.event_name || occurrence.occurrence_name || 'Event',
  start: occurrence.start_date,
  end: occurrence.end_date,
  status: occurrence.status,
  location: occurrence.location_name,
  metadata: { kind: 'event', occurrence },
});

const normalizeAppointmentEntry = (
  appointment: PortalAdminAppointmentInboxItem
): BookingCalendarEntry<StaffCalendarEntryMeta> => ({
  id: `appointment:${appointment.id}`,
  kind: 'appointment',
  title: appointment.title,
  start: appointment.start_time,
  end: appointment.end_time,
  status: appointment.status,
  location: appointment.location,
  metadata: { kind: 'appointment', appointment },
});

const normalizeSlotEntry = (
  slot: PortalAppointmentSlot
): BookingCalendarEntry<StaffCalendarEntryMeta> => ({
  id: `slot:${slot.id}`,
  kind: 'slot',
  title: slot.title || 'Appointment slot',
  start: slot.start_time,
  end: slot.end_time,
  status: slot.status,
  location: slot.location,
  metadata: { kind: 'slot', slot },
});

export default function StaffEventsWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = canAccessAdminSettings(user);

  const visibleMonth = useMemo(
    () => parseMonthParam(searchParams.get('month')) ?? startOfMonth(new Date()),
    [searchParams]
  );
  const selectedDate = useMemo(
    () => parseDateParam(searchParams.get('date')) ?? startOfDay(new Date()),
    [searchParams]
  );
  const appliedSearch = searchParams.get('search') ?? '';
  const selectedEventType = searchParams.get('type') ?? '';
  const selectedStatus = normalizeEventStatus(searchParams.get('status'));
  const selectedScope = normalizeScope(searchParams.get('scope'), isAdmin);

  const [searchInput, setSearchInput] = useState(appliedSearch);
  const [visibleRange, setVisibleRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [entries, setEntries] = useState<BookingCalendarEntry<StaffCalendarEntryMeta>[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);

  const writeSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(updates)) {
        const shouldDelete =
          value === null ||
          value === '' ||
          (key === 'scope' && value === 'events') ||
          (key === 'month' && value === formatMonthParam(startOfMonth(new Date())));

        if (shouldDelete) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    setSearchInput(appliedSearch);
  }, [appliedSearch]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === appliedSearch) {
      return;
    }

    const timer = window.setTimeout(() => {
      writeSearchParams({ search: trimmed || null });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [appliedSearch, searchInput, writeSearchParams]);

  const loadCalendar = useCallback(
    async ({
      range,
      scope,
      search,
      eventType,
      status,
    }: {
      range: { startDate: string; endDate: string };
      scope: CalendarScope;
      search: string;
      eventType: string;
      status: EventStatus | '';
    }) => {
      setCalendarLoading(true);

      try {
        const [occurrences, appointments, slots] = await Promise.all([
          scope === 'events' || scope === 'all'
            ? eventsApiClient.listEventOccurrences({
                startDate: range.startDate,
                endDate: range.endDate,
                search: search || undefined,
                eventType: eventType || undefined,
                status: status || undefined,
              })
            : Promise.resolve([]),
          isAdmin && (scope === 'all' || scope === 'appointments')
            ? portalAdminAppointmentsApiClient.listAppointmentsAll({
                date_from: range.startDate,
                date_to: range.endDate,
              })
            : Promise.resolve([]),
          isAdmin && (scope === 'all' || scope === 'slots')
            ? portalAdminAppointmentsApiClient.listAppointmentSlotsAll({
                from: range.startDate,
                to: range.endDate,
              })
            : Promise.resolve([]),
        ]);

        const safeOccurrences = Array.isArray(occurrences) ? occurrences : [];
        const safeAppointments = Array.isArray(appointments) ? appointments : [];
        const safeSlots = Array.isArray(slots) ? slots : [];

        const nextEntries = [
          ...safeOccurrences.map(normalizeOccurrenceEntry),
          ...safeAppointments.map(normalizeAppointmentEntry),
          ...safeSlots.map(normalizeSlotEntry),
        ].sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());

        setEntries(nextEntries);
        setError(null);
      } catch (loadError) {
        console.error('Failed to load staff events workspace', loadError);
        setError('Unable to load the events calendar right now.');
      } finally {
        setCalendarLoading(false);
        setLoading(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (!visibleRange) {
      return;
    }

    void loadCalendar({
      range: visibleRange,
      scope: selectedScope,
      search: appliedSearch,
      eventType: selectedEventType,
      status: selectedStatus,
    });
  }, [appliedSearch, loadCalendar, selectedEventType, selectedScope, selectedStatus, visibleRange]);

  const selectedDateEntries = useMemo(() => {
    const key = formatDateParam(selectedDate);
    return entries.filter((entry) => {
      const entryDate = parseValidIsoDate(entry.start);
      return entryDate ? format(entryDate, 'yyyy-MM-dd') === key : false;
    });
  }, [entries, selectedDate]);

  useEffect(() => {
    setSelectedEntryId((current) =>
      current && selectedDateEntries.some((entry) => entry.id === current)
        ? current
        : (selectedDateEntries[0]?.id ?? null)
    );
  }, [selectedDateEntries]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId]
  );
  const selectedOccurrence =
    selectedEntry?.metadata.kind === 'event' ? selectedEntry.metadata.occurrence : null;
  const selectedAppointment =
    selectedEntry?.metadata.kind === 'appointment' ? selectedEntry.metadata.appointment : null;
  const selectedSlot = selectedEntry?.metadata.kind === 'slot' ? selectedEntry.metadata.slot : null;

  const handleMonthRangeChange = useCallback((range: { startDate: string; endDate: string }) => {
    setVisibleRange(range);
  }, []);

  const handleVisibleMonthChange = useCallback(
    (nextMonth: Date) => {
      const selectedDay = getDate(selectedDate);
      const clampedDay = Math.min(selectedDay, getDaysInMonth(nextMonth));
      const nextSelectedDate = setDate(startOfMonth(nextMonth), clampedDay);

      writeSearchParams({
        month: formatMonthParam(nextMonth),
        date: formatDateParam(nextSelectedDate),
      });
    },
    [selectedDate, writeSearchParams]
  );

  const handleSelectDate = useCallback(
    (date: Date) => {
      writeSearchParams({
        month: formatMonthParam(date),
        date: formatDateParam(date),
      });
    },
    [writeSearchParams]
  );

  const handleSelectEntry = useCallback(
    (entry: BookingCalendarEntry<StaffCalendarEntryMeta>) => {
      const entryDate = parseValidIsoDate(entry.start);
      if (!entryDate) {
        return;
      }

      setSelectedEntryId(entry.id);
      writeSearchParams({
        month: formatMonthParam(entryDate),
        date: formatDateParam(entryDate),
      });
    },
    [writeSearchParams]
  );

  const refreshVisibleRange = useCallback(async () => {
    if (!visibleRange) {
      return;
    }

    await loadCalendar({
      range: visibleRange,
      scope: selectedScope,
      search: appliedSearch,
      eventType: selectedEventType,
      status: selectedStatus,
    });
  }, [appliedSearch, loadCalendar, selectedEventType, selectedScope, selectedStatus, visibleRange]);

  const handleConfirmAppointment = async (appointmentId: string) => {
    setSavingEntryId(`appointment:${appointmentId}`);
    try {
      await portalAdminAppointmentsApiClient.updateAppointmentStatus(appointmentId, {
        status: 'confirmed',
      });
      showSuccess('Appointment confirmed.');
      await refreshVisibleRange();
    } catch (requestError) {
      showError(formatApiErrorMessage(requestError, 'Could not confirm this appointment.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleCheckInAppointment = async (appointment: PortalAdminAppointmentInboxItem) => {
    if (appointment.case_id) {
      navigate(`/cases/${appointment.case_id}?tab=appointments`);
      return;
    }

    setSavingEntryId(`appointment:${appointment.id}`);
    try {
      await portalAdminAppointmentsApiClient.checkInAppointment(appointment.id);
      showSuccess('Appointment checked in.');
      await refreshVisibleRange();
    } catch (requestError) {
      showError(formatApiErrorMessage(requestError, 'Could not check in this appointment.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleCancelAppointment = async (appointment: PortalAdminAppointmentInboxItem) => {
    if (appointment.case_id) {
      navigate(`/cases/${appointment.case_id}?tab=appointments`);
      return;
    }

    const confirmed = await confirm({
      title: 'Cancel appointment',
      message: 'Are you sure you want to cancel this appointment?',
      confirmLabel: 'Cancel appointment',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }

    setSavingEntryId(`appointment:${appointment.id}`);
    try {
      await portalAdminAppointmentsApiClient.updateAppointmentStatus(appointment.id, {
        status: 'cancelled',
      });
      showSuccess('Appointment canceled.');
      await refreshVisibleRange();
    } catch (requestError) {
      showError(formatApiErrorMessage(requestError, 'Could not cancel this appointment.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleToggleSlotStatus = async (slot: PortalAppointmentSlot) => {
    const nextStatus = slot.status === 'open' ? 'closed' : 'open';
    setSavingEntryId(`slot:${slot.id}`);
    try {
      await portalAdminAppointmentsApiClient.updateSlotStatus(slot.id, nextStatus);
      showSuccess(`Slot ${nextStatus}.`);
      await refreshVisibleRange();
    } catch (requestError) {
      showError(formatApiErrorMessage(requestError, 'Could not update this slot.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const clearFilters = () => {
    writeSearchParams({
      search: null,
      type: null,
      status: null,
      scope: isAdmin ? 'events' : null,
    });
  };

  const selectedOccurrenceLabel =
    selectedOccurrence &&
    ((selectedOccurrence.occurrence_name &&
      selectedOccurrence.occurrence_name !== selectedOccurrence.event_name) ||
      (selectedOccurrence.occurrence_index ?? 1) > 1)
      ? getEventOccurrenceLabel(selectedOccurrence, selectedOccurrence.occurrence_index ?? 1)
      : null;

  const canUseEventActions =
    selectedOccurrence && !['cancelled', 'completed'].includes(selectedOccurrence.status);
  const activeFilterCount =
    (appliedSearch ? 1 : 0) +
    (selectedEventType ? 1 : 0) +
    (selectedStatus ? 1 : 0) +
    (isAdmin && selectedScope !== 'events' ? 1 : 0);

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
          <Link to="/events/new" className={staffEventsPrimaryActionClassName}>
            Create event
          </Link>
          <Link to="/events/check-in" className={staffEventsSecondaryActionClassName}>
            Check-in desk
          </Link>
        </>
      }
    >
      <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm">
        <div className="mt-0 rounded-xl border border-app-border bg-app-surface-muted/60 p-4">
          {isAdmin ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => writeSearchParams({ scope: option.value })}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedScope === option.value
                      ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                      : 'bg-app-surface text-app-text-muted hover:bg-app-surface-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-app-text-label">Search</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search title, description, or location..."
                className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-app-text-label">Type</span>
              <select
                value={selectedEventType}
                onChange={(event) => writeSearchParams({ type: event.target.value || null })}
                className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text"
              >
                <option value="">All types</option>
                {EVENT_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-app-text-label">Status</span>
              <select
                value={selectedStatus}
                onChange={(event) => writeSearchParams({ status: event.target.value || null })}
                className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text"
              >
                <option value="">All statuses</option>
                {EVENT_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-md border border-app-input-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-muted xl:w-auto"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
        <BookingCalendarView
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
          <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-app-text">Day agenda</h2>
                <p className="mt-1 text-sm text-app-text-muted">
                  {format(selectedDate, 'EEEE, MMMM d')} · {selectedDateEntries.length} item
                  {selectedDateEntries.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {selectedDateEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-app-border bg-app-surface-muted/50 p-4 text-sm text-app-text-muted">
                  Nothing is scheduled for this date yet.
                </div>
              ) : (
                selectedDateEntries.map((entry) => {
                  const occurrence =
                    entry.metadata.kind === 'event' ? entry.metadata.occurrence : null;
                  const occurrenceLabel =
                    occurrence &&
                    ((occurrence.occurrence_name &&
                      occurrence.occurrence_name !== occurrence.event_name) ||
                      (occurrence.occurrence_index ?? 1) > 1)
                      ? getEventOccurrenceLabel(occurrence, occurrence.occurrence_index ?? 1)
                      : null;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelectEntry(entry)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                        selectedEntryId === entry.id
                          ? 'border-app-accent bg-app-accent-soft/20'
                          : 'border-app-border bg-app-surface-muted hover:bg-app-surface'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-app-text">{entry.title}</div>
                          <div className="mt-1 text-xs text-app-text-muted">
                            {format(parseISO(entry.start), 'p')}
                            {entry.end ? ` - ${format(parseISO(entry.end), 'p')}` : ''}
                            {entry.location ? ` • ${entry.location}` : ''}
                          </div>
                          {occurrenceLabel ? (
                            <div className="mt-1 text-xs text-app-text-muted">{occurrenceLabel}</div>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-app-surface px-2 py-0.5 text-[11px] text-app-text-muted">
                          {entryKindLabel[entry.metadata.kind]}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
            {selectedEntry ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                    {entryKindLabel[selectedEntry.metadata.kind]}
                  </div>
                  <h3 className="mt-1 text-xl font-semibold text-app-text">{selectedEntry.title}</h3>
                  <div className="mt-2 text-sm text-app-text-muted">
                    {format(parseISO(selectedEntry.start), 'PPP p')}
                    {selectedEntry.end ? ` - ${format(parseISO(selectedEntry.end), 'p')}` : ''}
                  </div>
                  {selectedEntry.location ? (
                    <div className="mt-1 text-sm text-app-text-muted">{selectedEntry.location}</div>
                  ) : null}
                </div>

                {selectedOccurrence ? (
                  <>
                    {selectedOccurrence.description ? (
                      <p className="text-sm text-app-text-muted">{selectedOccurrence.description}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs text-app-text-muted">
                        {selectedOccurrence.status}
                      </span>
                      <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs text-app-accent-text">
                        {formatEventType(selectedOccurrence.event_type)}
                      </span>
                      <span className="rounded-full border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text-muted">
                        {selectedOccurrence.is_public ? 'Public' : 'Private'}
                      </span>
                      {selectedOccurrence.waitlist_enabled ? (
                        <span className="rounded-full border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text-muted">
                          Waitlist enabled
                        </span>
                      ) : null}
                      {selectedOccurrenceLabel ? (
                        <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs text-app-text-muted">
                          {selectedOccurrenceLabel}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                          Registration
                        </p>
                        <p className="mt-2 text-xl font-semibold text-app-text">
                          {selectedOccurrence.registered_count}
                          {selectedOccurrence.capacity ? ` / ${selectedOccurrence.capacity}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-app-text-muted">
                          {selectedOccurrence.capacity
                            ? 'Registered vs capacity'
                            : 'No capacity limit set'}
                        </p>
                      </div>

                      <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                          Attendance
                        </p>
                        <p className="mt-2 text-xl font-semibold text-app-text">
                          {selectedOccurrence.attended_count}
                        </p>
                        <p className="mt-1 text-xs text-app-text-muted">Checked in so far</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3 text-sm text-app-text-muted">
                      {getOccurrenceDateRange(selectedOccurrence)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={buildEventDetailHref(selectedOccurrence)}
                        className={staffEventsPrimaryActionClassName}
                      >
                        View details
                      </Link>
                      <Link
                        to={`/events/${selectedOccurrence.event_id}/edit`}
                        className={staffEventsSecondaryActionClassName}
                      >
                        Edit event
                      </Link>
                      {canUseEventActions ? (
                        <Link
                          to={`/events/check-in?eventId=${selectedOccurrence.event_id}`}
                          className={staffEventsSecondaryActionClassName}
                        >
                          Check-in
                        </Link>
                      ) : null}
                      <Link
                        to={buildEventDetailHref(selectedOccurrence, { tab: 'registrations' })}
                        className={staffEventsSecondaryActionClassName}
                      >
                        Open registrations
                      </Link>
                    </div>
                  </>
                ) : null}

                {selectedAppointment ? (
                  <>
                    {selectedAppointment.description ? (
                      <p className="text-sm text-app-text-muted">{selectedAppointment.description}</p>
                    ) : null}
                    <p className="text-sm text-app-text-muted">
                      Status: {selectedAppointment.status}
                      {selectedAppointment.request_type
                        ? ` • ${selectedAppointment.request_type.replace('_', ' ')}`
                        : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAppointment.status === 'requested' ? (
                        <button
                          type="button"
                          onClick={() => void handleConfirmAppointment(selectedAppointment.id)}
                          disabled={savingEntryId === selectedEntry.id}
                          className={staffEventsPrimaryActionClassName}
                        >
                          {savingEntryId === selectedEntry.id ? 'Saving...' : 'Confirm'}
                        </button>
                      ) : null}
                      {selectedAppointment.status === 'confirmed' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleCheckInAppointment(selectedAppointment)}
                            disabled={savingEntryId === selectedEntry.id}
                            className={staffEventsSecondaryActionClassName}
                          >
                            {selectedAppointment.case_id ? 'Resolve in case' : 'Check in'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCancelAppointment(selectedAppointment)}
                            disabled={savingEntryId === selectedEntry.id}
                            className={staffEventsSecondaryActionClassName}
                          >
                            {selectedAppointment.case_id ? 'Open case' : 'Cancel'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </>
                ) : null}

                {selectedSlot ? (
                  <>
                    <p className="text-sm text-app-text-muted">
                      Status: {selectedSlot.status}
                      {selectedSlot.capacity ? ` • Capacity ${selectedSlot.capacity}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleSlotStatus(selectedSlot)}
                        disabled={savingEntryId === selectedEntry.id || selectedSlot.status === 'cancelled'}
                        className={staffEventsSecondaryActionClassName}
                      >
                        {savingEntryId === selectedEntry.id
                          ? 'Saving...'
                          : selectedSlot.status === 'open'
                            ? 'Close slot'
                            : 'Reopen slot'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/settings/admin/portal/slots')}
                        className={staffEventsSecondaryActionClassName}
                      >
                        Manage slots
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-app-text">Selected item</h3>
                <p className="text-sm text-app-text-muted">
                  Pick an occurrence or appointment from the calendar to see quick actions and context here.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </StaffEventsPageShell>
  );
}
