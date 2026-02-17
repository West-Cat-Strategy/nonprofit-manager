import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/format';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user_name: string | null;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
}

interface ContactActivityTimelineProps {
  contactId: string;
}

const ACTIVITY_ICONS: Record<string, string> = {
  contact_note_added: '📝',
  case_created: '📁',
  donation_received: '💵',
  task_created: '✅',
  document_uploaded: '📎',
};

export default function ContactActivityTimeline({ contactId }: ContactActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/activities/contact/${contactId}`);
        setActivities(response.data.activities || []);
      } catch {
        setError('Failed to load activity timeline');
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [contactId]);

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [activities]
  );

  if (loading) {
    return (
      <div className="py-6 text-center text-sm font-bold text-black/60">
        Loading activity...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center text-sm font-bold text-red-600">
        {error}
      </div>
    );
  }

  if (sortedActivities.length === 0) {
    return (
      <div className="py-8 text-center text-sm font-bold text-black/60">
        No activity yet for this person
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedActivities.map((activity) => (
        <div
          key={activity.id}
          className="border-2 border-black bg-white p-4 shadow-[2px_2px_0px_var(--shadow-color)]"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {ACTIVITY_ICONS[activity.type] || '🗂️'}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black uppercase text-black">
                  {activity.title}
                </h4>
                <span className="text-xs font-bold text-black/60">
                  {formatDate(activity.timestamp)}
                </span>
              </div>
              {activity.description && (
                <p className="mt-1 text-sm font-bold text-black/70">
                  {activity.description}
                </p>
              )}
              {activity.user_name && (
                <p className="mt-1 text-xs font-bold text-black/50">
                  by {activity.user_name}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
