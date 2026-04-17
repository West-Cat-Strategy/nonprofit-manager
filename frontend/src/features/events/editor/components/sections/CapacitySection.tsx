import type { ChangeEventHandler } from 'react';
import { EditorSection } from './EditorSection';
import type { EventEditorFormData } from '../../model';
import { inputClassName } from '../../styles';

interface CapacitySectionProps {
  formData: Pick<EventEditorFormData, 'capacity'>;
  onInputChange: ChangeEventHandler<HTMLInputElement>;
}

export function CapacitySection({ formData, onInputChange }: CapacitySectionProps) {
  return (
    <EditorSection
      title="Capacity"
      description="Leave this blank if the event should accept unlimited registrations."
    >
      <label className="text-sm">
        <span className="mb-1 block font-medium text-app-text">Maximum capacity</span>
        <input
          type="number"
          id="capacity"
          name="capacity"
          value={formData.capacity ?? ''}
          onChange={onInputChange}
          min="1"
          className={inputClassName}
          placeholder="100"
        />
      </label>
    </EditorSection>
  );
}
