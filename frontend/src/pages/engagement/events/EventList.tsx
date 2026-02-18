/**
 * EventList Component
 * Displays paginated list of events with filters
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchEvents } from '../../../store/slices/eventsSlice';
import type { Event, EventStatus, EventType } from '../../../types/event';
import { formatDateTime } from '../../../utils/format';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';

const EventList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { events, pagination, loading, error } = useAppSelector((state) => state.events);

  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [visibility, setVisibility] = useState<'all' | 'public' | 'private'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const loadEvents = useCallback(() => {
    dispatch(
      fetchEvents({
        filters: {
          search: search || undefined,
          event_type: eventType || undefined,
          status: status || undefined,
          is_public:
            visibility === 'public' ? true : visibility === 'private' ? false : undefined,
        },
        pagination: {
          page: currentPage,
          limit: 20,
          sort_by: 'start_date',
          sort_order: 'desc',
        },
      })
    );
  }, [dispatch, search, eventType, status, visibility, currentPage]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      planned: 'bg-app-accent-soft text-app-accent-text',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-app-surface-muted text-app-text',
      cancelled: 'bg-red-100 text-red-800',
      postponed: 'bg-yellow-100 text-yellow-800',
    };
    return badges[status] || 'bg-app-surface-muted text-app-text';
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      fundraiser: 'bg-purple-100 text-purple-800',
      community: 'bg-app-accent-soft text-app-accent-text',
      training: 'bg-indigo-100 text-indigo-800',
      meeting: 'bg-app-surface-muted text-app-text',
      workshop: 'bg-orange-100 text-orange-800',
      webinar: 'bg-cyan-100 text-cyan-800',
      conference: 'bg-blue-100 text-blue-800',
      outreach: 'bg-emerald-100 text-emerald-800',
      volunteer: 'bg-green-100 text-green-800',
      social: 'bg-pink-100 text-pink-800',
      other: 'bg-app-surface-muted text-app-text',
    };
    return badges[type] || 'bg-app-surface-muted text-app-text';
  };

  const getCapacityStatus = (event: Event) => {
    if (!event.capacity) return null;

    const percentage = (event.registered_count / event.capacity) * 100;
    if (percentage >= 100) {
      return <span className="text-red-600 font-semibold">FULL</span>;
    } else if (percentage >= 80) {
      return <span className="text-orange-600">Almost Full</span>;
    }
    return (
      <span className="text-app-text-muted">
        {event.registered_count}/{event.capacity}
      </span>
    );
  };

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-[var(--app-text)]">Events</h1>
        <button
          onClick={() => navigate('/events/new')}
          className="px-4 py-2 bg-[var(--loop-purple)] text-black border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all font-bold uppercase"
        >
          Create Event
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)] focus:outline-none focus:ring-2 focus:ring-[var(--app-border)]"
        />

        <select
          value={eventType}
          onChange={(e) => {
            setEventType(e.target.value as EventType | '');
            setCurrentPage(1);
          }}
          className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)] focus:outline-none focus:ring-2 focus:ring-[var(--app-border)]"
        >
          <option value="">All Types</option>
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

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as EventStatus | '');
            setCurrentPage(1);
          }}
          className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)] focus:outline-none focus:ring-2 focus:ring-[var(--app-border)]"
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="postponed">Postponed</option>
        </select>

        <select
          value={visibility}
          onChange={(e) => {
            setVisibility(e.target.value as 'all' | 'public' | 'private');
            setCurrentPage(1);
          }}
          className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)] focus:outline-none focus:ring-2 focus:ring-[var(--app-border)]"
        >
          <option value="all">All Visibility</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 text-red-700 shadow-[4px_4px_0px_0px_var(--shadow-color)]">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-[var(--app-text)]">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-[var(--app-text-muted)]">
          No events found. Create your first event to get started.
        </div>
      ) : (
        <>
          <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--app-border)]">
              <thead className="bg-[var(--app-surface-muted)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--app-surface)] divide-y divide-[var(--app-border)]">
                {events.map((event) => (
                  <tr key={event.event_id} className="hover:bg-[var(--app-surface-muted)]">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[var(--app-text)] flex items-center gap-2">
                        <span>{event.event_name}</span>
                        <span className="px-2 py-1 text-xs font-semibold border-2 border-black bg-white text-black">
                          {event.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                      {event.description && (
                        <div className="text-sm text-[var(--app-text-muted)] truncate max-w-xs">
                          {event.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold border-2 border-black ${getTypeBadge(event.event_type)}`}
                      >
                        {event.event_type}
                      </span>
                      {event.is_recurring && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold border-2 border-black bg-yellow-100 text-yellow-900">
                          Recurring
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-text)]">
                      <div>{formatDateTime(event.start_date)}</div>
                      {event.end_date && event.end_date !== event.start_date && (
                        <div className="text-xs text-[var(--app-text-muted)]">
                          to {formatDateTime(event.end_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--app-text)]">
                      {event.location_name ? (
                        <div>
                          <div className="font-medium">{event.location_name}</div>
                          {event.city && event.state_province && (
                            <div className="text-xs text-[var(--app-text-muted)]">
                              {event.city}, {event.state_province}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--app-text-subtle)]">TBD</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getCapacityStatus(event) || <span className="text-[var(--app-text-subtle)]">Unlimited</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold border-2 border-black ${getStatusBadge(event.status)}`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/events/${event.event_id}`)}
                        className="text-[var(--app-accent-text)] hover:text-[var(--app-accent-text-hover)] mr-4 font-bold"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/events/${event.event_id}/edit`)}
                        className="text-[var(--app-accent-text)] hover:text-[var(--app-accent-text-hover)] font-bold"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-[var(--app-text-muted)]">
                Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} total
                events)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--app-surface-muted)] font-bold"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={currentPage === pagination.total_pages}
                  className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--app-surface-muted)] font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </NeoBrutalistLayout>
  );
};

export default EventList;
