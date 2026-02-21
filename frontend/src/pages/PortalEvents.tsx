import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';
import { unwrapApiData } from '../services/apiEnvelope';
import { useToast } from '../contexts/useToast';
import PortalPageState from '../components/portal/PortalPageState';

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
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const loadEvents = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/events');
      setEvents(unwrapApiData(response.data));
    } catch (err) {
      console.error('Failed to load events', err);
      setError('Unable to load events right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleRegister = async (eventId: string) => {
    const previous = events;
    setSavingEventId(eventId);
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? { ...event, registration_id: event.registration_id || 'optimistic', registration_status: 'registered' }
          : event
      )
    );
    try {
      await portalApi.post(`/v2/portal/events/${eventId}/register`);
      showSuccess('Registered for event.');
      await loadEvents();
    } catch (err) {
      setEvents(previous);
      showError('Could not register for this event.');
      console.error('Failed to register event', err);
    } finally {
      setSavingEventId(null);
    }
  };

  const handleCancel = async (eventId: string) => {
    const previous = events;
    setSavingEventId(eventId);
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, registration_id: null, registration_status: 'cancelled' } : event
      )
    );
    try {
      await portalApi.delete(`/v2/portal/events/${eventId}/register`);
      showSuccess('Registration canceled.');
      await loadEvents();
    } catch (err) {
      setEvents(previous);
      showError('Could not cancel registration.');
      console.error('Failed to cancel event registration', err);
    } finally {
      setSavingEventId(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Events</h2>
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && events.length === 0}
        loadingLabel="Loading events..."
        emptyTitle="No events available right now."
        emptyDescription="Staff will publish upcoming opportunities here."
        onRetry={loadEvents}
      />
      {!loading && !error && events.length > 0 && (
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
                      disabled={savingEventId === event.id}
                      className="px-3 py-1 text-sm bg-app-surface-muted rounded-md hover:bg-app-hover"
                    >
                      {savingEventId === event.id ? 'Saving...' : 'Cancel'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegister(event.id)}
                      disabled={savingEventId === event.id}
                      className="px-3 py-1 text-sm bg-app-accent text-white rounded-md hover:bg-app-accent-hover"
                    >
                      {savingEventId === event.id ? 'Saving...' : 'Register'}
                    </button>
                  )}
                </div>
              </div>
              {event.description && <p className="mt-2 text-sm text-app-text-muted">{event.description}</p>}
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
