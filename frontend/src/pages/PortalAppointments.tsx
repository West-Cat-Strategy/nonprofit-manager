import { useEffect, useMemo, useState } from 'react';
import portalApi from '../services/portalApi';
import { useToast } from '../contexts/useToast';
import PortalPageState from '../components/portal/PortalPageState';
import ConfirmDialog from '../components/ConfirmDialog';
import useConfirmDialog from '../hooks/useConfirmDialog';

interface Appointment {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  status: string;
  location?: string | null;
  case_number?: string | null;
  case_title?: string | null;
  request_type?: 'manual_request' | 'slot_booking';
}

interface CaseContext {
  case_id: string;
  case_number: string;
  case_title: string;
  is_messageable: boolean;
  is_default: boolean;
}

interface PointpersonContextPayload {
  default_case_id: string | null;
  selected_case_id?: string | null;
  cases: CaseContext[];
}

interface AppointmentSlot {
  id: string;
  title: string | null;
  details: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  available_count: number;
  status: 'open' | 'closed' | 'cancelled';
  case_number?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
}

interface SlotsPayload {
  selected_case_id: string | null;
  selected_pointperson_user_id: string | null;
  slots: AppointmentSlot[];
}

const toIsoFromLocal = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export default function PortalAppointments() {
  const [mode, setMode] = useState<'slot' | 'request'>('slot');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [context, setContext] = useState<PointpersonContextPayload | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleCancel: handleDialogCancel, handleConfirm } = useConfirmDialog();

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

  const loadContext = async () => {
    const response = await portalApi.get<PointpersonContextPayload>('/portal/pointperson/context');
    const payload = response.data;
    setContext(payload);

    const nextCaseId = payload.selected_case_id || payload.default_case_id || payload.cases[0]?.case_id || '';
    if (!selectedCaseId) {
      setSelectedCaseId(nextCaseId);
    }
  };

  const loadAppointments = async () => {
    const response = await portalApi.get<Appointment[]>('/portal/appointments');
    setAppointments(response.data || []);
  };

  const loadSlots = async (caseId: string) => {
    setSlotsLoading(true);
    try {
      const response = await portalApi.get<SlotsPayload>('/portal/appointments/slots', {
        params: caseId ? { case_id: caseId } : undefined,
      });
      setSlots(response.data.slots || []);
      if (response.data.selected_case_id && !selectedCaseId) {
        setSelectedCaseId(response.data.selected_case_id);
      }
    } finally {
      setSlotsLoading(false);
    }
  };

  const loadInitial = async () => {
    try {
      setError(null);
      setLoading(true);
      await Promise.all([loadContext(), loadAppointments()]);
    } catch (err) {
      console.error('Failed to load appointments', err);
      setError('Unable to load appointments right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCaseId) {
      return;
    }
    if (mode === 'slot') {
      void loadSlots(selectedCaseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedCaseId]);

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

    setSaving(true);
    try {
      await portalApi.post('/portal/appointments/requests', {
        case_id: selectedCaseId || undefined,
        title: formData.title,
        description: formData.description || undefined,
        start_time: startIso,
        end_time: endIso || undefined,
        location: formData.location || undefined,
      });
      setFormData({ title: '', description: '', start_time: '', end_time: '', location: '' });
      showSuccess('Appointment request submitted.');
      await loadAppointments();
    } catch (err) {
      console.error('Failed to request appointment', err);
      showError('Could not request appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleBookSlot = async (slot: AppointmentSlot) => {
    if (!selectedCaseId) {
      showError('Select a case before booking.');
      return;
    }

    setBookingSlotId(slot.id);
    try {
      await portalApi.post(`/portal/appointments/slots/${slot.id}/book`, {
        case_id: selectedCaseId,
      });
      showSuccess('Appointment booked.');
      await Promise.all([loadAppointments(), loadSlots(selectedCaseId)]);
    } catch (err) {
      console.error('Failed to book slot', err);
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
      await portalApi.patch(`/portal/appointments/${id}/cancel`);
      showSuccess('Appointment canceled.');
      await loadAppointments();
      if (selectedCaseId && mode === 'slot') {
        await loadSlots(selectedCaseId);
      }
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      showError('Could not cancel appointment.');
    } finally {
      setAppointmentToCancel(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-app-text">Appointments</h2>

      <PortalPageState
        loading={loading}
        error={error}
        empty={false}
        loadingLabel="Loading appointments..."
        onRetry={loadInitial}
      />

      {!loading && !error && (
        <>
          <section className="rounded-lg border border-app-border bg-app-surface p-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode('slot')}
                className={`rounded-md px-4 py-2 text-sm ${
                  mode === 'slot' ? 'bg-app-accent text-white' : 'bg-app-surface-muted text-app-text-muted'
                }`}
              >
                Book a Slot
              </button>
              <button
                type="button"
                onClick={() => setMode('request')}
                className={`rounded-md px-4 py-2 text-sm ${
                  mode === 'request' ? 'bg-app-accent text-white' : 'bg-app-surface-muted text-app-text-muted'
                }`}
              >
                Request Appointment
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-app-text-label mb-1">Case</label>
              <select
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

            {mode === 'slot' ? (
              <div className="mt-4">
                {selectedCase && !selectedCase.is_messageable ? (
                  <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                    This case has no assigned pointperson yet, so no bookable slots are available.
                  </div>
                ) : slotsLoading ? (
                  <p className="text-sm text-app-text-muted">Loading available slots...</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-app-text-muted">No available slots for this case right now.</p>
                ) : (
                  <ul className="space-y-3">
                    {slots.map((slot) => (
                      <li key={slot.id} className="rounded-lg border border-app-border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-app-text">{slot.title || 'Appointment Slot'}</div>
                            <div className="text-sm text-app-text-muted">
                              {new Date(slot.start_time).toLocaleString()} -{' '}
                              {new Date(slot.end_time).toLocaleString()}
                            </div>
                            {slot.location && (
                              <div className="text-sm text-app-text-muted">{slot.location}</div>
                            )}
                            {slot.details && (
                              <div className="mt-1 text-sm text-app-text-muted">{slot.details}</div>
                            )}
                            <div className="mt-1 text-xs text-app-text-subtle">
                              Staff: {slot.pointperson_first_name || 'Assigned'} {slot.pointperson_last_name || ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-app-text-muted mb-2">{slot.available_count} spots left</div>
                            <button
                              type="button"
                              onClick={() => handleBookSlot(slot)}
                              disabled={bookingSlotId === slot.id || slot.available_count <= 0}
                              className="rounded-md bg-app-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
                            >
                              {bookingSlotId === slot.id ? 'Booking...' : 'Book'}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="mt-4 space-y-4">
                <input
                  name="title"
                  placeholder="Appointment title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                  required
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="w-full rounded-md border border-app-input-border px-3 py-2"
                    required
                  />
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="w-full rounded-md border border-app-input-border px-3 py-2"
                  />
                </div>
                <input
                  name="location"
                  placeholder="Location (optional)"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-app-accent px-4 py-2 text-white disabled:opacity-50"
                >
                  {saving ? 'Submitting...' : 'Request Appointment'}
                </button>
              </form>
            )}
          </section>

          <section>
            <h3 className="text-lg font-medium text-app-text">Your Appointments</h3>
            <PortalPageState
              loading={false}
              error={null}
              empty={appointments.length === 0}
              emptyTitle="No appointments yet."
              emptyDescription="Book a slot or submit a manual request to get started."
              onRetry={loadInitial}
            />
            {appointments.length > 0 && (
              <ul className="mt-4 space-y-3">
                {appointments.map((appointment) => (
                  <li key={appointment.id} className="rounded-lg border border-app-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-app-text">{appointment.title}</div>
                        <div className="text-sm text-app-text-muted">
                          {new Date(appointment.start_time).toLocaleString()}
                        </div>
                        <div className="text-sm text-app-text-muted">Status: {appointment.status}</div>
                        <div className="text-xs text-app-text-subtle">
                          Type: {appointment.request_type === 'slot_booking' ? 'Slot booking' : 'Manual request'}
                        </div>
                        {appointment.case_number && (
                          <div className="text-xs text-app-text-subtle">
                            Case: {appointment.case_number} - {appointment.case_title || 'Case'}
                          </div>
                        )}
                      </div>
                      {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                        <button
                          onClick={() => handleCancelAppointment(appointment.id)}
                          disabled={appointmentToCancel === appointment.id}
                          className="text-sm text-red-600 hover:underline"
                        >
                          {appointmentToCancel === appointment.id ? 'Canceling...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleDialogCancel} />
    </div>
  );
}
