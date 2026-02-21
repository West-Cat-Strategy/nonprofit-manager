import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchEventDetailV2,
  fetchEventRegistrationsV2,
  fetchEventsListV2,
  sendEventRemindersV2,
} from '../state';

export default function EventsHubPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  const listState = useAppSelector((state) => state.eventsListV2);
  const detailState = useAppSelector((state) => state.eventDetailV2);
  const registrationState = useAppSelector((state) => state.eventRegistrationV2);
  const remindersState = useAppSelector((state) => state.eventRemindersV2);

  useEffect(() => {
    dispatch(
      fetchEventsListV2({
        search: search || undefined,
        eventType: eventTypeFilter || undefined,
        page: 1,
        limit: 50,
      })
    );
  }, [dispatch, search, eventTypeFilter]);

  useEffect(() => {
    if (!selectedEventId) return;
    dispatch(fetchEventDetailV2(selectedEventId));
    dispatch(fetchEventRegistrationsV2(selectedEventId));
  }, [dispatch, selectedEventId]);

  const selectedEvent = useMemo(
    () => detailState.event ?? listState.events.find((event) => event.event_id === selectedEventId) ?? null,
    [detailState.event, listState.events, selectedEventId]
  );

  const filteredEvents = useMemo(() => {
    return listState.events.filter((event) => {
      const matchesSearch =
        search.length === 0 ||
        event.event_name.toLowerCase().includes(search.toLowerCase()) ||
        (event.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesType = eventTypeFilter.length === 0 || event.event_type === eventTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [listState.events, search, eventTypeFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-app-text">Events</h1>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('/events/new')}
          className="rounded bg-app-accent px-3 py-2 text-sm text-white"
        >
          Create Event
        </button>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search events..."
          className="min-w-64 rounded border border-app-border bg-app-surface px-3 py-2 text-sm"
        />
        <select
          value={eventTypeFilter}
          onChange={(event) => setEventTypeFilter(event.target.value)}
          className="rounded border border-app-border bg-app-surface px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="fundraiser">Fundraiser</option>
          <option value="community">Community</option>
          <option value="training">Training</option>
          <option value="meeting">Meeting</option>
          <option value="workshop">Workshop</option>
          <option value="webinar">Webinar</option>
          <option value="conference">Conference</option>
          <option value="outreach">Outreach</option>
          <option value="volunteer">Volunteer</option>
          <option value="social">Social</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-app-border bg-app-surface p-4">
          <h2 className="mb-3 text-lg font-medium text-app-text">Event Catalog</h2>
          {listState.loading && <p className="text-sm text-app-text-muted">Loading events...</p>}
          {listState.error && <p className="text-sm text-red-600">{listState.error}</p>}
          {!listState.loading && filteredEvents.length === 0 && (
            <p className="text-sm text-app-text-muted">No events match your current filters.</p>
          )}
          {filteredEvents.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Start</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.event_id}>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEventId(event.event_id)}
                        className="font-medium text-app-accent hover:underline"
                      >
                        {event.event_name}
                      </button>
                    </td>
                    <td className="py-2">{event.event_type}</td>
                    <td className="py-2">{new Date(event.start_date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-lg border border-app-border bg-app-surface p-4">
          <h2 className="mb-3 text-lg font-medium text-app-text">Event Detail</h2>
          {!selectedEvent && <p className="text-sm text-app-text-muted">Select an event.</p>}
          {selectedEvent && (
            <>
              <p className="text-base font-semibold text-app-text">{selectedEvent.event_name}</p>
              <p className="mt-1 text-sm text-app-text-muted">{selectedEvent.description ?? 'No description'}</p>
              <p className="mt-1 text-sm text-app-text-muted">Status: {selectedEvent.status}</p>
              <p className="mt-1 text-sm text-app-text-muted">
                Registrations loaded: {registrationState.registrations.length}
              </p>
              <button
                type="button"
                className="mt-3 rounded bg-app-accent px-3 py-1 text-sm text-white disabled:opacity-60"
                disabled={remindersState.sending}
                onClick={() => {
                  if (!selectedEventId) return;
                  dispatch(
                    sendEventRemindersV2({
                      eventId: selectedEventId,
                      payload: { sendEmail: true, sendSms: false },
                    })
                  );
                }}
              >
                {remindersState.sending ? 'Sending...' : 'Send Email Reminder'}
              </button>
              {remindersState.error && <p className="mt-2 text-xs text-red-600">{remindersState.error}</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
