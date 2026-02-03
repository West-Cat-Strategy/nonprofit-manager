import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';

interface PortalEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  location_name?: string;
  event_type?: string;
  registration_id?: string | null;
  registration_status?: string | null;
}

export default function PortalEvents() {
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      const response = await portalApi.get('/portal/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to load events', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleRegister = async (eventId: string) => {
    await portalApi.post(`/portal/events/${eventId}/register`);
    loadEvents();
  };

  const handleCancel = async (eventId: string) => {
    await portalApi.delete(`/portal/events/${eventId}/register`);
    loadEvents();
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading events...</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Events</h2>
      <ul className="mt-4 space-y-3">
        {events.map((event) => {
          const isRegistered = Boolean(event.registration_id);
          return (
            <li key={event.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(event.start_date).toLocaleString()} - {new Date(event.end_date).toLocaleString()}
                  </p>
                  {event.location_name && (
                    <p className="text-sm text-gray-500">{event.location_name}</p>
                  )}
                </div>
                <div>
                  {isRegistered ? (
                    <button
                      onClick={() => handleCancel(event.id)}
                      className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegister(event.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Register
                    </button>
                  )}
                </div>
              </div>
              {event.description && <p className="mt-2 text-sm text-gray-600">{event.description}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
