import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import BookingCalendarView, {
  type BookingCalendarEntry,
} from '../../../components/calendar/BookingCalendarView';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalPageState from '../../../components/portal/PortalPageState';
import { useToast } from '../../../contexts/useToast';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { usePersistentPortalCaseContext } from '../../../hooks/usePersistentPortalCaseContext';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import { formatApiErrorMessage } from '../../../utils/apiError';
import { portalV2ApiClient } from '../api/portalApiClient';
import type {
  PortalAppointmentSlot,
  PortalAppointmentSummary,
  PortalEvent,
  PortalPointpersonContext,
} from '../types/contracts';
import {
  getPortalEventDateRange,
  getPortalEventOccurrenceLabel,
  getPortalEventRegistrationLabel,
} from '../utils/eventDisplay';

type CalendarFilter = 'all' | 'events' | 'appointments' | 'slots';

type PortalCalendarEntryMeta =
  | { kind: 'event'; event: PortalEvent }
  | { kind: 'appointment'; appointment: PortalAppointmentSummary }
  | { kind: 'slot'; slot: PortalAppointmentSlot };

const toDateKey = (isoValue: string): string => format(parseISO(isoValue), 'yyyy-MM-dd');

const buildDefaultLocalValue = (date: Date, hour: number): string => {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return format(next, "yyyy-MM-dd'T'HH:mm");
};

const toIsoFromLocal = (value: string): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const entryKindLabel: Record<PortalCalendarEntryMeta['kind'], string> = {
  event: 'Event',
  appointment: 'Appointment',
  slot: 'Open Slot',
};

const normalizeEventEntry = (
  event: PortalEvent
): BookingCalendarEntry<PortalCalendarEntryMeta> => ({
  id: `event:${event.id}`,
  kind: 'event',
  title: event.name,
  start: event.occurrence_start_date ?? event.start_date,
  end: event.occurrence_end_date ?? event.end_date,
  status: event.registration_id ? (event.registration_status ?? 'registered') : event.event_type,
  location: event.location_name,
  metadata: { kind: 'event', event },
});

