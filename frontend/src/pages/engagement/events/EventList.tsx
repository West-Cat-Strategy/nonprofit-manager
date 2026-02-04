/**
 * EventList Component
 * Displays paginated list of events with filters
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchEvents } from '../../../store/slices/eventsSlice';
import type { Event, EventStatus, EventType } from '../../../types/event';

const EventList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { events, pagination, loading, error } = useAppSelector((state) => state.events);

  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadEvents = useCallback(() => {
    dispatch(
      fetchEvents({
        filters: {
          search: search || undefined,
          event_type: eventType || undefined,
          status: status || undefined,
        },
        pagination: {
          page: currentPage,
          limit: 20,
          sort_by: 'start_date',
          sort_order: 'desc',
        },
      })
    );
  }, [dispatch, search, eventType, status, currentPage]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      planned: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      postponed: 'bg-yellow-100 text-yellow-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      fundraiser: 'bg-purple-100 text-purple-800',
      community: 'bg-blue-100 text-blue-800',
      training: 'bg-indigo-100 text-indigo-800',
      meeting: 'bg-gray-100 text-gray-800',
      volunteer: 'bg-green-100 text-green-800',
      social: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
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
      <span className="text-gray-600">
        {event.registered_count}/{event.capacity}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <button
          onClick={() => navigate('/events/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Event
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-md"
        />

        <select
          value={eventType}
          onChange={(e) => {
            setEventType(e.target.value as EventType | '');
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-md"
        >
          <option value="">All Types</option>
          <option value="fundraiser">Fundraiser</option>
          <option value="community">Community</option>
          <option value="training">Training</option>
          <option value="meeting">Meeting</option>
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
          className="px-4 py-2 border rounded-md"
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="postponed">Postponed</option>
        </select>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      {loading ? (
        <div className="text-center py-12">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No events found. Create your first event to get started.
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.event_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{event.event_name}</div>
                      {event.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {event.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(event.event_type)}`}
                      >
                        {event.event_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatDateTime(event.start_date)}</div>
                      {event.end_date && event.end_date !== event.start_date && (
                        <div className="text-xs text-gray-500">
                          to {formatDateTime(event.end_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {event.location_name ? (
                        <div>
                          <div className="font-medium">{event.location_name}</div>
                          {event.city && event.state_province && (
                            <div className="text-xs text-gray-500">
                              {event.city}, {event.state_province}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">TBD</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getCapacityStatus(event) || <span className="text-gray-400">Unlimited</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(event.status)}`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/events/${event.event_id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/events/${event.event_id}/edit`)}
                        className="text-indigo-600 hover:text-indigo-900"
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
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} total
                events)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={currentPage === pagination.total_pages}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EventList;
