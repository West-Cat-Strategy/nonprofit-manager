import type { ReminderRelativeUnit, ReminderRowFormState } from '../../model';
import { MAX_CUSTOM_MESSAGE_LENGTH } from '../../model';
import { EditorSection } from './EditorSection';
import { checkboxClassName, inputClassName, textareaClassName } from '../../styles';
import { staffEventsSecondaryActionClassName } from '../../../components/StaffEventsPageShell';

interface AutomatedRemindersSectionProps {
  automationRows: ReminderRowFormState[];
  automationRowsLoading: boolean;
  organizationTimezone: string;
  startDateLocalValue: string;
  onAddReminderRow: () => void;
  onRemoveReminderRow: (rowId: string) => void;
  onUpdateReminderRow: (rowId: string, updates: Partial<ReminderRowFormState>) => void;
}

export function AutomatedRemindersSection({
  automationRows,
  automationRowsLoading,
  organizationTimezone,
  startDateLocalValue,
  onAddReminderRow,
  onRemoveReminderRow,
  onUpdateReminderRow,
}: AutomatedRemindersSectionProps) {
  return (
    <EditorSection
      title="Automated reminders"
      description={
        <>
          Schedule reminder attempts ahead of the event. Exact reminders use the organization timezone:{' '}
          <span className="font-medium">{organizationTimezone}</span>.
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onAddReminderRow} className={staffEventsSecondaryActionClassName}>
          Add reminder
        </button>
      </div>

      {automationRowsLoading ? (
        <p className="mt-4 text-sm text-app-text-muted">Loading scheduled reminders...</p>
      ) : automationRows.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-app-border bg-app-surface-muted/50 p-4 text-sm text-app-text-muted">
          No automated reminders configured yet. You can still send manual reminders from event detail.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {automationRows.map((row, index) => (
            <div key={row.id} className="rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-app-text">Reminder {index + 1}</h3>
                  <p className="mt-1 text-xs text-app-text-muted">
                    Configure when it sends and which channels it should use.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveReminderRow(row.id)}
                  className="text-sm font-medium text-app-text-muted transition-colors hover:text-app-text"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-app-text">Timing mode</span>
                  <select
                    value={row.timingType}
                    onChange={(changeEvent) => {
                      const timingType = changeEvent.target.value as 'relative' | 'absolute';
                      onUpdateReminderRow(row.id, {
                        timingType,
                        absoluteLocalDateTime:
                          timingType === 'absolute' && !row.absoluteLocalDateTime
                            ? startDateLocalValue || ''
                            : row.absoluteLocalDateTime,
                      });
                    }}
                    className={inputClassName}
                  >
                    <option value="relative">Before event start</option>
                    <option value="absolute">Exact date and time</option>
                  </select>
                </label>

                {row.timingType === 'relative' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-app-text">Quantity</span>
                      <input
                        type="number"
                        id={`reminder-relative-value-${row.id}`}
                        value={row.relativeValue}
                        min="1"
                        onChange={(changeEvent) =>
                          onUpdateReminderRow(row.id, {
                            relativeValue:
                              changeEvent.target.value === ''
                                ? 0
                                : Number.parseInt(changeEvent.target.value, 10),
                          })
                        }
                        className={inputClassName}
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-app-text">Unit</span>
                      <select
                        id={`reminder-relative-unit-${row.id}`}
                        value={row.relativeUnit}
                        onChange={(changeEvent) =>
                          onUpdateReminderRow(row.id, {
                            relativeUnit: changeEvent.target.value as ReminderRelativeUnit,
                          })
                        }
                        className={inputClassName}
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </label>
                  </div>
                ) : (
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-app-text">Send at</span>
                    <input
                      type="datetime-local"
                      id={`reminder-absolute-send-at-${row.id}`}
                      value={row.absoluteLocalDateTime}
                      onChange={(changeEvent) =>
                        onUpdateReminderRow(row.id, {
                          absoluteLocalDateTime: changeEvent.target.value,
                        })
                      }
                      className={inputClassName}
                    />
                    <p className="mt-1 text-xs text-app-text-muted">Interpreted in {row.timezone}</p>
                  </label>
                )}

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-app-text">
                    <input
                      type="checkbox"
                      checked={row.sendEmail}
                      onChange={(changeEvent) =>
                        onUpdateReminderRow(row.id, { sendEmail: changeEvent.target.checked })
                      }
                      className={checkboxClassName}
                    />
                    <span>Email</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-app-text">
                    <input
                      type="checkbox"
                      checked={row.sendSms}
                      onChange={(changeEvent) =>
                        onUpdateReminderRow(row.id, { sendSms: changeEvent.target.checked })
                      }
                      className={checkboxClassName}
                    />
                    <span>SMS</span>
                  </label>
                </div>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-app-text">Custom message</span>
                  <textarea
                    value={row.customMessage}
                    onChange={(changeEvent) =>
                      onUpdateReminderRow(row.id, { customMessage: changeEvent.target.value })
                    }
                    rows={3}
                    maxLength={MAX_CUSTOM_MESSAGE_LENGTH}
                    className={textareaClassName}
                    placeholder="Add event-specific context for attendees."
                  />
                  <p className="mt-1 text-xs text-app-text-muted">
                    {row.customMessage.length}/{MAX_CUSTOM_MESSAGE_LENGTH}
                  </p>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </EditorSection>
  );
}
