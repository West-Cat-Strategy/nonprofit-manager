/**
 * Activity Feed Widget
 * Recent activity across the organization
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';
import { useApiError } from '../../hooks/useApiError';

interface ActivityFeedWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user_name: string | null;
  entity_type: 'case' | 'donation' | 'volunteer' | 'event' | 'contact' | 'task';
}

const ActivityFeedWidget = ({ widget, editMode, onRemove }: ActivityFeedWidgetProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, setFromError, clear } = useApiError();

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      clear();
      const response = await api.get('/activities/recent?limit=10');
      setActivities(response.data.activities || []);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      setFromError(err, 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [clear, setFromError]);

  useEffect(() => {
    fetchActivities();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchActivities, 60000);

    return () => clearInterval(interval);
  }, [fetchActivities]);

  const getActivityIcon = (type: string) => {
    if (type.startsWith('case')) return '📋';
    if (type.startsWith('donation')) return '💰';
    if (type.startsWith('volunteer')) return '👥';
    if (type.startsWith('event')) return '📅';
    if (type.startsWith('contact')) return '👤';
    if (type.startsWith('task')) return '✓';
    return '📰';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <WidgetContainer
      widget={widget}
      editMode={editMode}
      onRemove={onRemove}
      loading={loading}
      error={error || undefined}
    >
      <div className="space-y-3">
        {activities.length === 0 && !loading ? (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg transition"
            >
              <span className="text-2xl flex-shrink-0">{getActivityIcon(activity.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">{formatTimestamp(activity.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </WidgetContainer>
  );
};

export default ActivityFeedWidget;
