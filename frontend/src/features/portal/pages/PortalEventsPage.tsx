import { useEffect, useState } from 'react';
import PortalPageState from '../../../components/portal/PortalPageState';
import { useToast } from '../../../contexts/useToast';
import { portalV2ApiClient } from '../api/portalApiClient';
import type { PortalEvent } from '../types/contracts';

export default function PortalEventsPage() {
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const loadEvents = async () => {
    try {
      setError(null);
      const data = await portalV2ApiClient.listEvents();
      setEvents(data);
    } catch (loadError) {
      setError('Unable to load events right now.');
      console.error('Failed to load v2 portal events', loadError);
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
      await portalV2ApiClient.registerEvent(eventId);
      showSuccess('Registered for event.');
      await loadEvents();
    } catch (requestError) {
      setEvents(previous);
      showError('Could not register for this event.');
      console.error('Failed to register event', requestError);
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
      await portalV2ApiClient.cancelEventRegistration(eventId);
      showSuccess('Registration canceled.');
      await loadEvents();
    } catch (requestError) {
      setEvents(previous);
      showError('Could not cancel registration.');
      console.error('Failed to cancel registration', requestError);
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
              <li key={event.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-app-text">{event.name}</h3>
                    <p className="text-sm text-app-text-muted">
                      {new Date(event.start_date).toLocaleString()} - {new Date(event.end_date).toLocaleString()}
                    </p>
                    {event.location_name && <p className="text-sm text-app-text-muted">{event.location_name}</p>}
                  </div>
                  <div>
                    {isRegistered ? (
                      <button
                        type="button"
                        onClick={() => handleCancel(event.id)}
                        disabled={savingEventId === event.id}
                        className="rounded-md bg-app-surface-muted px-3 py-1 text-sm hover:bg-app-hover"
                      >
                        {savingEventId === event.id ? 'Saving...' : 'Cancel'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRegister(event.id)}
                        disabled={savingEventId === event.id}
                        className="rounded-md bg-app-accent px-3 py-1 text-sm text-white hover:bg-app-accent-hover"
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
