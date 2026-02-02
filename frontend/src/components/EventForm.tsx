/**
 * EventForm Component
 * Reusable form for creating and editing events
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Event, CreateEventDTO, UpdateEventDTO } from '../types/event';

interface EventFormProps {
  event?: Event | null;
  onSubmit: (eventData: CreateEventDTO | UpdateEventDTO) => Promise<void>;
  isEdit?: boolean;
}

const EventForm: React.FC<EventFormProps> = ({ event, onSubmit, isEdit = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateEventDTO | UpdateEventDTO>({
    event_name: '',
    description: '',
    event_type: 'other' as const,
    status: 'planned' as const,
    start_date: '',
    end_date: '',
    location_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'USA',
    capacity: undefined,
  });

  useEffect(() => {
    if (event) {
      setFormData({
        event_name: event.event_name,
        description: event.description || '',
        event_type: event.event_type,
        status: event.status,
        start_date: event.start_date.substring(0, 16),
        end_date: event.end_date.substring(0, 16),
        location_name: event.location_name || '',
        address_line1: event.address_line1 || '',
        address_line2: event.address_line2 || '',
        city: event.city || '',
        state_province: event.state_province || '',
        postal_code: event.postal_code || '',
        country: event.country || 'USA',
        capacity: event.capacity || undefined,
      });
    }
  }, [event]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? (name === 'capacity' ? undefined : '') : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate dates
      if (new Date(formData.start_date!) >= new Date(formData.end_date!)) {
        throw new Error('End date must be after start date');
      }

      await onSubmit(formData);
      navigate('/events');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-md rounded-lg p-6">
      {error && <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="event_name" className="block text-sm font-medium mb-1">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Annual Fundraising Gala"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Event description..."
            />
          </div>

          <div>
            <label htmlFor="event_type" className="block text-sm font-medium mb-1">
              Event Type <span className="text-red-500">*</span>
            </label>
            <select
              id="event_type"
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
            >
              <option value="fundraiser">Fundraiser</option>
              <option value="community">Community</option>
              <option value="training">Training</option>
              <option value="meeting">Meeting</option>
              <option value="volunteer">Volunteer</option>
              <option value="social">Social</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Date & Time</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium mb-1">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium mb-1">
              End Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="location_name" className="block text-sm font-medium mb-1">Location Name</label>
            <input
              type="text"
              id="location_name"
              name="location_name"
              value={formData.location_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Community Center"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address_line1" className="block text-sm font-medium mb-1">Address Line 1</label>
            <input
              type="text"
              id="address_line1"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="123 Main Street"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address_line2" className="block text-sm font-medium mb-1">Address Line 2</label>
            <input
              type="text"
              id="address_line2"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Suite 100"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-1">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Springfield"
            />
          </div>

          <div>
            <label htmlFor="state_province" className="block text-sm font-medium mb-1">State/Province</label>
            <input
              type="text"
              id="state_province"
              name="state_province"
              value={formData.state_province}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="IL"
            />
          </div>

          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium mb-1">Postal Code</label>
            <input
              type="text"
              id="postal_code"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="62701"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-1">Country</label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
              placeholder="USA"
            />
          </div>
        </div>
      </div>

      {/* Capacity */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Capacity</h3>
        <div className="max-w-md">
          <label htmlFor="capacity" className="block text-sm font-medium mb-1">
            Maximum Capacity
            <span className="text-gray-500 font-normal ml-2">(Leave blank for unlimited)</span>
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            value={formData.capacity || ''}
            onChange={handleChange}
            min="1"
            className="w-full px-4 py-2 border rounded-md"
            placeholder="100"
          />
          <p className="text-sm text-gray-500 mt-1">
            Set the maximum number of attendees allowed to register for this event.
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="px-6 py-2 border rounded-md hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  );
};

export default EventForm;
