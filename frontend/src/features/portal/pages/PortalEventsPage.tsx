import { useEffect, useMemo, useState } from 'react';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import { useToast } from '../../../contexts/useToast';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('oldest');
  const [loading, setLoading] = useState(true);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const visibleEvents = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const sorted = [...events].sort((a, b) => {
      const aTime = new Date(a.start_date).getTime();
      const bTime = new Date(b.start_date).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return sorted.filter((event) => {
      if (!needle) {
        return true;
      }

      const haystack = [
        event.name,
        event.description,
        event.location_name,
        event.event_type,
        event.registration_status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [events, searchTerm, sortOrder]);

  const loadEvents = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/events');
      setEvents(unwrapApiData(response.data));
    } catch (loadError) {
      console.error('Failed to load events', loadError);
      setError('Unable to load events right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
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
    } catch (registerError) {
      setEvents(previous);
      showError('Could not register for this event.');
      console.error('Failed to register event', registerError);
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
    } catch (cancelError) {
      setEvents(previous);
      showError('Could not cancel registration.');
      console.error('Failed to cancel event registration', cancelError);
    } finally {
      setSavingEventId(null);
    }
  };

  return (
    <PortalPageShell
      title="Events"
      description="Browse upcoming opportunities and manage your registrations."
      actions={
        <div className="flex flex-wrap gap-2">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search events"
            className="rounded-md border border-app-input-border px-3 py-2 text-sm"
          />
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm"
          >
            <option value="oldest">Soonest first</option>
            <option value="newest">Latest first</option>
          </select>
        </div>
      }
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && visibleEvents.length === 0}
        loadingLabel="Loading events..."
        emptyTitle={searchTerm ? 'No matching events.' : 'No events available right now.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Staff will publish upcoming opportunities here.'
        }
        onRetry={loadEvents}
      />
      {!loading && !error && visibleEvents.length > 0 && (
        <ul className="space-y-3">
          {visibleEvents.map((event) => {
            const isRegistered = Boolean(event.registration_id);
            return (
              <li key={event.id}>
                <PortalListCard
                  title={event.name}
                  subtitle={`${new Date(event.start_date).toLocaleString()} - ${new Date(event.end_date).toLocaleString()}`}
                  meta={event.location_name || 'Location provided by staff'}
                  badges={
                    <>
                      {event.event_type && (
                        <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                          {event.event_type}
                        </span>
                      )}
                      {isRegistered && (
                        <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text">
                          Registered
                        </span>
                      )}
                    </>
                  }
                  actions={
                    isRegistered ? (
                      <button
                        onClick={() => void handleCancel(event.id)}
                        disabled={savingEventId === event.id}
                        className="rounded border border-app-input-border px-3 py-1 text-xs"
                      >
                        {savingEventId === event.id ? 'Saving...' : 'Cancel'}
                      </button>
                    ) : (
                      <button
                        onClick={() => void handleRegister(event.id)}
                        disabled={savingEventId === event.id}
                        className="rounded bg-app-accent px-3 py-1 text-xs text-white"
                      >
                        {savingEventId === event.id ? 'Saving...' : 'Register'}
                      </button>
                    )
                  }
                >
                  {event.description && <p className="text-sm text-app-text-muted">{event.description}</p>}
                </PortalListCard>
              </li>
            );
          })}
        </ul>
      )}
    </PortalPageShell>
  );
}
