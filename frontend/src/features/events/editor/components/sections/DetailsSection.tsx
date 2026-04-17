import type { ChangeEventHandler } from 'react';
import { EditorSection } from './EditorSection';
import type { EventEditorFormData } from '../../model';
import { eventEditorSelectOptions } from '../../model';
import { inputClassName, textareaClassName } from '../../styles';

interface DetailsSectionProps {
  formData: Pick<EventEditorFormData, 'event_name' | 'description' | 'event_type' | 'status'>;
  onInputChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
}

export function DetailsSection({ formData, onInputChange }: DetailsSectionProps) {
  return (
    <EditorSection
      title="Details"
      description="Capture the title, audience-facing description, and staff status for this event."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-app-text">
            Event name <span className="text-app-accent">*</span>
          </span>
          <input
            type="text"
            id="event_name"
            name="event_name"
            value={formData.event_name}
            onChange={onInputChange}
            required
            className={inputClassName}
            placeholder="Annual fundraising gala"
          />
        </label>

        <label className="text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-app-text">Description</span>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={onInputChange}
            rows={5}
            className={textareaClassName}
            placeholder="Share the event goals, format, and anything staff or attendees should know."
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-app-text">
            Event type <span className="text-app-accent">*</span>
          </span>
          <select
            id="event_type"
            name="event_type"
            value={formData.event_type}
            onChange={onInputChange}
            required
            className={inputClassName}
          >
            {eventEditorSelectOptions.eventTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-app-text">
            Status <span className="text-app-accent">*</span>
          </span>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={onInputChange}
            required
            className={inputClassName}
          >
            {eventEditorSelectOptions.eventStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </EditorSection>
  );
}
