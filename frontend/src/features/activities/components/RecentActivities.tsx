/**
 * RecentActivities Component
 * Displays a list of recent activities
 */

import React from 'react';
import { useRecentActivities } from '../hooks';
import { ActivityItem } from './ActivityItem';
import type { ActivityListFilters } from '../types';

interface RecentActivitiesProps {
  limit?: number;
}

export const RecentActivities: React.FC<RecentActivitiesProps> = ({ limit }) => {
  const filters: ActivityListFilters | undefined = limit ? { limit } : undefined;
  const { activities, loading, error } = useRecentActivities(filters);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-500 text-sm">No recent activities</p>
      </div>
    );
  }

  return (
    <div className="activity-list divide-y divide-gray-200">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
};
