import { useEffect, useMemo, useState } from 'react';
import PortalPageState from '../components/portal/PortalPageState';
import PortalPageShell from '../components/portal/PortalPageShell';
import PortalListCard from '../components/portal/PortalListCard';
import { unwrapApiData } from '../services/apiEnvelope';
import portalApi from '../services/portalApi';

interface ReminderItem {
  type: 'appointment' | 'event';
  id: string;
  title: string;
  date: string;
}

export default function PortalDashboard() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortedReminders = useMemo(
    () => [...reminders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [reminders]
  );

  const load = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/reminders');
      setReminders(unwrapApiData(response.data));
    } catch (err) {
      console.error('Failed to load reminders', err);
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
      title="Welcome to your portal"
      description="Manage your profile, appointments, and upcoming events."
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && sortedReminders.length === 0}
        loadingLabel="Loading reminders..."
        emptyTitle="No upcoming reminders."
        emptyDescription="When events or appointments are due soon, they will appear here."
        onRetry={load}
      />

      {!loading && !error && sortedReminders.length > 0 && (
        <ul className="space-y-3">
          {sortedReminders.map((reminder) => {
            const when = new Date(reminder.date);
            return (
              <li key={`${reminder.type}-${reminder.id}`}>
                <PortalListCard
                  title={reminder.title}
                  subtitle={reminder.type.toUpperCase()}
                  meta={when.toLocaleString()}
                  badges={
                    <span className="rounded bg-app-surface-muted px-2 py-0.5 text-app-text-muted">
                      {when.toLocaleDateString()}
                    </span>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </PortalPageShell>
  );
}
