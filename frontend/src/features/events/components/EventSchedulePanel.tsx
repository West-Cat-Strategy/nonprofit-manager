import type { Event, EventBatchScope, EventOccurrence } from '../../../types/event';
import { formatDateTime } from '../../../utils/format';
import {
  buildEventOccurrences,
  getEventBatchScopeHint,
  getEventBatchScopeLabel,
  getEventOccurrenceLabel,
  getOccurrenceDateRange,
} from '../utils/occurrences';

interface EventSchedulePanelProps {
  event: Event;
  occurrences?: EventOccurrence[];
  selectedOccurrenceId: string | null;
  batchScope: EventBatchScope;
  supportsBatchScope?: boolean;
  onSelectOccurrence: (occurrenceId: string) => void;
  onChangeBatchScope: (scope: EventBatchScope) => void;
  onOpenCalendar?: () => void;
  onOpenSeriesEditor?: () => void;
}

const scopeOptions: Array<{ value: EventBatchScope; label: string }> = [
  { value: 'occurrence', label: 'This occurrence' },
  { value: 'future_occurrences', label: 'This and future' },
  { value: 'series', label: 'Whole series' },
];

const getStatusCopy = (occurrence: EventOccurrence): string => {
  if (occurrence.is_cancelled || occurrence.status === 'cancelled') {
    return 'Cancelled';
  }
  if (occurrence.status === 'postponed') {
    return 'Postponed';
  }
  if (occurrence.status === 'completed') {
    return 'Completed';
  }
  if (occurrence.status === 'active') {
    return 'Active';
  }
  return 'Planned';
};

export default function EventSchedulePanel({
  event,
  occurrences,
  selectedOccurrenceId,
  batchScope,
  supportsBatchScope = true,
  onSelectOccurrence,
  onChangeBatchScope,
  onOpenCalendar,
  onOpenSeriesEditor,
}: EventSchedulePanelProps) {
  const schedule = occurrences ?? buildEventOccurrences(event);
  const selectedOccurrence =
    schedule.find((occurrence) => occurrence.occurrence_id === selectedOccurrenceId) ?? schedule[0] ?? null;

  return (
    <div className="space-y-6 rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
      <div className="flex flex-col gap-3 rounded-xl border border-app-border bg-app-surface-muted p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-app-text">Schedule</h3>
          <p className="mt-1 text-sm text-app-text-muted">
            {supportsBatchScope
              ? 'Plan series dates, choose the working scope, and inspect each occurrence before making a batch change.'
              : 'Review the event timing, inspect the active date, and confirm that changes apply to this occurrence only.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenCalendar}
            className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface-muted"
          >
            Open Calendar
          </button>
          <button
            type="button"
            onClick={onOpenSeriesEditor}
            className="rounded-md bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
          >
            {supportsBatchScope ? 'Edit Series Defaults' : 'Edit Event Details'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-app-border bg-app-surface-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">Batch scope</p>
                <p className="mt-1 text-sm text-app-text-muted">
                  {getEventBatchScopeHint(batchScope)}
                </p>
              </div>
              <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-semibold text-app-accent-text">
                {getEventBatchScopeLabel(batchScope)}
              </span>
            </div>

            <div className={`mt-4 grid gap-2 ${supportsBatchScope ? 'md:grid-cols-3' : ''}`}>
              {(supportsBatchScope ? scopeOptions : scopeOptions.filter((option) => option.value === 'occurrence')).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeBatchScope(option.value)}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    batchScope === option.value
                      ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                      : 'border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted'
                  }`}
                >
                  <span className="block font-medium">{option.label}</span>
                  <span className="mt-1 block text-xs text-app-text-muted">
                    {getEventBatchScopeHint(option.value)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface">
            <div className="border-b border-app-border px-4 py-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                Occurrences
              </h4>
              <p className="mt-1 text-sm text-app-text-muted">
                {supportsBatchScope
                  ? `${schedule.length} planned occurrence${schedule.length === 1 ? '' : 's'} for this series.`
                  : `${schedule.length} scheduled date${schedule.length === 1 ? '' : 's'} for this event.`}
              </p>
            </div>
            <div className="divide-y divide-app-border">
              {schedule.map((occurrence) => {
                const isSelected = occurrence.occurrence_id === selectedOccurrence?.occurrence_id;
                return (
                  <button
                    key={occurrence.occurrence_id}
                    type="button"
                    onClick={() => onSelectOccurrence(occurrence.occurrence_id)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      isSelected ? 'bg-app-accent-soft/30' : 'bg-app-surface hover:bg-app-surface-muted'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-app-text">
                          {getEventOccurrenceLabel(occurrence)}
                        </p>
                        <p className="mt-1 text-sm text-app-text-muted">
                          {getOccurrenceDateRange(occurrence)}
                        </p>
                        <p className="mt-1 text-xs text-app-text-muted">
                          {occurrence.location_name || event.location_name || 'Location TBD'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full bg-app-surface-muted px-2 py-1 text-[11px] font-semibold text-app-text-muted">
                          {getStatusCopy(occurrence)}
                        </span>
                        <span className="text-xs text-app-text-muted">
                          {occurrence.registered_count} registered · {occurrence.attended_count} attended
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-xl border border-app-border bg-app-surface p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
              Selected occurrence
            </p>
            {selectedOccurrence ? (
              <>
                <h4 className="mt-1 text-xl font-semibold text-app-text">
                  {getEventOccurrenceLabel(selectedOccurrence)}
                </h4>
                <p className="mt-2 text-sm text-app-text-muted">
                  {getOccurrenceDateRange(selectedOccurrence)}
                </p>
                <p className="mt-1 text-sm text-app-text-muted">
                  {selectedOccurrence.capacity ? `${selectedOccurrence.registered_count}/${selectedOccurrence.capacity} registered` : `${selectedOccurrence.registered_count} registered`}
                </p>
                {selectedOccurrence.is_exception && (
                  <p className="mt-2 rounded-md bg-app-accent-soft px-3 py-2 text-xs font-medium text-app-accent-text">
                    This occurrence has an override or exception.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-app-text-muted">Choose an occurrence to inspect it here.</p>
            )}
          </div>

          <div className="rounded-md border border-app-border bg-app-surface-muted p-4">
            <h5 className="text-sm font-semibold text-app-text">Batch action preview</h5>
            <p className="mt-1 text-sm text-app-text-muted">
              The current working scope is <strong>{getEventBatchScopeLabel(batchScope)}</strong>.
            </p>
            <p className="mt-2 text-xs text-app-text-muted">
              {supportsBatchScope
                ? 'Registration updates, reminder actions, and schedule review use this scope for the current editing session.'
                : 'This event has one active date, so registration updates and reminder actions stay scoped to this occurrence.'}
            </p>
          </div>

          <div className="rounded-md border border-app-border bg-app-surface-muted p-4">
            <h5 className="text-sm font-semibold text-app-text">
              {supportsBatchScope ? 'Series summary' : 'Event summary'}
            </h5>
            <div className="mt-2 space-y-1 text-sm text-app-text-muted">
              <p>{supportsBatchScope ? 'Series status' : 'Event status'}: {event.status}</p>
              <p>{supportsBatchScope ? 'Series start' : 'Event start'}: {formatDateTime(event.start_date)}</p>
              <p>{supportsBatchScope ? 'Series end' : 'Event end'}: {formatDateTime(event.end_date)}</p>
              <p>Recurring: {event.is_recurring ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
