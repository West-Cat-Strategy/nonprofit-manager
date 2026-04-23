import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import { useToast } from '../../../contexts/useToast';
import PortalPageState from '../../../components/portal/PortalPageState';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import { usePersistentPortalCaseContext } from '../../../hooks/usePersistentPortalCaseContext';
import usePortalAppointments from '../../../features/portal/client/usePortalAppointments';
import type { PortalStreamStatus } from '../../../features/portal/client/types';
import type {
  PortalAppointmentSlot,
  PortalAppointmentSlotsPayload,
  PortalPointpersonContext,
} from '../types/contracts';

type AppointmentStatusFilter = 'all' | 'requested' | 'confirmed' | 'cancelled' | 'completed';
type AppointmentCaseFilter = 'all' | 'selected';

const POLL_INTERVAL_MS = 30_000;

const toIsoFromLocal = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatPointpersonName = (
  firstName?: string | null,
  lastName?: string | null
): string | null => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || null;
};

const formatCaseSummary = (
  caseEntry?: { case_number?: string | null; case_title?: string | null } | null
): string | null => {
  if (!caseEntry?.case_number && !caseEntry?.case_title) {
    return null;
  }

  if (caseEntry.case_number && caseEntry.case_title) {
    return `${caseEntry.case_number} - ${caseEntry.case_title}`;
  }

  return caseEntry.case_number || caseEntry.case_title || null;
};

const getStreamStatusBadge = (status: PortalStreamStatus): { label: string; className: string } => {
  if (status === 'connected') {
    return {
      label: 'Live updates on',
      className: 'bg-app-accent-soft text-app-accent-text',
    };
  }

  if (status === 'connecting') {
    return {
      label: 'Connecting live updates...',
      className: 'bg-app-surface-muted text-app-text-muted',
    };
  }

  if (status === 'error') {
    return {
      label: 'Live updates unavailable (polling)',
      className: 'bg-app-accent-soft text-app-accent-text',
    };
  }

  return {
    label: 'Live updates disabled (polling)',
    className: 'bg-app-surface-muted text-app-text-muted',
  };
};

