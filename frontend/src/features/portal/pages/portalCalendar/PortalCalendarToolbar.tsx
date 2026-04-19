import type { PortalCalendarController } from './usePortalCalendarController';

type Props = {
  controller: PortalCalendarController;
};

export default function PortalCalendarToolbar({ controller }: Props) {
  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'All'],
                ['events', 'Events'],
                ['appointments', 'Appointments'],
                ['slots', 'Open slots'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => controller.setFilter(value)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  controller.filter === value
                    ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                    : 'bg-app-surface-muted text-app-text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-app-text-muted">
            Select a date to review everything scheduled for that day, or click an item for
            actions.
          </p>
        </div>

        <div className="w-full max-w-md">
          <label className="mb-1 block text-sm font-medium text-app-text-label">Case</label>
          <select
            aria-label="Select case"
            value={controller.selectedCaseId}
            onChange={(event) => controller.setSelectedCaseId(event.target.value)}
            className="w-full rounded-md border border-app-input-border px-3 py-2"
          >
            {controller.context?.cases.length ? (
              controller.context.cases.map((caseEntry) => (
                <option key={caseEntry.case_id} value={caseEntry.case_id}>
                  {caseEntry.case_number} - {caseEntry.case_title}
                </option>
              ))
            ) : (
              <option value="">No active cases</option>
            )}
          </select>
        </div>
      </div>
    </section>
  );
}
