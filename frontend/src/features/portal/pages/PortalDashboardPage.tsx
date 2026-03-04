import { useEffect, useState } from 'react';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import { portalV2ApiClient } from '../api/portalApiClient';
import type { PortalReminder } from '../types/contracts';

export default function PortalDashboard() {
  const [reminders, setReminders] = useState<PortalReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const response = await portalV2ApiClient.listReminders({
        limit: 8,
        sort: 'date',
        order: 'asc',
      });
      setReminders(response.items);
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
        empty={!loading && !error && reminders.length === 0}
        loadingLabel="Loading reminders..."
        emptyTitle="No upcoming reminders."
        emptyDescription="When events or appointments are due soon, they will appear here."
        onRetry={load}
      />

      {!loading && !error && reminders.length > 0 && (
        <ul className="space-y-3">
          {reminders.map((reminder) => {
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
