import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import BookingCalendarView, {
  type BookingCalendarEntry,
} from '../../../components/calendar/BookingCalendarView';
import ConfirmDialog from '../../../components/ConfirmDialog';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { portalAdminAppointmentsApiClient } from '../../adminOps/api/portalAdminAppointmentsApiClient';
import type {
  PortalAdminAppointmentInboxItem,
  PortalAppointmentSlot,
} from '../../adminOps/contracts';
import { canAccessAdminSettings } from '../../auth/state/adminAccess';
import { useToast } from '../../../contexts/useToast';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { useAppSelector } from '../../../store/hooks';
import type { Event } from '../../../types/event';
import { formatApiErrorMessage } from '../../../utils/apiError';
import { eventsApiClient } from '../api/eventsApiClient';

type CalendarFilter = 'all' | 'events' | 'appointments' | 'slots';

type StaffCalendarEntryMeta =
  | { kind: 'event'; event: Event }
  | { kind: 'appointment'; appointment: PortalAdminAppointmentInboxItem }
  | { kind: 'slot'; slot: PortalAppointmentSlot };

const entryKindLabel: Record<StaffCalendarEntryMeta['kind'], string> = {
  event: 'Event',
  appointment: 'Appointment',
  slot: 'Open Slot',
};

const toDateKey = (isoValue: string): string => format(parseISO(isoValue), 'yyyy-MM-dd');

