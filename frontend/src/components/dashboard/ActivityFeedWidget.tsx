/**
 * Activity Feed Widget
 * Recent activity across the organization
 */

import { useEffect } from 'react';
import { useRecentActivities } from '../../features/activities/hooks';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';
import type { ActivityType } from '../../features/activities/types';

interface ActivityFeedWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const ActivityFeedWidget = ({ widget, editMode, onRemove }: ActivityFeedWidgetProps) => {
  const { activities, loading, error, refresh } = useRecentActivities({ limit: 10 });

  useEffect(() => {
    // Auto-refresh every 60 seconds
    const interval = window.setInterval(() => {
      void refresh();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  const getActivityIcon = (type: ActivityType) => {
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
      error={error}
    >
      <div className="space-y-3">
        {activities.length === 0 && !loading ? (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-app-text-subtle"
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
            <p className="mt-2 text-sm text-app-text-muted">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-3 p-2 hover:bg-app-surface-muted rounded-lg transition"
            >
              <span className="text-2xl flex-shrink-0">{getActivityIcon(activity.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-app-text truncate">{activity.title}</p>
                <p className="text-xs text-app-text-muted truncate">{activity.description}</p>
                <p className="text-xs text-app-text-subtle mt-1">{formatTimestamp(activity.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </WidgetContainer>
  );
};

export default ActivityFeedWidget;
