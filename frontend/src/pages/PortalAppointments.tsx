import { useEffect, useState } from 'react';
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
}

export default function PortalAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleCancel: handleDialogCancel, handleConfirm } = useConfirmDialog();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
  });

  const loadAppointments = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/portal/appointments');
      setAppointments(response.data);
    } catch (err) {
      console.error('Failed to load appointments', err);
      setError('Unable to load appointments right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await portalApi.post('/portal/appointments', {
        title: formData.title,
        description: formData.description || undefined,
        start_time: formData.start_time,
        end_time: formData.end_time || undefined,
        location: formData.location || undefined,
      });
      setFormData({ title: '', description: '', start_time: '', end_time: '', location: '' });
      showSuccess('Appointment requested.');
      await loadAppointments();
    } catch (err) {
      console.error('Failed to request appointment', err);
      showError('Could not request appointment.');
    } finally {
      setSaving(false);
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

    const previous = appointments;
    setAppointmentToCancel(id);
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, status: 'cancelled' } : appointment
      )
    );
    try {
      await portalApi.delete(`/portal/appointments/${id}`);
      showSuccess('Appointment canceled.');
      await loadAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      setAppointments(previous);
      showError('Could not cancel appointment.');
    } finally {
      setAppointmentToCancel(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Appointments</h2>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-app-text">Request an Appointment</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            name="title"
            placeholder="Appointment title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="datetime-local"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <input
              type="datetime-local"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <input
            name="location"
            placeholder="Location (optional)"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          />
          <button type="submit" disabled={saving} className="px-4 py-2 bg-app-accent text-white rounded-md disabled:opacity-50">
            {saving ? 'Submitting...' : 'Request Appointment'}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium text-app-text">Your Appointments</h3>
        <PortalPageState
          loading={loading}
          error={error}
          empty={!loading && !error && appointments.length === 0}
          loadingLabel="Loading appointments..."
          emptyTitle="No appointments yet."
          emptyDescription="Use the form above to request a new appointment."
          onRetry={loadAppointments}
        />
        {!loading && !error && appointments.length > 0 && (
          <ul className="mt-4 space-y-3">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="p-3 border rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium text-app-text">{appointment.title}</div>
                    <div className="text-sm text-app-text-muted">
                      {new Date(appointment.start_time).toLocaleString()}
                    </div>
                    <div className="text-sm text-app-text-muted">Status: {appointment.status}</div>
                  </div>
                  {appointment.status !== 'cancelled' && (
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
      </div>
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleDialogCancel} />
    </div>
  );
}