const formatEventType = (type: string): string =>
  type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const normalizeEventEntry = (event: Event): BookingCalendarEntry<StaffCalendarEntryMeta> => ({
  id: `event:${event.event_id}`,
  kind: 'event',
  title: event.event_name,
  start: event.start_date,
  end: event.end_date,
  status: event.status,
  location: event.location_name,
  metadata: { kind: 'event', event },
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

export default function EventCalendarPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = canAccessAdminSettings(user);

  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleRange, setVisibleRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [calendarEntries, setCalendarEntries] = useState<BookingCalendarEntry<StaffCalendarEntryMeta>[]>([]);
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);

  const loadCalendar = useCallback(
    async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      setCalendarLoading(true);
      try {
        const [events, appointments, slots] = await Promise.all([
          eventsApiClient.listEventsAccumulated({
            startDate,
            endDate,
            page: 1,
            limit: 100,
            sortBy: 'start_date',
            sortOrder: 'asc',
          }),
          isAdmin
            ? portalAdminAppointmentsApiClient.listAppointmentsAll({
                date_from: startDate,
                date_to: endDate,
              })
            : Promise.resolve([]),
          isAdmin
            ? portalAdminAppointmentsApiClient.listAppointmentSlotsAll({
                from: startDate,
                to: endDate,
              })
            : Promise.resolve([]),
        ]);

        const nextEntries = [
          ...(events.data || []).map(normalizeEventEntry),
          ...appointments.map(normalizeAppointmentEntry),
          ...slots.map(normalizeSlotEntry),
        ].sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());

        setCalendarEntries(nextEntries);
        setError(null);
        setSelectedEntryId((current) =>
          current && nextEntries.some((entry) => entry.id === current) ? current : null
        );
      } catch (loadError) {
        console.error('Failed to load staff calendar', loadError);
        setError('Unable to load the booking calendar right now.');
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

    void loadCalendar(visibleRange);
  }, [loadCalendar, visibleRange]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') {
      return calendarEntries;
    }

    const wantedKind = filter === 'events' ? 'event' : filter === 'appointments' ? 'appointment' : 'slot';
    return calendarEntries.filter((entry) => entry.kind === wantedKind);
  }, [calendarEntries, filter]);

  const selectedDateEntries = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    const key = format(selectedDate, 'yyyy-MM-dd');
    return filteredEntries.filter((entry) => toDateKey(entry.start) === key);
  }, [filteredEntries, selectedDate]);

  const selectedEntry = useMemo(
    () => filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [filteredEntries, selectedEntryId]
  );

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleSelectEntry = useCallback((entry: BookingCalendarEntry<StaffCalendarEntryMeta>) => {
    setSelectedEntryId(entry.id);
    setSelectedDate(parseISO(entry.start));
  }, []);

  const refreshVisibleRange = useCallback(async () => {
    if (!visibleRange) {
      return;
    }
    await loadCalendar(visibleRange);
  }, [loadCalendar, visibleRange]);

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

  const selectedEvent = selectedEntry?.metadata.kind === 'event' ? selectedEntry.metadata.event : null;
  const selectedAppointment =
    selectedEntry?.metadata.kind === 'appointment' ? selectedEntry.metadata.appointment : null;
  const selectedSlot = selectedEntry?.metadata.kind === 'slot' ? selectedEntry.metadata.slot : null;

  return (
    <NeoBrutalistLayout pageTitle="CALENDAR">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-app-text">
              {isAdmin ? 'Booking Calendar' : 'Event Calendar'}
            </h1>
            <p className="mt-1 text-sm text-app-text-muted">
              {isAdmin
                ? 'Manage events, appointment requests, and open booking slots in one calendar.'
                : 'View and manage upcoming events. Appointment scheduling remains admin-only.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/events/new')}
              className="rounded-md bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
            >
              Create Event
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/settings/admin/portal/slots')}
                className="rounded-md border border-app-input-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text hover:bg-app-surface-muted"
              >
                Manage Slots
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {([
            ['all', 'All'],
            ['events', 'Events'],
            ['appointments', 'Appointments'],
            ['slots', 'Open slots'],
          ] as const)
            .filter(([value]) => isAdmin || value === 'all' || value === 'events')
            .map(([value, label]) => (
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

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BookingCalendarView
              entries={filteredEntries}
              loading={loading || calendarLoading}
              selectedDate={selectedDate}
              selectedEntryId={selectedEntryId}
              onDateSelect={handleSelectDate}
              onEntryClick={handleSelectEntry}
              onMonthRangeChange={(range) => {
                setVisibleRange(range);
              }}
            />
          </div>

          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-app-text">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Selected day'}
              </h2>
              <p className="mt-1 text-sm text-app-text-muted">
                {selectedDateEntries.length} item{selectedDateEntries.length === 1 ? '' : 's'} on this day
              </p>

              <div className="mt-4 space-y-2">
                {selectedDateEntries.length === 0 ? (
                  <p className="text-sm text-app-text-muted">Nothing scheduled for this date.</p>
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
            </div>

            <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
              {selectedEntry ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                      {entryKindLabel[selectedEntry.metadata.kind]}
                    </div>
                    <h3 className="mt-1 text-xl font-semibold text-app-text">{selectedEntry.title}</h3>
                    <div className="mt-2 text-sm text-app-text-muted">
                      {format(parseISO(selectedEntry.start), 'PPP p')}
                      {selectedEntry.end ? ` - ${format(parseISO(selectedEntry.end), 'p')}` : ''}
                    </div>
                    {selectedEntry.location && (
                      <div className="mt-1 text-sm text-app-text-muted">{selectedEntry.location}</div>
                    )}
                  </div>

                  {selectedEvent && (
                    <>
                      {selectedEvent.description && (
                        <p className="text-sm text-app-text-muted">{selectedEvent.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs text-app-text-muted">
                          {selectedEvent.status}
                        </span>
                        <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs text-app-accent-text">
                          {formatEventType(selectedEvent.event_type)}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/events/${selectedEvent.event_id}`)}
                          className="flex-1 rounded-md bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)]"
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/events/${selectedEvent.event_id}/edit`)}
                          className="flex-1 rounded-md border border-app-input-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text"
                        >
                          Edit
                        </button>
                      </div>
                    </>
                  )}

                  {selectedAppointment && (
                    <>
                      {selectedAppointment.description && (
                        <p className="text-sm text-app-text-muted">{selectedAppointment.description}</p>
                      )}
                      <p className="text-sm text-app-text-muted">
                        Status: {selectedAppointment.status}
                        {selectedAppointment.request_type
                          ? ` • ${selectedAppointment.request_type.replace('_', ' ')}`
                          : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedAppointment.status === 'requested' && (
                          <button
                            type="button"
                            onClick={() => void handleConfirmAppointment(selectedAppointment.id)}
                            disabled={savingEntryId === selectedEntry.id}
                            className="rounded-md bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)] disabled:opacity-60"
                          >
                            {savingEntryId === selectedEntry.id ? 'Saving...' : 'Confirm'}
                          </button>
                        )}
                        {selectedAppointment.status === 'confirmed' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleCheckInAppointment(selectedAppointment)}
                              disabled={savingEntryId === selectedEntry.id}
                              className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text disabled:opacity-60"
                            >
                              {selectedAppointment.case_id ? 'Resolve in case' : 'Check in'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCancelAppointment(selectedAppointment)}
                              disabled={savingEntryId === selectedEntry.id}
                              className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text disabled:opacity-60"
                            >
                              {selectedAppointment.case_id ? 'Open case' : 'Cancel'}
                            </button>
                          </>
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
                        {selectedSlot.booked_count}/{selectedSlot.capacity} booked
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleToggleSlotStatus(selectedSlot)}
                          disabled={savingEntryId === selectedEntry.id || selectedSlot.status === 'cancelled'}
                          className="flex-1 rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text disabled:opacity-60"
                        >
                          {savingEntryId === selectedEntry.id
                            ? 'Saving...'
                            : selectedSlot.status === 'open'
                              ? 'Close slot'
                              : 'Open slot'}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/settings/admin/portal/slots')}
                          className="flex-1 rounded-md bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)]"
                        >
                          Manage
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-sm text-app-text-muted">
                  Select a calendar item to view details and actions.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </NeoBrutalistLayout>
  );
}
