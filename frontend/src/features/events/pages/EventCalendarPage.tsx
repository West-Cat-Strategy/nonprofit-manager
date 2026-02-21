import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import type { Event } from '../../../types/event';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import EventCalendarView from '../components/EventCalendarView';
import { fetchEventsListV2 } from '../state';

const getStatusBadgeClass = (status: string): string => {
  const statusColors: Record<string, string> = {
    planned: 'bg-app-surface-muted text-app-text',
    active: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-app-accent-soft text-app-accent-text',
  };

  return statusColors[status] || 'bg-app-surface-muted text-app-text';
};

const formatEventType = (type: string): string => {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function EventCalendarPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const listState = useAppSelector((state) => state.eventsListV2);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleMonthRangeChange = useCallback(
    ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      dispatch(
        fetchEventsListV2({
          startDate,
          endDate,
          page: 1,
          limit: 250,
          sortBy: 'start_date',
          sortOrder: 'asc',
        })
      );
    },
    [dispatch]
  );

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-app-text">Event Calendar</h1>
            <p className="mt-1 text-sm text-app-text-muted">View and manage upcoming events</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/events/new')}
            className="rounded-md bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover"
          >
            Create Event
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EventCalendarView
              events={listState.events}
              loading={listState.loading}
              onEventClick={setSelectedEvent}
              onMonthRangeChange={handleMonthRangeChange}
            />
          </div>

          <div className="lg:col-span-1">
            {selectedEvent ? (
              <div className="rounded-lg bg-app-surface shadow">
                <div className="flex items-start justify-between border-b p-4">
                  <h3 className="text-lg font-semibold text-app-text">Event Details</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="text-app-text-subtle hover:text-app-text-muted"
                    aria-label="Close panel"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 p-4">
                  <div>
                    <h4 className="text-xl font-semibold text-app-text">{selectedEvent.event_name}</h4>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(selectedEvent.status)}`}>
                        {selectedEvent.status}
                      </span>
                      <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-medium text-app-accent-text">
                        {formatEventType(selectedEvent.event_type)}
                      </span>
                    </div>
                  </div>

                  {selectedEvent.description && (
                    <p className="text-sm text-app-text-muted">{selectedEvent.description}</p>
                  )}

                  <div className="border-t pt-3 text-sm text-app-text">
                    <div>{format(parseISO(selectedEvent.start_date), 'PPP')}</div>
                    <div className="text-app-text-muted">
                      {format(parseISO(selectedEvent.start_date), 'p')}
                      {selectedEvent.end_date && ` - ${format(parseISO(selectedEvent.end_date), 'p')}`}
                    </div>
                  </div>

                  {selectedEvent.location_name && (
                    <div className="border-t pt-3 text-sm text-app-text">{selectedEvent.location_name}</div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/events/${selectedEvent.event_id}`)}
                      className="flex-1 rounded-md bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover"
                    >
                      View Full Details
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/events/${selectedEvent.event_id}/edit`)}
                      className="flex-1 rounded-md border border-app-input-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted hover:bg-app-surface-muted"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg bg-app-surface shadow">
                <div className="text-center text-app-text-muted">
                  <svg className="mx-auto mb-3 h-12 w-12 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Select an event to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </NeoBrutalistLayout>
  );
}
