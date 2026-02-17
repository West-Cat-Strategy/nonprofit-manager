/**
 * EventCalendarPage
 * Full page view with calendar and event details panel
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCalendar from '../../../components/EventCalendar';
import type { Event } from '../../../types/event';
import { format, parseISO } from 'date-fns';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';

export const EventCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleClosePanel = () => {
    setSelectedEvent(null);
  };

  const handleViewDetails = () => {
    if (selectedEvent) {
      navigate(`/events/${selectedEvent.event_id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-app-surface-muted text-app-text',
      published: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-app-accent-soft text-app-accent-text',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          statusColors[status] || 'bg-app-surface-muted text-app-text'
        }`}
      >
        {status}
      </span>
    );
  };

  const formatEventType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
      <div className="container px-4 py-8 mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-app-text">
                Event Calendar
              </h1>
              <p className="mt-1 text-sm text-app-text-muted">
                View and manage upcoming events
              </p>
            </div>
            <button
              onClick={() => navigate('/events/new')}
              className="px-4 py-2 text-sm font-medium text-white bg-app-accent rounded-md hover:bg-app-accent-hover"
            >
              Create Event
            </button>
          </div>
        </div>

        {/* Calendar and Details Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar - takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <EventCalendar onEventClick={handleEventClick} />
          </div>

          {/* Event Details Panel - takes up 1 column on large screens */}
          <div className="lg:col-span-1">
            {selectedEvent ? (
              <div className="bg-app-surface rounded-lg shadow">
                {/* Panel Header */}
                <div className="flex items-start justify-between p-4 border-b">
                  <h3 className="text-lg font-semibold text-app-text">
                    Event Details
                  </h3>
                  <button
                    onClick={handleClosePanel}
                    className="text-app-text-subtle hover:text-app-text-muted"
                    aria-label="Close panel"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Panel Content */}
                <div className="p-4 space-y-4">
                  {/* Event Name */}
                  <div>
                    <h4 className="text-xl font-semibold text-app-text">
                      {selectedEvent.event_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedEvent.status)}
                    <span className="px-2 py-1 text-xs font-medium text-app-accent-text bg-app-accent-soft rounded-full">
                      {formatEventType(selectedEvent.event_type)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {selectedEvent.description && (
                  <div>
                    <p className="text-sm text-app-text-muted">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* Date and Time */}
                <div className="pt-3 border-t">
                  <div className="flex items-start mb-3">
                    <svg
                      className="w-5 h-5 mt-0.5 mr-2 text-app-text-subtle"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div className="text-sm">
                      <div className="font-medium text-app-text">
                        {format(parseISO(selectedEvent.start_date), 'PPP')}
                      </div>
                      <div className="text-app-text-muted">
                        {format(parseISO(selectedEvent.start_date), 'p')}
                        {selectedEvent.end_date &&
                          ` - ${format(parseISO(selectedEvent.end_date), 'p')}`}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  {selectedEvent.location_name && (
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 mt-0.5 mr-2 text-app-text-subtle"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <div className="text-sm text-app-text">
                        {selectedEvent.location_name}
                      </div>
                    </div>
                  )}
                </div>

                {/* Capacity */}
                {selectedEvent.capacity && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-app-text-muted">Capacity:</span>
                      <span className="font-medium text-app-text">
                        {selectedEvent.registered_count || 0} /{' '}
                        {selectedEvent.capacity}
                      </span>
                    </div>
                    <div className="w-full h-2 mt-2 bg-app-surface-muted rounded-full">
                      <div
                        className="h-2 bg-app-accent rounded-full"
                        style={{
                          width: `${Math.min(
                            ((selectedEvent.registered_count || 0) /
                              selectedEvent.capacity) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Capacity Info */}
                {selectedEvent.capacity && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center text-sm text-app-text-muted">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Capacity: {selectedEvent.registered_count || 0} / {selectedEvent.capacity}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleViewDetails}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-app-accent rounded-md hover:bg-app-accent-hover"
                  >
                    View Full Details
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/events/${selectedEvent.event_id}/edit`)
                    }
                    className="flex-1 px-4 py-2 text-sm font-medium text-app-text-muted bg-app-surface border border-app-input-border rounded-md hover:bg-app-surface-muted"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-app-surface rounded-lg shadow">
              <div className="text-center text-app-text-muted">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-app-text-subtle"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
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
};

export default EventCalendarPage;