export default function PortalAppointments() {
  const [mode, setMode] = useState<'slot' | 'request'>('slot');
  const [slots, setSlots] = useState<PortalAppointmentSlot[]>([]);
  const [context, setContext] = useState<PortalPointpersonContext | null>(null);

  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [appointmentStatusFilter, setAppointmentStatusFilter] =
    useState<AppointmentStatusFilter>('all');
  const [appointmentCaseFilter, setAppointmentCaseFilter] = useState<AppointmentCaseFilter>('selected');
  const [appointmentFrom, setAppointmentFrom] = useState('');
  const [appointmentTo, setAppointmentTo] = useState('');
  const [slotSearch, setSlotSearch] = useState('');

  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleCancel: handleDialogCancel, handleConfirm } = useConfirmDialog();
  const {
    selectedCaseId,
    setSelectedCaseId,
    clearSelectedCaseId,
  } = usePersistentPortalCaseContext();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
  });

  const selectedCase = useMemo(
    () => context?.cases.find((caseEntry) => caseEntry.case_id === selectedCaseId) || null,
    [context, selectedCaseId]
  );
  const selectedCaseSummary = useMemo(() => formatCaseSummary(selectedCase), [selectedCase]);
  const selectedCasePointperson = useMemo(
    () => formatPointpersonName(selectedCase?.pointperson_first_name, selectedCase?.pointperson_last_name),
    [selectedCase]
  );

  const visibleSlots = useMemo(() => {
    const needle = slotSearch.trim().toLowerCase();
    const sorted = [...slots].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return sorted.filter((slot) => {
      if (!needle) {
        return true;
      }

      const haystack = [
        slot.title,
        slot.details,
        slot.location,
        slot.case_number,
        slot.pointperson_first_name,
        slot.pointperson_last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [slotSearch, slots]);

  const loadSlots = useCallback(
    async (caseId: string) => {
      setSlotsLoading(true);
      try {
        const response = await portalApi.get<PortalAppointmentSlotsPayload>('/v2/portal/appointments/slots', {
          params: caseId ? { case_id: caseId } : undefined,
        });
        const payload = unwrapApiData(response.data);
        setSlots(payload.slots || []);
        if (!selectedCaseId && payload.selected_case_id) {
          setSelectedCaseId(payload.selected_case_id);
        }
      } finally {
        setSlotsLoading(false);
      }
    },
    [selectedCaseId, setSelectedCaseId]
  );

  const {
    appointments,
    loading: appointmentsLoading,
    loadingMore,
    hasMore,
    error: appointmentsError,
    streamStatus,
    refresh: refreshAppointments,
    loadMore,
  } = usePortalAppointments({
    statusFilter: appointmentStatusFilter,
    search: appointmentSearch,
    selectedCaseId,
    caseFilter: appointmentCaseFilter,
    from: toIsoFromLocal(appointmentFrom) || undefined,
    to: toIsoFromLocal(appointmentTo) || undefined,
    onRealtimeEvent: () => {
      if (!selectedCaseId || mode !== 'slot') {
        return;
      }
      void loadSlots(selectedCaseId);
    },
  });

  const streamBadge = useMemo(() => getStreamStatusBadge(streamStatus), [streamStatus]);

  const loadContext = useCallback(async () => {
    const response = await portalApi.get<PortalPointpersonContext>('/v2/portal/pointperson/context');
    const payload = unwrapApiData(response.data);
    setContext(payload);

    const caseIds = new Set(payload.cases.map((entry) => entry.case_id));
    const nextCaseId =
      (selectedCaseId && caseIds.has(selectedCaseId) ? selectedCaseId : null) ||
      (payload.selected_case_id && caseIds.has(payload.selected_case_id) ? payload.selected_case_id : null) ||
      (payload.default_case_id && caseIds.has(payload.default_case_id) ? payload.default_case_id : null) ||
      payload.cases[0]?.case_id ||
      '';

    if (nextCaseId) {
      setSelectedCaseId(nextCaseId);
    } else {
      clearSelectedCaseId();
    }
  }, [clearSelectedCaseId, selectedCaseId, setSelectedCaseId]);

  const loadInitial = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await Promise.all([loadContext(), refreshAppointments()]);
    } catch (loadError) {
      console.error('Failed to load appointments', loadError);
      setError('Unable to load appointments right now.');
    } finally {
      setLoading(false);
    }
  }, [loadContext, refreshAppointments]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!selectedCaseId || mode !== 'slot') {
      return;
    }
    void loadSlots(selectedCaseId);
  }, [loadSlots, mode, selectedCaseId]);

  useEffect(() => {
    if (mode !== 'slot' || !selectedCaseId) {
      return;
    }

    if (streamStatus === 'connected' || streamStatus === 'connecting') {
      return;
    }

    const interval = window.setInterval(() => {
      void loadSlots(selectedCaseId);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadSlots, mode, selectedCaseId, streamStatus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const startIso = toIsoFromLocal(formData.start_time);
    const endIso = toIsoFromLocal(formData.end_time);

    if (!startIso) {
      showError('Please select a valid start time.');
      return;
    }
    if (endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      showError('End time must be after start time.');
      return;
    }

    setSaving(true);
    try {
      await portalApi.post('/v2/portal/appointments/requests', {
        case_id: selectedCaseId || undefined,
        title: formData.title,
        description: formData.description || undefined,
        start_time: startIso,
        end_time: endIso || undefined,
        location: formData.location || undefined,
      });
      setFormData({ title: '', description: '', start_time: '', end_time: '', location: '' });
      showSuccess('Appointment request submitted.');
      await refreshAppointments();
    } catch (requestError) {
      console.error('Failed to request appointment', requestError);
      showError('Could not request appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleBookSlot = async (slot: PortalAppointmentSlot) => {
    if (!selectedCaseId) {
      showError('Select a case before booking.');
      return;
    }

    setBookingSlotId(slot.id);
    try {
      await portalApi.post(`/v2/portal/appointments/slots/${slot.id}/book`, {
        case_id: selectedCaseId,
      });
      showSuccess('Appointment booked.');
      await Promise.all([refreshAppointments(), loadSlots(selectedCaseId)]);
    } catch (bookError) {
      console.error('Failed to book slot', bookError);
      showError('Could not book this slot.');
    } finally {
      setBookingSlotId(null);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    const confirmed = await confirm({
      title: 'Cancel appointment',
      message: 'Are you sure you want to cancel this appointment?',
      confirmLabel: 'Cancel appointment',
      variant: 'warning',
    });
    if (!confirmed) return;

    setAppointmentToCancel(id);
    try {
      await portalApi.patch(`/v2/portal/appointments/${id}/cancel`);
      showSuccess('Appointment canceled.');
      await refreshAppointments();
      if (selectedCaseId && mode === 'slot') {
        await loadSlots(selectedCaseId);
      }
    } catch (cancelError) {
      console.error('Failed to cancel appointment', cancelError);
      showError('Could not cancel appointment.');
    } finally {
      setAppointmentToCancel(null);
    }
  };

  const resolvedError = error || appointmentsError;

  return (
    <PortalPageShell
      title="Appointments"
      description="Book or request time while keeping the current case workspace and messages in view."
    >
      <PortalPageState
        loading={loading}
        error={resolvedError}
        empty={false}
        loadingLabel="Loading appointments..."
        onRetry={loadInitial}
      />

      {!loading && !resolvedError && (
        <>
          <section className="rounded-lg border border-app-border bg-app-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMode('slot')}
                  className={`rounded-md px-4 py-2 text-sm ${
                    mode === 'slot' ? 'bg-app-accent text-[var(--app-accent-foreground)]' : 'bg-app-surface-muted text-app-text-muted'
                  }`}
                >
                  Book a Slot
                </button>
                <button
                  type="button"
                  onClick={() => setMode('request')}
                  className={`rounded-md px-4 py-2 text-sm ${
                    mode === 'request'
                      ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                      : 'bg-app-surface-muted text-app-text-muted'
                  }`}
                >
                  Request Appointment
                </button>
              </div>
              <span className={`rounded px-2 py-1 text-xs ${streamBadge.className}`}>
                {streamBadge.label}
              </span>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-app-text-label">Case</label>
              <select
                aria-label="Select case"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
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

            {selectedCase && (
              <div className="mt-4 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface-muted p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-app-text-subtle">
                      Selected Case
                    </p>
                    {selectedCaseSummary && (
                      <p className="mt-1 text-sm font-semibold text-app-text">{selectedCaseSummary}</p>
                    )}
                    <p className="mt-1 text-sm text-app-text-muted">
                      {selectedCasePointperson
                        ? `Pointperson: ${selectedCasePointperson}`
                        : 'Pointperson assignment is still pending for this case.'}
                    </p>
                    <p className="mt-1 text-xs text-app-text-subtle">
                      Booking, appointment requests, and messages all stay tied to this case selection.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/portal/cases/${selectedCase.case_id}`}
                      onClick={() => setSelectedCaseId(selectedCase.case_id)}
                      className="rounded border border-app-input-border px-3 py-1.5 text-xs font-medium text-app-text hover:bg-app-surface"
                    >
                      Case workspace
                    </Link>
                    <Link
                      to="/portal/messages"
                      onClick={() => setSelectedCaseId(selectedCase.case_id)}
                      className="rounded border border-app-input-border px-3 py-1.5 text-xs font-medium text-app-text hover:bg-app-surface"
                    >
                      Messages
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {mode === 'slot' ? (
              <div className="mt-4 space-y-3">
                <input
                  aria-label="Search available slots"
                  value={slotSearch}
                  onChange={(event) => setSlotSearch(event.target.value)}
                  placeholder="Search available slots"
                  className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
                />
                {selectedCase && !selectedCase.is_messageable ? (
                  <div className="rounded-md border border-app-border bg-app-accent-soft px-3 py-2 text-sm text-app-accent-text">
                    This case has no assigned pointperson yet, so no bookable slots are available.
                  </div>
                ) : slotsLoading ? (
                  <p className="text-sm text-app-text-muted">Loading available slots...</p>
                ) : visibleSlots.length === 0 ? (
                  <p className="text-sm text-app-text-muted">
                    {slotSearch
                      ? 'No available slots match your search.'
                      : 'No available slots for this case right now.'}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {visibleSlots.map((slot) => (
                      <li key={slot.id}>
                        <PortalListCard
                          title={slot.title || 'Appointment Slot'}
                          subtitle={`${new Date(slot.start_time).toLocaleString()} - ${new Date(slot.end_time).toLocaleString()}`}
                          meta={slot.location || 'Location provided by staff'}
                          badges={
                            <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                              {slot.available_count} spots left
                            </span>
                          }
                          actions={
                            <button
                              type="button"
                              onClick={() => {
                                void handleBookSlot(slot);
                              }}
                              disabled={bookingSlotId === slot.id || slot.available_count <= 0}
                              className="rounded-md bg-app-accent px-3 py-1.5 text-xs text-[var(--app-accent-foreground)] disabled:opacity-50"
                            >
                              {bookingSlotId === slot.id ? 'Booking...' : 'Book'}
                            </button>
                          }
                        >
                          {slot.details && <p className="text-sm text-app-text-muted">{slot.details}</p>}
                          <p className="text-xs text-app-text-subtle">
                            Staff: {slot.pointperson_first_name || 'Assigned'} {slot.pointperson_last_name || ''}
                          </p>
                        </PortalListCard>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="mt-4 space-y-4">
                <input
                  name="title"
                  aria-label="Appointment title"
                  placeholder="Appointment title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                  required
                />
                <textarea
                  name="description"
                  aria-label="Appointment description"
                  placeholder="Description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    type="datetime-local"
                    name="start_time"
                    aria-label="Requested appointment start time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="w-full rounded-md border border-app-input-border px-3 py-2"
                    required
                  />
                  <input
                    type="datetime-local"
                    name="end_time"
                    aria-label="Requested appointment end time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="w-full rounded-md border border-app-input-border px-3 py-2"
                  />
                </div>
                <input
                  name="location"
                  aria-label="Appointment location"
                  placeholder="Location (optional)"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] disabled:opacity-50"
                >
                  {saving ? 'Submitting...' : 'Request Appointment'}
                </button>
              </form>
            )}
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-base font-semibold text-app-text">Your Appointments</h3>
              <div className="grid w-full grid-cols-1 gap-2 md:w-auto md:grid-cols-3">
                <input
                  aria-label="Search appointments"
                  value={appointmentSearch}
                  onChange={(event) => setAppointmentSearch(event.target.value)}
                  placeholder="Search appointments"
                  className="rounded-md border border-app-input-border px-3 py-2 text-sm"
                />
                <select
                  aria-label="Filter appointments by status"
                  value={appointmentStatusFilter}
                  onChange={(event) =>
                    setAppointmentStatusFilter(event.target.value as AppointmentStatusFilter)
                  }
                  className="rounded-md border border-app-input-border px-3 py-2 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="requested">Requested</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  aria-label="Filter appointments by case scope"
                  value={appointmentCaseFilter}
                  onChange={(event) =>
                    setAppointmentCaseFilter(event.target.value as AppointmentCaseFilter)
                  }
                  className="rounded-md border border-app-input-border px-3 py-2 text-sm"
                >
                  <option value="selected">Selected case only</option>
                  <option value="all">All accessible cases</option>
                </select>
                <input
                  type="datetime-local"
                  aria-label="Appointments from date"
                  value={appointmentFrom}
                  onChange={(event) => setAppointmentFrom(event.target.value)}
                  className="rounded-md border border-app-input-border px-3 py-2 text-sm"
                />
                <input
                  type="datetime-local"
                  aria-label="Appointments to date"
                  value={appointmentTo}
                  onChange={(event) => setAppointmentTo(event.target.value)}
                  className="rounded-md border border-app-input-border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    void refreshAppointments();
                  }}
                  className="rounded-md border border-app-input-border px-3 py-2 text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>
            <PortalPageState
              loading={appointmentsLoading && appointments.length === 0}
              error={null}
              empty={appointments.length === 0}
              emptyTitle={appointmentSearch ? 'No matching appointments.' : 'No appointments yet.'}
              emptyDescription={
                appointmentSearch
                  ? 'Try a different search term.'
                  : 'Book a slot or submit a manual request to get started.'
              }
              onRetry={() => {
                void loadInitial();
              }}
            />
            {appointments.length > 0 && (
              <ul className="space-y-3">
                {appointments.map((appointment) => {
                  const appointmentCaseSummary = formatCaseSummary(appointment);
                  const appointmentPointperson = formatPointpersonName(
                    appointment.pointperson_first_name,
                    appointment.pointperson_last_name
                  );

                  return (
                    <li key={appointment.id}>
                      <PortalListCard
                        title={appointment.title}
                        subtitle={new Date(appointment.start_time).toLocaleString()}
                        meta={`Status: ${appointment.status}`}
                        badges={
                          <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                            {appointment.request_type === 'slot_booking' ? 'Slot booking' : 'Manual request'}
                          </span>
                        }
                        actions={
                          appointment.status !== 'cancelled' && appointment.status !== 'completed' ? (
                            <button
                              onClick={() => {
                                void handleCancelAppointment(appointment.id);
                              }}
                              disabled={appointmentToCancel === appointment.id}
                              className="rounded border border-app-border px-2 py-1 text-xs text-app-accent-text"
                            >
                              {appointmentToCancel === appointment.id ? 'Canceling...' : 'Cancel'}
                            </button>
                          ) : undefined
                        }
                      >
                        {appointmentCaseSummary && (
                          <p className="text-xs font-medium text-app-text">
                            Case: {appointmentCaseSummary}
                          </p>
                        )}
                        {appointmentPointperson && (
                          <p className="text-xs text-app-text-subtle">
                            Pointperson: {appointmentPointperson}
                          </p>
                        )}
                        {appointment.description && (
                          <p className="text-sm text-app-text-muted">{appointment.description}</p>
                        )}
                        {appointment.location && (
                          <p className="text-xs text-app-text-subtle">Location: {appointment.location}</p>
                        )}
                        {appointment.status === 'confirmed' && (
                          <p className="text-xs text-app-text-subtle">
                            Reminder cadence: 24h and 2h before start
                          </p>
                        )}
                      </PortalListCard>
                    </li>
                  );
                })}
              </ul>
            )}
            {hasMore && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    void loadMore();
                  }}
                  disabled={loadingMore}
                  className="rounded-md border border-app-input-border px-4 py-2 text-sm disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleDialogCancel} />
    </PortalPageShell>
  );
}
