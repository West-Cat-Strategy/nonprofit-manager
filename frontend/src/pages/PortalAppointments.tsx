import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';

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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
  });

  const loadAppointments = async () => {
    try {
      const response = await portalApi.get('/portal/appointments');
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to load appointments', error);
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
    await portalApi.post('/portal/appointments', {
      title: formData.title,
      description: formData.description || undefined,
      start_time: formData.start_time,
      end_time: formData.end_time || undefined,
      location: formData.location || undefined,
    });
    setFormData({ title: '', description: '', start_time: '', end_time: '', location: '' });
    loadAppointments();
  };

  const handleCancel = async (id: string) => {
    await portalApi.delete(`/portal/appointments/${id}`);
    loadAppointments();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Appointments</h2>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900">Request an Appointment</h3>
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
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
            Request Appointment
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900">Your Appointments</h3>
        {loading ? (
          <p className="text-sm text-gray-500 mt-2">Loading appointments...</p>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No appointments yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="p-3 border rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{appointment.title}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(appointment.start_time).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Status: {appointment.status}</div>
                  </div>
                  {appointment.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancel(appointment.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
