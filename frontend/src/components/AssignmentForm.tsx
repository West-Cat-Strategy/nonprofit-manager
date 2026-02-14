import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { createAssignment, updateAssignment } from '../store/slices/volunteersSlice';
import type { VolunteerAssignment } from '../store/slices/volunteersSlice';

interface Assignment {
  assignment_id?: string;
  volunteer_id: string;
  event_id?: string | null;
  task_id?: string | null;
  assignment_type: 'event' | 'task' | 'general';
  role?: string | null;
  start_time: string;
  end_time?: string | null;
  hours_logged?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string | null;
}

interface AssignmentFormProps {
  assignment?: Assignment;
  volunteerId: string; // The volunteer this assignment is for
  mode: 'create' | 'edit';
}

export const AssignmentForm: React.FC<AssignmentFormProps> = ({
  assignment,
  volunteerId,
  mode,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState<Assignment>({
    volunteer_id: volunteerId,
    event_id: '',
    task_id: '',
    assignment_type: 'general',
    role: '',
    start_time: '',
    end_time: '',
    hours_logged: 0,
    status: 'scheduled',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (assignment && mode === 'edit') {
      setFormData({
        ...assignment,
        start_time: assignment.start_time
          ? new Date(assignment.start_time).toISOString().slice(0, 16)
          : '',
        end_time: assignment.end_time
          ? new Date(assignment.end_time).toISOString().slice(0, 16)
          : '',
      });
    }
  }, [assignment, mode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }

    if (formData.assignment_type === 'event' && !formData.event_id) {
      newErrors.event_id = 'Event is required when assignment type is "event"';
    }

    if (formData.assignment_type === 'task' && !formData.task_id) {
      newErrors.task_id = 'Task is required when assignment type is "task"';
    }

    if (formData.end_time && formData.start_time) {
      const startDate = new Date(formData.start_time);
      const endDate = new Date(formData.end_time);
      if (endDate < startDate) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean up the data
      const cleanedData: Partial<VolunteerAssignment> = {
        volunteer_id: formData.volunteer_id,
        assignment_type: formData.assignment_type,
        start_time: new Date(formData.start_time).toISOString(),
        event_id: formData.event_id || undefined,
        task_id: formData.task_id || undefined,
        role: formData.role || undefined,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : undefined,
        notes: formData.notes || undefined,
      };

      if (mode === 'edit') {
        cleanedData.hours_logged = formData.hours_logged ?? 0;
        cleanedData.status = formData.status || 'scheduled';
      }

      if (mode === 'create') {
        await dispatch(createAssignment(cleanedData)).unwrap();
      } else if (mode === 'edit' && assignment?.assignment_id) {
        await dispatch(
          updateAssignment({
            assignmentId: assignment.assignment_id,
            data: cleanedData,
          })
        ).unwrap();
      }

      // Navigate back to volunteer detail page
      navigate(`/volunteers/${volunteerId}`);
    } catch (error) {
      console.error('Failed to save assignment:', error);
      setErrors({ submit: 'Failed to save assignment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/volunteers/${volunteerId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* Assignment Type and References */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Assignment Details</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="assignment_type" className="block text-sm font-medium text-app-text-label">
              Assignment Type *
            </label>
            <select
              name="assignment_type"
              id="assignment_type"
              value={formData.assignment_type}
              onChange={handleChange}
              disabled={mode === 'edit'}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm disabled:bg-app-surface-muted"
            >
              <option value="general">General</option>
              <option value="event">Event</option>
              <option value="task">Task</option>
            </select>
            <p className="mt-1 text-sm text-app-text-muted">
              {formData.assignment_type === 'event' &&
                'Volunteer will be assigned to a specific event'}
              {formData.assignment_type === 'task' &&
                'Volunteer will be assigned to a specific task'}
              {formData.assignment_type === 'general' &&
                'General volunteer assignment not tied to an event or task'}
            </p>
          </div>

          {formData.assignment_type === 'event' && (
            <div className="sm:col-span-2">
              <label htmlFor="event_id" className="block text-sm font-medium text-app-text-label">
                Event *
              </label>
              <input
                type="text"
                name="event_id"
                id="event_id"
                value={formData.event_id ?? ''}
                onChange={handleChange}
                placeholder="Event ID (e.g., from events list)"
                className={`mt-1 block w-full border ${
                  errors.event_id ? 'border-red-300' : 'border-app-input-border'
                } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
              />
              {errors.event_id && <p className="mt-1 text-sm text-red-600">{errors.event_id}</p>}
              <p className="mt-1 text-sm text-app-text-muted">
                Enter the event UUID. Event management will be available in Step 2.3.
              </p>
            </div>
          )}

          {formData.assignment_type === 'task' && (
            <div className="sm:col-span-2">
              <label htmlFor="task_id" className="block text-sm font-medium text-app-text-label">
                Task *
              </label>
              <input
                type="text"
                name="task_id"
                id="task_id"
                value={formData.task_id ?? ''}
                onChange={handleChange}
                placeholder="Task ID (e.g., from tasks list)"
                className={`mt-1 block w-full border ${
                  errors.task_id ? 'border-red-300' : 'border-app-input-border'
                } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
              />
              {errors.task_id && <p className="mt-1 text-sm text-red-600">{errors.task_id}</p>}
              <p className="mt-1 text-sm text-app-text-muted">
                Enter the task UUID. Task management will be available in Step 2.5.
              </p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label htmlFor="role" className="block text-sm font-medium text-app-text-label">
              Role
            </label>
            <input
              type="text"
              name="role"
              id="role"
              value={formData.role ?? ''}
              onChange={handleChange}
              placeholder="e.g., Team Leader, Registration Assistant, Setup Crew"
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Schedule</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-app-text-label">
              Start Time *
            </label>
            <input
              type="datetime-local"
              name="start_time"
              id="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.start_time ? 'border-red-300' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            />
            {errors.start_time && <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>}
          </div>

          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-app-text-label">
              End Time
            </label>
            <input
              type="datetime-local"
              name="end_time"
              id="end_time"
              value={formData.end_time ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.end_time ? 'border-red-300' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            />
            {errors.end_time && <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>}
          </div>
        </div>
      </div>

      {/* Status and Hours (Edit Mode Only) */}
      {mode === 'edit' && (
        <div className="bg-app-surface shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-app-text-heading mb-4">Status and Hours</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-app-text-label">
                Status
              </label>
              <select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label htmlFor="hours_logged" className="block text-sm font-medium text-app-text-label">
                Hours Logged
              </label>
              <input
                type="number"
                name="hours_logged"
                id="hours_logged"
                min="0"
                step="0.5"
                value={formData.hours_logged || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Notes</h2>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-app-text-label">
            Additional Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={4}
            value={formData.notes ?? ''}
            onChange={handleChange}
            placeholder="Any additional information about this assignment..."
            className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-app-surface py-2 px-4 border border-app-border rounded-md shadow-sm text-sm font-medium text-app-text-label hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-app-accent py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent disabled:bg-app-text-subtle disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Assignment'
              : 'Update Assignment'}
        </button>
      </div>
    </form>
  );
};
