import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';

interface ReminderItem {
  type: string;
  id: string;
  title: string;
  date: string;
}

export default function PortalReminders() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await portalApi.get('/portal/reminders');
        setReminders(response.data);
      } catch (error) {
        console.error('Failed to load reminders', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Reminders</h2>
      {loading ? (
        <p className="text-sm text-app-text-muted mt-2">Loading reminders...</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-app-text-muted mt-2">No reminders available.</p>
      ) : (
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
