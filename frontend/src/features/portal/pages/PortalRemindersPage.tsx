import { useState } from 'react';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import PortalListToolbar from '../../../components/portal/PortalListToolbar';
import usePortalRemindersList from '../client/usePortalRemindersList';
import type { PortalReminder } from '../types/contracts';

export default function PortalReminders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'date' | 'title' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
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

  return (
    <PortalPageShell
      title="Reminders"
      description="Track upcoming tasks, events, and appointment reminders in one place."
    >
      <PortalListToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search reminders by type or title"
        sortValue={sortField}
        onSortChange={setSortField}
        sortOptions={[
          { value: 'date', label: 'Reminder date' },
          { value: 'title', label: 'Title' },
          { value: 'type', label: 'Type' },
        ]}
        orderValue={sortOrder}
        onOrderChange={setSortOrder}
        showingCount={reminders.length}
        totalCount={total}
      />
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
        onRetry={refresh}
      />
      {!loading && !error && reminders.length > 0 && (
        <ul className="space-y-3">
          {reminders.map((reminder: PortalReminder) => (
            <li key={`${reminder.type}-${reminder.id}`}>
              <PortalListCard
                title={reminder.title}
                subtitle={reminder.type.toUpperCase()}
                meta={new Date(reminder.date).toLocaleString()}
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
