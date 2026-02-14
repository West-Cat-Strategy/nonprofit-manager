/**
 * Follow-up Form Component
 * Form for creating and editing scheduleable follow-ups
 */

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createFollowUp, updateFollowUp } from '../store/slices/followUpsSlice';
import { useToast } from '../contexts/useToast';
import type {
  FollowUp,
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  FollowUpEntityType,
  FollowUpFrequency,
  FollowUpMethod,
} from '../types/followup';
import { FREQUENCY_OPTIONS, METHOD_OPTIONS, REMINDER_OPTIONS } from '../types/followup';

interface FollowUpFormProps {
  entityType: FollowUpEntityType;
  entityId: string;
  existingFollowUp?: FollowUp | null;
  onSuccess?: (followUp: FollowUp) => void;
  onCancel?: () => void;
}

export default function FollowUpForm({
  entityType,
  entityId,
  existingFollowUp,
  onSuccess,
  onCancel,
}: FollowUpFormProps) {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.followUps);
  const { showSuccess, showError } = useToast();

  // Form state
  const [title, setTitle] = useState(existingFollowUp?.title || '');
  const [description, setDescription] = useState(existingFollowUp?.description || '');
  const [scheduledDate, setScheduledDate] = useState(
    existingFollowUp?.scheduled_date || new Date().toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState(existingFollowUp?.scheduled_time || '');
  const [frequency, setFrequency] = useState<FollowUpFrequency>(existingFollowUp?.frequency || 'once');
  const [frequencyEndDate, setFrequencyEndDate] = useState(existingFollowUp?.frequency_end_date || '');
  const [method, setMethod] = useState<FollowUpMethod | ''>(existingFollowUp?.method || '');
  const [assignedTo, setAssignedTo] = useState(existingFollowUp?.assigned_to || '');
  const [reminderMinutes, setReminderMinutes] = useState<number | ''>(
    existingFollowUp?.reminder_minutes_before ?? ''
  );

  const isEditing = !!existingFollowUp;

  // Reset form when existingFollowUp changes
  useEffect(() => {
    if (existingFollowUp) {
      setTitle(existingFollowUp.title);
      setDescription(existingFollowUp.description || '');
      setScheduledDate(existingFollowUp.scheduled_date);
      setScheduledTime(existingFollowUp.scheduled_time || '');
      setFrequency(existingFollowUp.frequency);
      setFrequencyEndDate(existingFollowUp.frequency_end_date || '');
      setMethod(existingFollowUp.method || '');
      setAssignedTo(existingFollowUp.assigned_to || '');
      setReminderMinutes(existingFollowUp.reminder_minutes_before ?? '');
    }
  }, [existingFollowUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showError('Please enter a title for the follow-up');
      return;
    }

    if (!scheduledDate) {
      showError('Please select a scheduled date');
      return;
    }

    try {
      if (isEditing && existingFollowUp) {
        const updateData: UpdateFollowUpDTO = {
          title: title.trim(),
          description: description.trim() || null,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          frequency,
          frequency_end_date: frequency !== 'once' ? frequencyEndDate || null : null,
          method: method || null,
          assigned_to: assignedTo || null,
          reminder_minutes_before: reminderMinutes !== '' ? Number(reminderMinutes) : null,
        };

        const result = await dispatch(
          updateFollowUp({ followUpId: existingFollowUp.id, data: updateData })
        ).unwrap();
        showSuccess('Follow-up updated successfully');
        onSuccess?.(result);
      } else {
        const createData: CreateFollowUpDTO = {
          entity_type: entityType,
          entity_id: entityId,
          title: title.trim(),
          description: description.trim() || undefined,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || undefined,
          frequency,
          frequency_end_date: frequency !== 'once' ? frequencyEndDate || undefined : undefined,
          method: method || undefined,
          assigned_to: assignedTo || undefined,
          reminder_minutes_before: reminderMinutes !== '' ? Number(reminderMinutes) : undefined,
        };

        const result = await dispatch(createFollowUp(createData)).unwrap();
        showSuccess('Follow-up scheduled successfully');
        onSuccess?.(result);
      }
    } catch {
      showError(isEditing ? 'Failed to update follow-up' : 'Failed to schedule follow-up');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="followup-title" className="block text-sm font-semibold text-app-text-label mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="followup-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Check-in call, Status update"
          className="w-full px-3 py-2 border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:border-app-accent"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="followup-description" className="block text-sm font-semibold text-app-text-label mb-1">
          Description
        </label>
        <textarea
          id="followup-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional notes or context for this follow-up..."
          rows={3}
          className="w-full px-3 py-2 border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:border-app-accent"
        />
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="followup-date" className="block text-sm font-semibold text-app-text-label mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="followup-date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:border-app-accent"
            required
          />
        </div>
        <div>
          <label htmlFor="followup-time" className="block text-sm font-semibold text-app-text-label mb-1">
            Time
          </label>
          <input
            id="followup-time"
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full px-3 py-2 border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:border-app-accent"
          />
        </div>
      </div>

      {/* Method */}
      <div>
        <label htmlFor="followup-method" className="block text-sm font-semibold text-app-text-label mb-1">
          Method
        </label>
        <select
          id="followup-method"
          value={method}
          onChange={(e) => setMethod(e.target.value as FollowUpMethod | '')}
          className="w-full px-3 py-2 border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:border-app-accent"
        >
          <option value="">Select method...</option>
          {METHOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Frequency */}
      <div>
        <label htmlFor="followup-frequency" className="block text-sm font-semibold text-app-text-label mb-1">
          Repeat
        </label>
        <select
          id="followup-frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as FollowUpFrequency)}
          className="w-full px-3 py-2 border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:border-app-accent"
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Frequency End Date (only shown if recurring) */}
      {frequency !== 'once' && (
        <div>
          <label htmlFor="followup-end-date" className="block text-sm font-semibold text-app-text-label mb-1">
            Repeat Until
          </label>
          <input
            id="followup-end-date"
            type="date"
            value={frequencyEndDate}
            onChange={(e) => setFrequencyEndDate(e.target.value)}
            min={scheduledDate}
            className="w-full px-3 py-2 border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:border-app-accent"
          />
          <p className="text-xs text-app-text-muted mt-1">Leave empty for indefinite recurrence</p>
        </div>
      )}

      {/* Reminder */}
      <div>
        <label htmlFor="followup-reminder" className="block text-sm font-semibold text-app-text-label mb-1">
          Reminder
        </label>
        <select
          id="followup-reminder"
          value={reminderMinutes}
          onChange={(e) => setReminderMinutes(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full px-3 py-2 border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:border-app-accent"
        >
          <option value="">No reminder</option>
          {REMINDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Assigned To - could be enhanced with user picker */}
      <div>
        <label htmlFor="followup-assigned" className="block text-sm font-semibold text-app-text-label mb-1">
          Assigned To
        </label>
        <input
          id="followup-assigned"
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="User ID or name"
          className="w-full px-3 py-2 border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:border-app-accent"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-app-accent text-white font-semibold rounded-lg hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Follow-up' : 'Schedule Follow-up'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border-2 border-app-input-border text-app-text-label font-semibold rounded-lg hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
