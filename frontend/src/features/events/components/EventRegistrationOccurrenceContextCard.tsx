import type { EventBatchScope, EventOccurrence } from '../../../types/event';
import {
  getEventBatchScopeHint,
  getEventBatchScopeLabel,
  getEventOccurrenceLabel,
  getOccurrenceDateRange,
} from '../utils/occurrences';

interface EventRegistrationOccurrenceContextCardProps {
  activeOccurrence: EventOccurrence | null;
  batchScope: EventBatchScope;
  occurrenceOptions: EventOccurrence[];
  supportsBatchScope?: boolean;
  onChangeBatchScope?: (scope: EventBatchScope) => void;
  onSelectOccurrence?: (occurrenceId: string) => void;
}

export function EventRegistrationOccurrenceContextCard({
  activeOccurrence,
  batchScope,
  occurrenceOptions,
  supportsBatchScope = true,
  onChangeBatchScope,
  onSelectOccurrence,
}: EventRegistrationOccurrenceContextCardProps) {
  const batchScopeLabel = getEventBatchScopeLabel(batchScope);
  const batchScopeHint = getEventBatchScopeHint(batchScope);

  return (
    <div className="mb-4 rounded-lg border border-app-border bg-app-surface-muted p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-app-text">Occurrence context</h3>
          <p className="mt-1 text-sm text-app-text-muted">
            Scope-sensitive registration, check-in, and reminder work starts here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-semibold text-app-accent-text">
            {batchScopeLabel}
          </span>
          <span className="rounded-full bg-app-surface px-3 py-1 text-xs text-app-text-muted">
            {batchScopeHint}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className="rounded-md border border-app-border bg-app-surface p-3">
          <label htmlFor="event-occurrence-select" className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
            Selected occurrence
          </label>
          <select
            id="event-occurrence-select"
            value={occurrenceOptions.length === 0 ? '' : activeOccurrence?.occurrence_id ?? ''}
            onChange={(event) => onSelectOccurrence?.(event.target.value)}
            disabled={occurrenceOptions.length === 0}
            className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
          >
            {occurrenceOptions.length === 0 && <option value="">Series overview only</option>}
            {occurrenceOptions.map((occurrence) => (
              <option key={occurrence.occurrence_id} value={occurrence.occurrence_id}>
                {getEventOccurrenceLabel(occurrence)}
              </option>
            ))}
          </select>
          {activeOccurrence ? (
            <p className="mt-2 text-xs text-app-text-muted">{getOccurrenceDateRange(activeOccurrence)}</p>
          ) : (
            <p className="mt-2 text-xs text-app-text-muted">
              This event currently has a single working date.
            </p>
          )}
        </div>

        <div className="rounded-md border border-app-border bg-app-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">Batch scope</p>
          {supportsBatchScope ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {(['occurrence', 'future_occurrences', 'series'] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => onChangeBatchScope?.(scope)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    batchScope === scope
                      ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                      : 'bg-app-surface-muted text-app-text-muted'
                  }`}
                >
                  {getEventBatchScopeLabel(scope)}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-2">
              <span className="inline-flex rounded-full bg-app-accent px-3 py-1.5 text-sm font-medium text-[var(--app-accent-foreground)]">
                {getEventBatchScopeLabel('occurrence')}
              </span>
            </div>
          )}
          <p className="mt-2 text-xs text-app-text-muted">
            {supportsBatchScope
              ? 'Registration updates respect the selected scope so occurrence-only fixes and broader series actions stay explicit.'
              : 'This is a single-date event, so registration updates apply to this occurrence only.'}
          </p>
        </div>
      </div>
    </div>
  );
}
