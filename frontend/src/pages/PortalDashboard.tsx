import { useEffect, useState } from 'react';
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
      <h2 className="text-xl font-semibold text-gray-900">Welcome to your portal</h2>
      <p className="text-sm text-gray-600 mt-1">
        Manage your profile, appointments, and upcoming events.
      </p>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900">Upcoming Reminders</h3>
        {loading ? (
          <p className="text-sm text-gray-500 mt-2">Loading reminders...</p>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No upcoming reminders.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reminders.map((reminder) => (
              <li key={`${reminder.type}-${reminder.id}`} className="p-3 border rounded-lg">
                <div className="text-sm text-gray-500 uppercase">{reminder.type}</div>
                <div className="text-gray-900 font-medium">{reminder.title}</div>
                <div className="text-sm text-gray-600">{new Date(reminder.date).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
