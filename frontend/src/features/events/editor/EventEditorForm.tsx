import { useEventEditorFormController } from './hooks/useEventEditorFormController';
import { EventEditorFooter } from './components/EventEditorFooter';
import { AutomatedRemindersSection } from './components/sections/AutomatedRemindersSection';
import { CapacitySection } from './components/sections/CapacitySection';
import { DetailsSection } from './components/sections/DetailsSection';
import { LocationSection } from './components/sections/LocationSection';
import { RecurrenceSection } from './components/sections/RecurrenceSection';
import { ScheduleSection } from './components/sections/ScheduleSection';
import { VisibilitySection } from './components/sections/VisibilitySection';
import { formatDurationLabel } from './model/eventEditorFormModel';
import { staffEventsSecondaryActionClassName } from '../components/StaffEventsPageShell';
import type { CreateEventDTO, Event, UpdateEventDTO } from '../../../types/event';

export interface EventEditorFormProps {
  event?: Event | null;
  onSubmit: (eventData: CreateEventDTO | UpdateEventDTO) => Promise<Event | void>;
  isEdit?: boolean;
}

export default function EventEditorForm({ event, onSubmit, isEdit = false }: EventEditorFormProps) {
  const {
    loading,
    error,
    formData,
    automationRows,
    automationRowsLoading,
    reminderSyncError,
    savedEventIdForRetry,
    retryingReminderSync,
    durationMinutes,
    timeValidationMessage,
    scheduleHelperText,
    isEndDateAutoManaged,
    organizationTimezone,
    handleInputChange,
    updateReminderRow,
    addReminderRow,
    removeReminderRow,
    handleCancel,
    handleSubmit,
    handleRetryReminderSync,
  } = useEventEditorFormController({ event, onSubmit, isEdit });

  const durationLabel =
    durationMinutes && durationMinutes > 0 ? formatDurationLabel(durationMinutes) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div
          className="rounded-xl border border-app-border bg-app-accent-soft p-4 text-sm text-app-accent-text"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {reminderSyncError ? (
        <div
          className="rounded-xl border border-app-border bg-app-accent-soft p-4 text-sm text-app-accent-text"
          role="alert"
        >
          <p>{reminderSyncError}</p>
          {savedEventIdForRetry ? (
            <button
              type="button"
              onClick={handleRetryReminderSync}
              disabled={retryingReminderSync}
              className={`${staffEventsSecondaryActionClassName} mt-3`}
            >
              {retryingReminderSync ? 'Retrying...' : 'Retry reminder sync'}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <ScheduleSection
            durationLabel={durationLabel}
            formData={{ start_date: formData.start_date, end_date: formData.end_date }}
            isEndDateAutoManaged={isEndDateAutoManaged}
            scheduleHelperText={scheduleHelperText}
            timeValidationMessage={timeValidationMessage}
            onInputChange={handleInputChange}
          />

          <DetailsSection
            formData={{
              event_name: formData.event_name,
              description: formData.description,
              event_type: formData.event_type,
              status: formData.status,
            }}
            onInputChange={handleInputChange}
          />

          <LocationSection
            formData={{
              location_name: formData.location_name,
              address_line1: formData.address_line1,
              address_line2: formData.address_line2,
              city: formData.city,
              state_province: formData.state_province,
              postal_code: formData.postal_code,
              country: formData.country,
            }}
            onInputChange={handleInputChange}
          />
        </div>

        <div className="space-y-6">
          <RecurrenceSection
            formData={{
              is_recurring: formData.is_recurring,
              recurrence_pattern: formData.recurrence_pattern,
              recurrence_interval: formData.recurrence_interval,
              recurrence_end_date: formData.recurrence_end_date,
            }}
            onInputChange={handleInputChange}
          />

          <VisibilitySection
            formData={{ is_public: formData.is_public }}
            onInputChange={handleInputChange}
          />

          <AutomatedRemindersSection
            automationRows={automationRows}
            automationRowsLoading={automationRowsLoading}
            organizationTimezone={organizationTimezone}
            startDateLocalValue={formData.start_date}
            onAddReminderRow={addReminderRow}
            onRemoveReminderRow={removeReminderRow}
            onUpdateReminderRow={updateReminderRow}
          />

          <CapacitySection
            formData={{ capacity: formData.capacity }}
            onInputChange={handleInputChange}
          />
        </div>
      </div>

      <EventEditorFooter
        isEdit={isEdit}
        loading={loading}
        retryingReminderSync={retryingReminderSync}
        onCancel={handleCancel}
      />
    </form>
  );
}
