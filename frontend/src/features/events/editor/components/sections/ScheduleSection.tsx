import type { ChangeEventHandler } from 'react';
import { staffEventsMetadataBadgeClassName } from '../../../components/StaffEventsPageShell';
import type { EventEditorFormData } from '../../model';
import { EditorSection } from './EditorSection';
import { inputClassName } from '../../styles';

interface ScheduleSectionProps {
  durationLabel: string | null;
  formData: Pick<EventEditorFormData, 'start_date' | 'end_date'>;
  isEndDateAutoManaged: boolean;
  scheduleHelperText: string;
  timeValidationMessage: string | null;
  onInputChange: ChangeEventHandler<HTMLInputElement>;
}

export function ScheduleSection({
  durationLabel,
  formData,
  isEndDateAutoManaged,
  scheduleHelperText,
  timeValidationMessage,
  onInputChange,
}: ScheduleSectionProps) {
  return (
    <EditorSection
      title="Schedule"
      description="Start with timing. New events keep a 2-hour end-time default until you choose a custom end."
      badge={
        durationLabel ? <span className={staffEventsMetadataBadgeClassName}>Duration {durationLabel}</span> : null
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-app-text">
            Start date and time <span className="text-app-accent">*</span>
          </span>
          <input
            type="datetime-local"
            id="start_date"
            name="start_date"
            value={formData.start_date}
            onChange={onInputChange}
            required
            className={inputClassName}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 flex items-center gap-2 font-medium text-app-text">
            <span>
              End date and time <span className="text-app-accent">*</span>
            </span>
            {isEndDateAutoManaged ? <span className={staffEventsMetadataBadgeClassName}>Auto</span> : null}
          </span>
          <input
            type="datetime-local"
            id="end_date"
            name="end_date"
            value={formData.end_date}
            onChange={onInputChange}
            required
            className={inputClassName}
          />
        </label>
      </div>

      <div className="mt-3 space-y-2" aria-live="polite">
        <p className="text-sm text-app-text-muted">{scheduleHelperText}</p>
        {timeValidationMessage ? (
          <p className="text-sm font-medium text-app-accent-text">{timeValidationMessage}</p>
        ) : null}
      </div>
    </EditorSection>
  );
}
