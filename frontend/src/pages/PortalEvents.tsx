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
    return <p className="text-sm text-app-text-muted">Loading events...</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Events</h2>
      <ul className="mt-4 space-y-3">
        {events.map((event) => {
          const isRegistered = Boolean(event.registration_id);
          return (
            <li key={event.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-app-text">{event.name}</h3>
                  <p className="text-sm text-app-text-muted">
                    {new Date(event.start_date).toLocaleString()} - {new Date(event.end_date).toLocaleString()}
                  </p>
                  {event.location_name && (
                    <p className="text-sm text-app-text-muted">{event.location_name}</p>
                  )}
                </div>
                <div>
                  {isRegistered ? (
                    <button
                      onClick={() => handleCancel(event.id)}
                      className="px-3 py-1 text-sm bg-app-surface-muted rounded-md hover:bg-app-hover"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegister(event.id)}
                      className="px-3 py-1 text-sm bg-app-accent text-white rounded-md hover:bg-app-accent-hover"
                    >
                      Register
                    </button>
                  )}
                </div>
              </div>
              {event.description && <p className="mt-2 text-sm text-app-text-muted">{event.description}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
