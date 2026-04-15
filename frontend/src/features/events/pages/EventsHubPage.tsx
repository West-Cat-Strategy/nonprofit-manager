import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchEventDetailV2,
  fetchEventRegistrationsV2,
  fetchEventsListV2,
  sendEventRemindersV2,
} from '../state';
import {
  buildEventOccurrences,
  getEventOccurrenceLabel,
  getOccurrenceDateRange,
} from '../utils/occurrences';

export default function EventsHubPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  const listState = useAppSelector((state) => state.events.list);
  const detailState = useAppSelector((state) => state.events.detail);
  const registrationState = useAppSelector((state) => state.events.registration);
  const remindersState = useAppSelector((state) => state.events.reminders);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setAppliedSearch(searchInput.trim());
    }, 300);
    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [searchInput]);

  useEffect(() => {
    dispatch(
      fetchEventsListV2({
        search: appliedSearch || undefined,
        eventType: eventTypeFilter || undefined,
        page: 1,
        limit: 50,
      })
    );
  }, [appliedSearch, dispatch, eventTypeFilter]);

  useEffect(() => {
    if (!selectedEventId) return;
    dispatch(fetchEventDetailV2(selectedEventId));
    dispatch(fetchEventRegistrationsV2(selectedEventId));
  }, [dispatch, selectedEventId]);

  const selectedEvent = useMemo(
    () => detailState.event ?? listState.events.find((event) => event.event_id === selectedEventId) ?? null,
    [detailState.event, listState.events, selectedEventId]
  );
  const selectedEventOccurrences = useMemo(
    () => buildEventOccurrences(selectedEvent),
    [selectedEvent]
  );
  const recurringEventCount = useMemo(
    () => listState.events.filter((event) => event.is_recurring).length,
    [listState.events]
  );
  const selectedOccurrence = selectedEventOccurrences[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-app-border bg-app-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-text-muted">Events</p>
            <h1 className="mt-2 text-3xl font-semibold text-app-text">Events calendar command center</h1>
            <p className="mt-2 text-sm text-app-text-muted">
              Plan event occurrences first, then jump to reminders or check-in when the selected series needs staff
              attention.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/events/calendar')}
              className="rounded bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)]"
            >
              Open Calendar
            </button>
            <button
              type="button"
              onClick={() => navigate('/events/new')}
              className="rounded border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
            >
              Create Event
            </button>
            <button
              type="button"
              onClick={() => navigate('/events/check-in')}
              className="rounded border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
            >
              Open Check-In Desk
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-app-border bg-app-surface-muted p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-app-text-muted">Loaded events</p>
            <p className="mt-2 text-2xl font-semibold text-app-text">{listState.events.length}</p>
          </div>
          <div className="rounded-md border border-app-border bg-app-surface-muted p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-app-text-muted">Recurring series</p>
            <p className="mt-2 text-2xl font-semibold text-app-text">{recurringEventCount}</p>
          </div>
          <div className="rounded-md border border-app-border bg-app-surface-muted p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-app-text-muted">Selected item</p>
            <p className="mt-2 text-sm font-semibold text-app-text">
              {selectedOccurrence ? getEventOccurrenceLabel(selectedOccurrence) : 'None selected'}
            </p>
            {selectedOccurrence && (
              <p className="mt-1 text-xs text-app-text-muted">{getOccurrenceDateRange(selectedOccurrence)}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            aria-label="Search events"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search events..."
            className="w-full rounded border border-app-border bg-app-surface px-3 py-2 text-sm sm:min-w-64 sm:flex-1"
          />
          <select
            aria-label="Filter events by type"
            value={eventTypeFilter}
            onChange={(event) => setEventTypeFilter(event.target.value)}
            className="w-full rounded border border-app-border bg-app-surface px-3 py-2 text-sm sm:w-auto"
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
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <section className="rounded-lg border border-app-border bg-app-surface p-4">
          <h2 className="mb-3 text-lg font-medium text-app-text">Event catalog</h2>
          {listState.loading && <p className="text-sm text-app-text-muted">Loading events...</p>}
          {listState.error && <p className="text-sm text-app-accent">{listState.error}</p>}
          {!listState.loading && listState.events.length === 0 && (
            <p className="text-sm text-app-text-muted">No events match your current filters.</p>
          )}
          {listState.events.length > 0 && (
            <>
              <div className="space-y-3 md:hidden">
                {listState.events.map((event) => {
                  const eventOccurrences = buildEventOccurrences(event);
                  const nextOccurrence = eventOccurrences[0] ?? null;
                  return (
                    <div
                      key={event.event_id}
                      data-testid="mobile-event-card"
                      className="rounded-[var(--ui-radius-md)] border border-app-border bg-app-bg p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-app-text">{event.event_name}</p>
                          <p className="mt-1 text-sm text-app-text-muted">{event.event_type}</p>
                          <p className="mt-1 text-sm text-app-text-muted">
                            {nextOccurrence ? getOccurrenceDateRange(nextOccurrence) : new Date(event.start_date).toLocaleString()}
                          </p>
                          {event.is_recurring && nextOccurrence && (
                            <p className="mt-1 text-xs text-app-text-muted">
                              Next: {getEventOccurrenceLabel(nextOccurrence)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedEventId(event.event_id)}
                          className="rounded border border-app-border px-3 py-2 text-sm font-medium text-app-accent hover:bg-app-surface"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="pb-2">Event</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Next occurrence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listState.events.map((event) => {
                      const eventOccurrences = buildEventOccurrences(event);
                      const nextOccurrence = eventOccurrences[0] ?? null;
                      return (
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
                          <td className="py-2">
                            <div>{event.event_type}</div>
                            {event.is_recurring && (
                              <div className="text-xs text-app-text-muted">Recurring series</div>
                            )}
                          </td>
                          <td className="py-2 text-app-text-muted">
                            {nextOccurrence ? getEventOccurrenceLabel(nextOccurrence) : new Date(event.start_date).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="rounded-lg border border-app-border bg-app-surface p-4">
          <h2 className="mb-3 text-lg font-medium text-app-text">Selected event</h2>
          {!selectedEvent && <p className="text-sm text-app-text-muted">Select an event.</p>}
          {selectedEvent && (
            <>
              <p className="text-base font-semibold text-app-text">{selectedEvent.event_name}</p>
              <p className="mt-1 text-sm text-app-text-muted">{selectedEvent.description ?? 'No description'}</p>
              <p className="mt-1 text-sm text-app-text-muted">Status: {selectedEvent.status}</p>
              <p className="mt-1 text-sm text-app-text-muted">
                Registrations loaded: {registrationState.registrations.length}
              </p>
              {selectedOccurrence && (
                <div className="mt-3 rounded-md border border-app-border bg-app-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                    Series context
                  </p>
                  <p className="mt-1 text-sm font-medium text-app-text">
                    {getEventOccurrenceLabel(selectedOccurrence)}
                  </p>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {getOccurrenceDateRange(selectedOccurrence)}
                  </p>
                </div>
              )}
              <button
                type="button"
                className="mt-3 rounded bg-app-accent px-3 py-1 text-sm text-[var(--app-accent-foreground)] disabled:opacity-60"
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
              {remindersState.error && <p className="mt-2 text-xs text-app-accent">{remindersState.error}</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
