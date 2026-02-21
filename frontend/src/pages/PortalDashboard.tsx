import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';
import { unwrapApiData } from '../services/apiEnvelope';
import PortalPageState from '../components/portal/PortalPageState';

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
    <div className="bg-[var(--app-bg)] min-h-screen p-6 transition-colors duration-300">
      <h2 className="text-3xl font-black uppercase text-[var(--app-text)] tracking-tight">Welcome to your portal</h2>
      <p className="text-[var(--app-text-muted)] mt-2 font-medium text-lg">
        Manage your profile, appointments, and upcoming events.
      </p>

      <div className="mt-8">
        <h3 className="text-xl font-bold uppercase text-[var(--app-text)] border-b-4 border-[var(--app-border)] pb-2 mb-4 inline-block">
          Upcoming Reminders
        </h3>
        <PortalPageState
          loading={loading}
          error={error}
          empty={!loading && !error && reminders.length === 0}
          loadingLabel="Loading reminders..."
          emptyTitle="No upcoming reminders."
          emptyDescription="When events or appointments are due soon, they will appear here."
          onRetry={load}
        />
        {!loading && !error && reminders.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 border-4 border-dashed border-[var(--app-border)] rounded-lg opacity-50">
            <p className="text-[var(--app-text-muted)] font-bold">No upcoming reminders.</p>
          </div>
        )}
        {!loading && !error && reminders.length > 0 && (
          <ul className="mt-4 space-y-4">
            {reminders.map((reminder) => (
              <li
                key={`${reminder.type}-${reminder.id}`}
                className="p-4 border-2 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[4px_4px_0px_0px_var(--shadow-color)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-[var(--app-accent)] mb-1">
                      {reminder.type}
                    </div>
                    <div className="text-[var(--app-text)] font-bold text-lg">{reminder.title}</div>
                  </div>
                  <div className="text-sm font-mono font-bold bg-[var(--app-surface-muted)] px-2 py-1 border border-[var(--app-border)] text-[var(--app-text)]">
                    {new Date(reminder.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="mt-2 text-sm text-[var(--app-text-muted)]">
                  {new Date(reminder.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
