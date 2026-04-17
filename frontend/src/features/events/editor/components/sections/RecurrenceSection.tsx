import type { ChangeEventHandler } from 'react';
import { EditorSection } from './EditorSection';
import { eventEditorSelectOptions, type EventEditorFormData } from '../../model';
import { inputClassName, checkboxClassName } from '../../styles';

interface RecurrenceSectionProps {
  formData: Pick<EventEditorFormData, 'is_recurring' | 'recurrence_pattern' | 'recurrence_interval' | 'recurrence_end_date'>;
  onInputChange: ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
}

export function RecurrenceSection({ formData, onInputChange }: RecurrenceSectionProps) {
  return (
    <EditorSection
      title="Recurrence"
      description="Turn on recurrence when this event represents a series rather than a single date."
    >
      <label className="flex items-start gap-3 rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
        <input
          type="checkbox"
          id="is_recurring"
          name="is_recurring"
          checked={formData.is_recurring}
          onChange={onInputChange}
          className={checkboxClassName}
        />
        <span>
          <span className="block font-medium text-app-text">Recurring series</span>
          <span className="mt-1 block text-sm text-app-text-muted">
            Use one event record to manage repeated occurrences and future schedule changes.
          </span>
        </span>
      </label>

      {formData.is_recurring ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-app-text">Pattern</span>
              <select
                id="recurrence_pattern"
                name="recurrence_pattern"
                value={formData.recurrence_pattern}
                onChange={onInputChange}
                className={inputClassName}
              >
                {eventEditorSelectOptions.recurrencePatterns.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-app-text">Repeat every</span>
              <input
                type="number"
                id="recurrence_interval"
                name="recurrence_interval"
                value={formData.recurrence_interval ?? 1}
                onChange={onInputChange}
                min="1"
                className={inputClassName}
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-app-text">Ends on</span>
            <input
              type="datetime-local"
              id="recurrence_end_date"
              name="recurrence_end_date"
              value={formData.recurrence_end_date}
              onChange={onInputChange}
              className={inputClassName}
            />
          </label>
        </div>
      ) : (
        <p className="mt-4 text-sm text-app-text-muted">
          This event will stay on a single date until recurrence is enabled.
        </p>
      )}
    </EditorSection>
  );
}
