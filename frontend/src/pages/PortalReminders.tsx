import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';
import { unwrapApiData } from '../services/apiEnvelope';
import PortalPageState from '../components/portal/PortalPageState';

interface ReminderItem {
  type: string;
  id: string;
  title: string;
  date: string;
}

export default function PortalReminders() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Reminders</h2>
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && reminders.length === 0}
        loadingLabel="Loading reminders..."
        emptyTitle="No reminders available."
        emptyDescription="Upcoming reminders will show here once available."
        onRetry={load}
      />
      {!loading && !error && reminders.length > 0 && (
        <ul className="mt-4 space-y-3">
          {reminders.map((reminder) => (
            <li key={`${reminder.type}-${reminder.id}`} className="p-3 border rounded-lg">
              <div className="text-sm text-app-text-muted uppercase">{reminder.type}</div>
              <div className="font-medium text-app-text">{reminder.title}</div>
              <div className="text-sm text-app-text-muted">{new Date(reminder.date).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
