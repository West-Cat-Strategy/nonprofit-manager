import {
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  SCOPE_OPTIONS,
  type CalendarScope,
} from '../scheduling/staffCalendarQuery';

interface StaffEventsWorkspaceFiltersPanelProps {
  isAdmin: boolean;
  selectedScope: CalendarScope;
  searchInput: string;
  selectedEventType: string;
  selectedStatus: string;
  onSearchInputChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onScopeChange: (value: CalendarScope) => void;
  onClearFilters: () => void;
}

export default function StaffEventsWorkspaceFiltersPanel({
  isAdmin,
  selectedScope,
  searchInput,
  selectedEventType,
  selectedStatus,
  onSearchInputChange,
  onTypeChange,
  onStatusChange,
  onScopeChange,
  onClearFilters,
}: StaffEventsWorkspaceFiltersPanelProps) {
  return (
    <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm">
      <div className="mt-0 rounded-xl border border-app-border bg-app-surface-muted/60 p-4">
        {isAdmin ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onScopeChange(option.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedScope === option.value
                    ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                    : 'bg-app-surface text-app-text-muted hover:bg-app-surface-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-app-text-label">Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              placeholder="Search title, description, or location..."
              className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-app-text-label">Type</span>
            <select
              value={selectedEventType}
              onChange={(event) => onTypeChange(event.target.value || '')}
              className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text"
            >
              <option value="">All types</option>
              {EVENT_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-app-text-label">Status</span>
            <select
              value={selectedStatus}
              onChange={(event) => onStatusChange(event.target.value || '')}
              className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text"
            >
              <option value="">All statuses</option>
              {EVENT_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onClearFilters}
              className="w-full rounded-md border border-app-input-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-muted xl:w-auto"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
