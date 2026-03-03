import { useEffect, useMemo, useState } from 'react';
import portalApi from '../services/portalApi';
import { unwrapApiData } from '../services/apiEnvelope';
import PortalPageState from '../components/portal/PortalPageState';
import PortalPageShell from '../components/portal/PortalPageShell';
import PortalListCard from '../components/portal/PortalListCard';

interface ReminderItem {
  type: string;
  id: string;
  title: string;
  date: string;
}

export default function PortalReminders() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('oldest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visibleReminders = useMemo(() => {
    const now = Date.now();
    const needle = searchTerm.trim().toLowerCase();
    const sorted = reminders
      .filter((reminder) => new Date(reminder.date).getTime() >= now)
      .sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
      });

    return sorted.filter((reminder) => {
      if (!needle) {
        return true;
      }
      const haystack = [reminder.type, reminder.title, reminder.date].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [reminders, searchTerm, sortOrder]);

  const load = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/reminders');
      setReminders(unwrapApiData(response.data));
    } catch (loadError) {
      console.error('Failed to load reminders', loadError);
      setError('Unable to load reminders right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PortalPageShell
      title="Reminders"
      description="Track upcoming tasks, events, and appointment reminders in one place."
      actions={
        <div className="flex flex-wrap gap-2">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search reminders"
            className="rounded-md border border-app-input-border px-3 py-2 text-sm"
          />
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm"
          >
            <option value="oldest">Soonest first</option>
            <option value="newest">Latest first</option>
          </select>
        </div>
      }
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && visibleReminders.length === 0}
        loadingLabel="Loading reminders..."
        emptyTitle={searchTerm ? 'No matching reminders.' : 'No reminders available.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Upcoming reminders will show here once available.'
        }
        onRetry={load}
      />
      {!loading && !error && visibleReminders.length > 0 && (
        <ul className="space-y-3">
          {visibleReminders.map((reminder) => (
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
    </PortalPageShell>
  );
}
