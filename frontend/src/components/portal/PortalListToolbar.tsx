import type { PortalSortOrder } from '../../features/portal/types/contracts';

interface SortOption<TSort extends string> {
  value: TSort;
  label: string;
}

interface PortalListToolbarProps<TSort extends string> {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sortValue: TSort;
  onSortChange: (value: TSort) => void;
  sortOptions: SortOption<TSort>[];
  orderValue: PortalSortOrder;
  onOrderChange: (value: PortalSortOrder) => void;
  showingCount: number;
  totalCount: number;
}

export default function PortalListToolbar<TSort extends string>({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  sortValue,
  onSortChange,
  sortOptions,
  orderValue,
  onOrderChange,
  showingCount,
  totalCount,
}: PortalListToolbarProps<TSort>) {
  return (
    <section className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface-muted p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="portal-list-search" className="text-xs font-semibold uppercase tracking-wide text-app-text-label">
            Search
          </label>
          <input
            id="portal-list-search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="mt-1 w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          />
        </div>
        <div className="min-w-[170px]">
          <label htmlFor="portal-list-sort" className="text-xs font-semibold uppercase tracking-wide text-app-text-label">
            Sort
          </label>
          <select
            id="portal-list-sort"
            value={sortValue}
            onChange={(event) => onSortChange(event.target.value as TSort)}
            className="mt-1 w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label htmlFor="portal-list-order" className="text-xs font-semibold uppercase tracking-wide text-app-text-label">
            Order
          </label>
          <select
            id="portal-list-order"
            value={orderValue}
            onChange={(event) => onOrderChange(event.target.value as PortalSortOrder)}
            className="mt-1 w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
      <p className="mt-2 text-xs text-app-text-muted" aria-live="polite">
        Showing {showingCount} of {totalCount} results
      </p>
    </section>
  );
}
