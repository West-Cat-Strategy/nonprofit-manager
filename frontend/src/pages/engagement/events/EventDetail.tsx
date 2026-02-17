/**
 * EventDetail Component
 * Displays event details with tabs for info and registrations
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchEventById,
  fetchEventRegistrations,
  checkInAttendee,
  cancelRegistration,
  clearSelectedEvent,
  clearRegistrations,
} from '../../../store/slices/eventsSlice';
import AddToCalendar from '../../../components/AddToCalendar';
import SocialShare from '../../../components/SocialShare';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { formatDateTime } from '../../../utils/format';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedEvent: event, registrations, loading } = useAppSelector((state) => state.events);

  const [activeTab, setActiveTab] = useState<'info' | 'registrations'>('info');
  const [registrationFilter, setRegistrationFilter] = useState('');

  // Update document meta tags for social sharing
  useDocumentMeta({
    title: event?.event_name,
    description: event?.description || `Join us for ${event?.event_name}`,
    url: `/events/${id}`,
    type: 'event',
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchEventById(id));
      dispatch(fetchEventRegistrations({ eventId: id }));
    }

    return () => {
      dispatch(clearSelectedEvent());
      dispatch(clearRegistrations());
    };
  }, [id, dispatch]);

  // Add weekday to the standard date format for event details
  const formatEventDateTime = (date: string) => {
    const d = new Date(date);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    return `${weekday}, ${formatDateTime(date)}`;
  };

  const handleCheckIn = async (registrationId: string) => {
    if (confirm('Check in this attendee?')) {
      await dispatch(checkInAttendee(registrationId));
      if (id) {
        dispatch(fetchEventRegistrations({ eventId: id }));
      }
    }
  };

  const handleCancelRegistration = async (registrationId: string) => {
    if (confirm('Cancel this registration? This will reduce the event capacity.')) {
      await dispatch(cancelRegistration(registrationId));
      if (id) {
        dispatch(fetchEventRegistrations({ eventId: id }));
      }
    }
  };

  const filteredRegistrations = registrationFilter
    ? registrations.filter((r) => r.registration_status === registrationFilter)
    : registrations;

  if (loading || !event) {
    return (
      <NeoBrutalistLayout pageTitle="EVENTS">
        <div className="p-6 text-center">Loading event details...</div>
      </NeoBrutalistLayout>
    );
  }

  const capacityPercentage = event.capacity
    ? ((event.registered_count || 0) / event.capacity) * 100
    : 0;

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
      <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{event.event_name}</h1>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-app-accent-soft text-app-accent-text">
              {event.event_type}
            </span>
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-app-surface-muted text-app-text">
              {event.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <AddToCalendar event={event} />
          <SocialShare
            data={{
              url: `/events/${event.event_id}`,
              title: event.event_name,
              description: event.description || `Join us for ${event.event_name}`,
            }}
          />
          <button
            onClick={() => navigate(`/events/${id}/edit`)}
            className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover"
          >
            Edit Event
          </button>
          <button
            onClick={() => navigate('/events')}
            className="px-4 py-2 border rounded-md hover:bg-app-surface-muted"
          >
            Back to Events
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'info'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text-muted'
            }`}
          >
            Event Info
          </button>
          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'registrations'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text-muted'
            }`}
          >
            Registrations ({registrations.length})
          </button>
        </nav>
      </div>

      {/* Event Info Tab */}
      {activeTab === 'info' && (
        <div className="bg-app-surface shadow-md rounded-lg p-6 space-y-6">
          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-app-text-muted whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Start Date & Time</h3>
              <p className="text-app-text-muted">{formatEventDateTime(event.start_date)}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">End Date & Time</h3>
              <p className="text-app-text-muted">{formatEventDateTime(event.end_date)}</p>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Location</h3>
            {event.location_name ? (
              <div className="text-app-text-muted">
                <p className="font-medium">{event.location_name}</p>
                {event.address_line1 && <p>{event.address_line1}</p>}
                {event.address_line2 && <p>{event.address_line2}</p>}
                {(event.city || event.state_province || event.postal_code) && (
                  <p>
                    {event.city && `${event.city}, `}
                    {event.state_province && `${event.state_province} `}
                    {event.postal_code}
                  </p>
                )}
                {event.country && <p>{event.country}</p>}
              </div>
            ) : (
              <p className="text-app-text-muted">Location to be determined</p>
            )}
          </div>

          {/* Capacity & Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Capacity</h3>
              {event.capacity ? (
                <div>
                  <p className="text-2xl font-bold">{event.capacity}</p>
                  <div className="mt-2 bg-app-surface-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        capacityPercentage >= 100
                          ? 'bg-red-600'
                          : capacityPercentage >= 80
                            ? 'bg-orange-500'
                            : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-app-text-muted mt-1">
                    {Math.round(capacityPercentage)}% full
                  </p>
                </div>
              ) : (
                <p className="text-app-text-muted">Unlimited</p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Registered</h3>
              <p className="text-2xl font-bold text-app-accent">{event.registered_count || 0}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Attended</h3>
              <p className="text-2xl font-bold text-green-600">{event.attended_count || 0}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-app-text-muted">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(event.created_at).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{' '}
                {new Date(event.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registrations Tab */}
      {activeTab === 'registrations' && (
        <div className="bg-app-surface shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Event Registrations</h3>
            <select
              value={registrationFilter}
              onChange={(e) => setRegistrationFilter(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="registered">Registered</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-8 text-app-text-muted">
              No registrations found for this event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-app-border">
                <thead className="bg-app-surface-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Checked In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Registered At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-app-surface divide-y divide-app-border">
                  {filteredRegistrations.map((registration) => (
                    <tr key={registration.registration_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-app-text">
                          {registration.contact_name}
                        </div>
                        <div className="text-sm text-app-text-muted">{registration.contact_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-app-accent-soft text-app-accent-text">
                          {registration.registration_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {registration.checked_in ? (
                          <div>
                            <span className="text-green-600 font-semibold">✓ Yes</span>
                            {registration.check_in_time && (
                              <div className="text-xs text-app-text-muted">
                                {new Date(registration.check_in_time).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-app-text-subtle">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text-muted">
                        {new Date(registration.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!registration.checked_in && (
                          <button
                            onClick={() => handleCheckIn(registration.registration_id)}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Check In
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelRegistration(registration.registration_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </div>
    </NeoBrutalistLayout>
  );
};

export default EventDetail;
