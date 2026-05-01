import { BellIcon } from '@heroicons/react/24/outline';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import PortalListToolbar from '../../../components/portal/PortalListToolbar';
import usePortalRemindersList from '../client/usePortalRemindersList';
import type { PortalReminder } from '../types/contracts';
import { formatPortalDateTime } from '../utils/dateDisplay';
import { usePortalListUrlState } from '../utils/listQueryState';

const REMINDER_SORT_VALUES = ['date', 'title', 'type'] as const;

export default function PortalReminders() {
  const {
    search: searchTerm,
    sort: sortField,
    order: sortOrder,
    setSearch,
    setSort,
    setOrder,
  } = usePortalListUrlState({
    sortValues: REMINDER_SORT_VALUES,
    defaultSort: 'date',
    defaultOrder: 'asc',
  });
  const {
    items: reminders,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
  } = usePortalRemindersList({
    search: searchTerm,
    sort: sortField,
    order: sortOrder,
  });
  const shouldShowListTools = reminders.length > 0 || searchTerm.trim().length > 0;

  return (
    <PortalPageShell
      title="Reminders"
      description="Track upcoming tasks, events, and appointment reminders in one place."
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && reminders.length === 0}
        loadingLabel="Loading reminders..."
        emptyTitle={searchTerm ? 'No matching reminders.' : 'No reminders available.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Upcoming reminders will show here once available.'
        }
        emptyIcon={<BellIcon className="h-5 w-5" aria-hidden="true" />}
        onRetry={refresh}
      />
      {shouldShowListTools && (
        <PortalListToolbar
          searchValue={searchTerm}
          onSearchChange={setSearch}
          searchPlaceholder="Search reminders by type or title"
          sortValue={sortField}
          onSortChange={setSort}
          sortOptions={[
            { value: 'date', label: 'Reminder date' },
            { value: 'title', label: 'Title' },
            { value: 'type', label: 'Type' },
          ]}
          orderValue={sortOrder}
          onOrderChange={setOrder}
          showingCount={reminders.length}
          totalCount={total}
        />
      )}
      {!loading && !error && reminders.length > 0 && (
        <ul className="mt-3 space-y-3">
          {reminders.map((reminder: PortalReminder) => (
            <li key={`${reminder.type}-${reminder.id}`}>
              <PortalListCard
                icon={<BellIcon className="h-5 w-5" aria-hidden="true" />}
                title={reminder.title}
                subtitle={reminder.type.toUpperCase()}
                meta={formatPortalDateTime(reminder.date)}
              />
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && hasMore && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-md border border-app-input-border px-4 py-2 text-sm font-medium text-app-text disabled:opacity-60"
          >
            {loadingMore ? 'Loading more...' : 'Load more reminders'}
          </button>
        </div>
      )}
    </PortalPageShell>
  );
}