const normalizeAppointmentEntry = (
  appointment: PortalAppointmentSummary
): BookingCalendarEntry<PortalCalendarEntryMeta> => ({
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
): BookingCalendarEntry<PortalCalendarEntryMeta> => ({
  id: `slot:${slot.id}`,
  kind: 'slot',
  title: slot.title || 'Appointment slot',
  start: slot.start_time,
  end: slot.end_time,
  status: slot.status,
  location: slot.location,
  metadata: { kind: 'slot', slot },
});

export default function PortalCalendarPage() {
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();
  const { selectedCaseId, setSelectedCaseId, clearSelectedCaseId } =
    usePersistentPortalCaseContext();

  const [context, setContext] = useState<PortalPointpersonContext | null>(null);
  const [calendarEntries, setCalendarEntries] = useState<
    BookingCalendarEntry<PortalCalendarEntryMeta>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleRange, setVisibleRange] = useState<{ startDate: string; endDate: string } | null>(
    null
  );
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
  });
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const loadContext = useCallback(async () => {
    const response = await portalApi.get('/v2/portal/pointperson/context');
    const payload = unwrapApiData<PortalPointpersonContext>(response.data);
    setContext(payload);

    const caseIds = new Set(payload.cases.map((entry) => entry.case_id));
    const nextCaseId =
      (selectedCaseId && caseIds.has(selectedCaseId) ? selectedCaseId : null) ||
      (payload.selected_case_id && caseIds.has(payload.selected_case_id)
        ? payload.selected_case_id
        : null) ||
      (payload.default_case_id && caseIds.has(payload.default_case_id)
        ? payload.default_case_id
        : null) ||
      payload.cases[0]?.case_id ||
      '';

    if (nextCaseId) {
      setSelectedCaseId(nextCaseId);
    } else {
      clearSelectedCaseId();
    }
  }, [clearSelectedCaseId, selectedCaseId, setSelectedCaseId]);

  const loadCalendar = useCallback(
    async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      setCalendarLoading(true);
      try {
        const [events, appointments, slotsPayload] = await Promise.all([
          portalV2ApiClient.listEventsAll({
            from: startDate,
            to: endDate,
            sort: 'start_date',
            order: 'asc',
          }),
          portalV2ApiClient.listAppointmentsAll({
            case_id: selectedCaseId || undefined,
            from: startDate,
            to: endDate,
          }),
          portalV2ApiClient.listAppointmentSlots({
            case_id: selectedCaseId || undefined,
            from: startDate,
            to: endDate,
          }),
        ]);

        const nextEntries = [
          ...events.map(normalizeEventEntry),
          ...appointments.map(normalizeAppointmentEntry),
          ...slotsPayload.slots.map(normalizeSlotEntry),
        ].sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());

        setCalendarEntries(nextEntries);
        setError(null);
        setSelectedEntryId((current) =>
          current && nextEntries.some((entry) => entry.id === current) ? current : null
        );
      } catch (loadError) {
        console.error('Failed to load portal calendar', loadError);
        setError('Unable to load your calendar right now.');
      } finally {
        setCalendarLoading(false);
      }
    },
    [selectedCaseId]
  );

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadContext();
      } catch (loadError) {
        if (!cancelled) {
          console.error('Failed to load portal calendar context', loadError);
          setError('Unable to load your booking context right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [loadContext]);

  useEffect(() => {
    if (!selectedDate || requestForm.start_time) {
      return;
    }

    setRequestForm((current) => ({
      ...current,
      start_time: buildDefaultLocalValue(selectedDate, 9),
      end_time: buildDefaultLocalValue(selectedDate, 10),
    }));
  }, [requestForm.start_time, selectedDate]);

  useEffect(() => {
    if (!visibleRange || loading) {
      return;
    }

    void loadCalendar(visibleRange);
  }, [loadCalendar, loading, visibleRange]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') {
      return calendarEntries;
    }

    const wantedKind =
      filter === 'events' ? 'event' : filter === 'appointments' ? 'appointment' : 'slot';
    return calendarEntries.filter((entry) => entry.kind === wantedKind);
  }, [calendarEntries, filter]);

  const selectedDateEntries = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    const selectedKey = format(selectedDate, 'yyyy-MM-dd');
    return filteredEntries.filter((entry) => toDateKey(entry.start) === selectedKey);
  }, [filteredEntries, selectedDate]);

  const selectedEntry = useMemo(
    () => filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [filteredEntries, selectedEntryId]
  );

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleSelectEntry = useCallback((entry: BookingCalendarEntry<PortalCalendarEntryMeta>) => {
    setSelectedEntryId(entry.id);
    setSelectedDate(parseISO(entry.start));
  }, []);

  const handleMonthRangeChange = useCallback((range: { startDate: string; endDate: string }) => {
    setVisibleRange((current) => {
      if (current && current.startDate === range.startDate && current.endDate === range.endDate) {
        return current;
      }

      return range;
    });
  }, []);

  const handleRegisterEvent = async (eventId: string) => {
    setSavingEntryId(`event:${eventId}`);
    try {
      await portalV2ApiClient.registerEvent(eventId);
      showSuccess('Registered for event.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (registerError) {
      showError(formatApiErrorMessage(registerError, 'Could not register for this event.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    const confirmed = await confirm({
      title: 'Cancel registration',
      message: 'Are you sure you want to cancel this event registration?',
      confirmLabel: 'Cancel registration',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }

    setSavingEntryId(`event:${eventId}`);
    try {
      await portalV2ApiClient.cancelEventRegistration(eventId);
      showSuccess('Registration canceled.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (cancelError) {
      showError(formatApiErrorMessage(cancelError, 'Could not cancel this registration.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    if (!selectedCaseId) {
      showError('Select a case before booking a slot.');
      return;
    }

    setSavingEntryId(`slot:${slotId}`);
    try {
      await portalV2ApiClient.bookAppointmentSlot(slotId, { case_id: selectedCaseId });
      showSuccess('Appointment booked.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (bookError) {
      showError(formatApiErrorMessage(bookError, 'Could not book this slot.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const confirmed = await confirm({
      title: 'Cancel appointment',
      message: 'Are you sure you want to cancel this appointment?',
      confirmLabel: 'Cancel appointment',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }

    setSavingEntryId(`appointment:${appointmentId}`);
    try {
      await portalV2ApiClient.cancelAppointment(appointmentId);
      showSuccess('Appointment canceled.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (cancelError) {
      showError(formatApiErrorMessage(cancelError, 'Could not cancel this appointment.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleRequestSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const startIso = toIsoFromLocal(requestForm.start_time);
    const endIso = toIsoFromLocal(requestForm.end_time);

    if (!startIso) {
      showError('Please choose a valid appointment start time.');
      return;
    }

    if (endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      showError('Appointment end time must be after the start time.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await portalV2ApiClient.requestAppointment({
        case_id: selectedCaseId || undefined,
        title: requestForm.title,
        description: requestForm.description || undefined,
        start_time: startIso,
        end_time: endIso || undefined,
        location: requestForm.location || undefined,
      });
      setRequestForm({
        title: '',
        description: '',
        start_time: selectedDate ? buildDefaultLocalValue(selectedDate, 9) : '',
        end_time: selectedDate ? buildDefaultLocalValue(selectedDate, 10) : '',
        location: '',
      });
      showSuccess('Appointment request submitted.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (requestError) {
      showError(formatApiErrorMessage(requestError, 'Could not submit this appointment request.'));
    } finally {
      setSubmittingRequest(false);
    }
  };

  const selectedEvent =
    selectedEntry?.metadata.kind === 'event' ? selectedEntry.metadata.event : null;
  const selectedAppointment =
    selectedEntry?.metadata.kind === 'appointment' ? selectedEntry.metadata.appointment : null;
  const selectedSlot = selectedEntry?.metadata.kind === 'slot' ? selectedEntry.metadata.slot : null;

  return (
    <PortalPageShell
      title="Calendar"
      description="See appointments, open booking slots, and events together in one place."
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={false}
        loadingLabel="Loading calendar..."
        onRetry={() => void loadContext()}
      />

      {!loading && !error && (
        <div className="space-y-4">
          <section className="rounded-lg border border-app-border bg-app-surface p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['all', 'All'],
                      ['events', 'Events'],
                      ['appointments', 'Appointments'],
                      ['slots', 'Open slots'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={`rounded-full px-3 py-1.5 text-sm ${
                        filter === value
                          ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                          : 'bg-app-surface-muted text-app-text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-app-text-muted">
                  Select a date to review everything scheduled for that day, or click an item for
                  actions.
                </p>
              </div>

              <div className="w-full max-w-md">
                <label className="mb-1 block text-sm font-medium text-app-text-label">Case</label>
                <select
                  aria-label="Select case"
                  value={selectedCaseId}
                  onChange={(entry) => setSelectedCaseId(entry.target.value)}
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                >
                  {context?.cases.length ? (
                    context.cases.map((caseEntry) => (
                      <option key={caseEntry.case_id} value={caseEntry.case_id}>
                        {caseEntry.case_number} - {caseEntry.case_title}
                      </option>
                    ))
                  ) : (
                    <option value="">No active cases</option>
                  )}
                </select>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <BookingCalendarView
              entries={filteredEntries}
              loading={calendarLoading}
              selectedDate={selectedDate}
              selectedEntryId={selectedEntryId}
              onDateSelect={handleSelectDate}
              onEntryClick={handleSelectEntry}
              onMonthRangeChange={handleMonthRangeChange}
            />

            <div className="space-y-4">
              <section className="rounded-lg border border-app-border bg-app-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-app-text">
                      {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Selected day'}
                    </h2>
                    <p className="text-sm text-app-text-muted">
                      {selectedDateEntries.length} item{selectedDateEntries.length === 1 ? '' : 's'}{' '}
                      on this date
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Link
                      to="/portal/events"
                      className="rounded border border-app-input-border px-3 py-1.5 text-app-text"
                    >
                      Events list
                    </Link>
                    <Link
                      to="/portal/appointments"
                      className="rounded border border-app-input-border px-3 py-1.5 text-app-text"
                    >
                      Appointments
                    </Link>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedDateEntries.length === 0 ? (
                    <p className="text-sm text-app-text-muted">Nothing scheduled for this day.</p>
                  ) : (
                    selectedDateEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleSelectEntry(entry)}
                        className={`w-full rounded-lg border px-3 py-2 text-left ${
                          selectedEntryId === entry.id
                            ? 'border-app-accent bg-app-accent-soft/30'
                            : 'border-app-border bg-app-surface-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-app-text">{entry.title}</div>
                            <div className="text-xs text-app-text-muted">
                              {format(parseISO(entry.start), 'p')}
                              {entry.end ? ` - ${format(parseISO(entry.end), 'p')}` : ''}
                              {entry.location ? ` • ${entry.location}` : ''}
                            </div>
                          </div>
                          <span className="rounded-full bg-app-surface px-2 py-0.5 text-[11px] text-app-text-muted">
                            {entryKindLabel[entry.metadata.kind]}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-app-border bg-app-surface p-4">
                {selectedEntry ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                        {entryKindLabel[selectedEntry.metadata.kind]}
                      </div>
                      <h2 className="mt-1 text-xl font-semibold text-app-text">
                        {selectedEntry.title}
                      </h2>
                      <div className="mt-2 text-sm text-app-text-muted">
                        {format(parseISO(selectedEntry.start), 'PPP p')}
                        {selectedEntry.end ? ` - ${format(parseISO(selectedEntry.end), 'p')}` : ''}
                      </div>
                      {selectedEntry.location && (
                        <div className="mt-1 text-sm text-app-text-muted">
                          {selectedEntry.location}
                        </div>
                      )}
                    </div>

                    {selectedEvent && (
                      <>
                        {selectedEvent.description && (
                          <p className="text-sm text-app-text-muted">{selectedEvent.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {getPortalEventOccurrenceLabel(selectedEvent) && (
                            <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                              {getPortalEventOccurrenceLabel(selectedEvent)}
                            </span>
                          )}
                          {getPortalEventRegistrationLabel(selectedEvent.registration_status) && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                selectedEvent.registration_status === 'confirmed'
                                  ? 'bg-app-accent-soft text-app-accent-text'
                                  : selectedEvent.registration_status === 'waitlisted'
                                    ? 'bg-yellow-100 text-yellow-900'
                                    : 'bg-app-surface-muted text-app-text-muted'
                              }`}
                            >
                              {getPortalEventRegistrationLabel(selectedEvent.registration_status)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-app-text-muted">
                          {getPortalEventDateRange(selectedEvent)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedEvent.registration_id ? (
                            <button
                              type="button"
                              onClick={() => void handleCancelEvent(selectedEvent.id)}
                              disabled={
                                savingEntryId === selectedEntry.id ||
                                selectedEvent.checked_in === true
                              }
                              className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text disabled:opacity-60"
                            >
                              {savingEntryId === selectedEntry.id
                                ? 'Saving...'
                                : selectedEvent.registration_status === 'waitlisted'
                                  ? 'Cancel waitlist'
                                  : 'Cancel registration'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleRegisterEvent(selectedEvent.id)}
                              disabled={savingEntryId === selectedEntry.id}
                              className="rounded-md bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)] disabled:opacity-60"
                            >
                              {savingEntryId === selectedEntry.id ? 'Saving...' : 'Register'}
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {selectedSlot && (
                      <>
                        {selectedSlot.details && (
                          <p className="text-sm text-app-text-muted">{selectedSlot.details}</p>
                        )}
                        <p className="text-sm text-app-text-muted">
                          {selectedSlot.available_count} slot
                          {selectedSlot.available_count === 1 ? '' : 's'} available
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleBookSlot(selectedSlot.id)}
                          disabled={
                            savingEntryId === selectedEntry.id ||
                            selectedSlot.status !== 'open' ||
                            selectedSlot.available_count <= 0
                          }
                          className="rounded-md bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)] disabled:opacity-60"
                        >
                          {savingEntryId === selectedEntry.id ? 'Saving...' : 'Book slot'}
                        </button>
                      </>
                    )}

                    {selectedAppointment && (
                      <>
                        {selectedAppointment.description && (
                          <p className="text-sm text-app-text-muted">
                            {selectedAppointment.description}
                          </p>
                        )}
                        <p className="text-sm text-app-text-muted">
                          Status: {selectedAppointment.status}
                          {selectedAppointment.request_type
                            ? ` • ${selectedAppointment.request_type.replace('_', ' ')}`
                            : ''}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleCancelAppointment(selectedAppointment.id)}
                          disabled={
                            savingEntryId === selectedEntry.id ||
                            selectedAppointment.status === 'cancelled' ||
                            selectedAppointment.status === 'completed'
                          }
                          className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text disabled:opacity-60"
                        >
                          {savingEntryId === selectedEntry.id ? 'Saving...' : 'Cancel appointment'}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-app-text-muted">
                    Select an event, appointment, or open slot to view details and actions.
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-app-border bg-app-surface p-4">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-app-text">Request Appointment</h2>
                  <p className="text-sm text-app-text-muted">
                    Submit a manual request when none of the open slots work for you.
                  </p>
                </div>

                <form className="space-y-3" onSubmit={handleRequestSubmit}>
                  <div className="space-y-1">
                    <label
                      htmlFor="portal-appointment-title"
                      className="text-sm font-medium text-app-text"
                    >
                      Appointment title
                    </label>
                    <input
                      id="portal-appointment-title"
                      type="text"
                      required
                      value={requestForm.title}
                      onChange={(entry) =>
                        setRequestForm((current) => ({ ...current, title: entry.target.value }))
                      }
                      placeholder="Appointment title"
                      className="w-full rounded-md border border-app-input-border px-3 py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="portal-appointment-description"
                      className="text-sm font-medium text-app-text"
                    >
                      Details
                    </label>
                    <textarea
                      id="portal-appointment-description"
                      value={requestForm.description}
                      onChange={(entry) =>
                        setRequestForm((current) => ({
                          ...current,
                          description: entry.target.value,
                        }))
                      }
                      placeholder="Optional details"
                      rows={3}
                      className="w-full rounded-md border border-app-input-border px-3 py-2"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label
                        htmlFor="portal-appointment-start"
                        className="text-sm font-medium text-app-text"
                      >
                        Preferred start
                      </label>
                      <input
                        id="portal-appointment-start"
                        type="datetime-local"
                        value={requestForm.start_time}
                        onChange={(entry) =>
                          setRequestForm((current) => ({
                            ...current,
                            start_time: entry.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="portal-appointment-end"
                        className="text-sm font-medium text-app-text"
                      >
                        Preferred end
                      </label>
                      <input
                        id="portal-appointment-end"
                        type="datetime-local"
                        value={requestForm.end_time}
                        onChange={(entry) =>
                          setRequestForm((current) => ({
                            ...current,
                            end_time: entry.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-app-input-border px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="portal-appointment-location"
                      className="text-sm font-medium text-app-text"
                    >
                      Location
                    </label>
                    <input
                      id="portal-appointment-location"
                      type="text"
                      value={requestForm.location}
                      onChange={(entry) =>
                        setRequestForm((current) => ({ ...current, location: entry.target.value }))
                      }
                      placeholder="Optional location"
                      className="w-full rounded-md border border-app-input-border px-3 py-2"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="rounded-md bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)] disabled:opacity-60"
                  >
                    {submittingRequest ? 'Submitting...' : 'Submit request'}
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </PortalPageShell>
  );
}
