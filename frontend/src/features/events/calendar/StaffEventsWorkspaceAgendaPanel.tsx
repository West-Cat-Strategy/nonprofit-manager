import { format, parseISO } from 'date-fns';
import {
  entryKindLabel,
  getEventOccurrenceLabel,
  type StaffCalendarEntry,
} from '../scheduling/staffCalendarEntries';

interface StaffEventsWorkspaceAgendaPanelProps {
  selectedDate: Date;
  selectedDateEntries: StaffCalendarEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: StaffCalendarEntry) => void;
}

export default function StaffEventsWorkspaceAgendaPanel({
  selectedDate,
  selectedDateEntries,
  selectedEntryId,
  onSelectEntry,
}: StaffEventsWorkspaceAgendaPanelProps) {
  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Day agenda</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            {format(selectedDate, 'EEEE, MMMM d')} · {selectedDateEntries.length} item
            {selectedDateEntries.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {selectedDateEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-app-border bg-app-surface-muted/50 p-4 text-sm text-app-text-muted">
            Nothing is scheduled for this date yet.
          </div>
        ) : (
          selectedDateEntries.map((entry) => {
            const occurrence =
              entry.metadata.kind === 'event' ? entry.metadata.occurrence : null;
            const occurrenceLabel =
              occurrence &&
              ((occurrence.occurrence_name &&
                occurrence.occurrence_name !== occurrence.event_name) ||
                (occurrence.occurrence_index ?? 1) > 1)
                ? getEventOccurrenceLabel(occurrence, occurrence.occurrence_index ?? 1)
                : null;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectEntry(entry)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                  selectedEntryId === entry.id
                    ? 'border-app-accent bg-app-accent-soft/20'
                    : 'border-app-border bg-app-surface-muted hover:bg-app-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-app-text">{entry.title}</div>
                    <div className="mt-1 text-xs text-app-text-muted">
                      {format(parseISO(entry.start), 'p')}
                      {entry.end ? ` - ${format(parseISO(entry.end), 'p')}` : ''}
                      {entry.location ? ` • ${entry.location}` : ''}
                    </div>
                    {occurrenceLabel ? (
                      <div className="mt-1 text-xs text-app-text-muted">{occurrenceLabel}</div>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-app-surface px-2 py-0.5 text-[11px] text-app-text-muted">
                    {entryKindLabel[entry.metadata.kind]}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
