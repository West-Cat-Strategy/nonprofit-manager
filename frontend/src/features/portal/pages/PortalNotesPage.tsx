import { useState } from 'react';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import PortalListToolbar from '../../../components/portal/PortalListToolbar';
import usePortalNotesList from '../client/usePortalNotesList';
import type { PortalNote } from '../types/contracts';

export default function PortalNotes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'subject' | 'note_type'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const {
    items: notes,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
  } = usePortalNotesList({
    search: searchTerm,
    sort: sortField,
    order: sortOrder,
  });

  return (
    <PortalPageShell
      title="Notes"
      description="Read notes that staff have shared with your portal account."
    >
      <PortalListToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search notes by subject, type, or content"
        sortValue={sortField}
        onSortChange={setSortField}
        sortOptions={[
          { value: 'created_at', label: 'Created date' },
          { value: 'subject', label: 'Subject' },
          { value: 'note_type', label: 'Note type' },
        ]}
        orderValue={sortOrder}
        onOrderChange={setSortOrder}
        showingCount={notes.length}
        totalCount={total}
      />
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && notes.length === 0}
        loadingLabel="Loading notes..."
        emptyTitle={searchTerm ? 'No matching notes.' : 'No notes available.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Staff must explicitly share notes to make them visible here.'
        }
        onRetry={refresh}
      />
      {!loading && !error && notes.length > 0 && (
        <ul className="space-y-3">
          {notes.map((note: PortalNote) => (
            <li key={note.id}>
              <PortalListCard
                title={note.subject || note.note_type}
                subtitle={note.note_type.toUpperCase()}
                meta={new Date(note.created_at).toLocaleString()}
              >
                <p className="whitespace-pre-wrap text-sm text-app-text-muted">{note.content}</p>
              </PortalListCard>
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
            {loadingMore ? 'Loading more...' : 'Load more notes'}
          </button>
        </div>
      )}
    </PortalPageShell>
  );
}
