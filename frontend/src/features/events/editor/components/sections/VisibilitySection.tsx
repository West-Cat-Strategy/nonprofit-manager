import type { ChangeEventHandler } from 'react';
import { EditorSection } from './EditorSection';
import type { EventEditorFormData } from '../../model';
import { checkboxClassName } from '../../styles';

interface VisibilitySectionProps {
  formData: Pick<EventEditorFormData, 'is_public'>;
  onInputChange: ChangeEventHandler<HTMLInputElement>;
}

export function VisibilitySection({ formData, onInputChange }: VisibilitySectionProps) {
  return (
    <EditorSection
      title="Visibility"
      description="Decide whether this event is staff-only or appears in public event and registration flows."
    >
      <label className="flex items-start gap-3 rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
        <input
          type="checkbox"
          id="is_public"
          name="is_public"
          checked={formData.is_public}
          onChange={onInputChange}
          className={checkboxClassName}
        />
        <span>
          <span className="block font-medium text-app-text">Public event</span>
          <span className="mt-1 block text-sm text-app-text-muted">
            Makes the event available for public sharing, sign-up, and portal or website workflows.
          </span>
        </span>
      </label>
    </EditorSection>
  );
}
