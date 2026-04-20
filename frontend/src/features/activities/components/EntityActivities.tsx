/**
 * EntityActivities Component
 * Displays activities for a specific entity (case, contact, donation, etc.)
 */

import React from 'react';
import { useEntityActivities } from '../hooks';
import { ActivityItem } from './ActivityItem';
import type { EntityActivityFilters } from '../types';

interface EntityActivitiesProps {
  filters: EntityActivityFilters;
}

export const EntityActivities: React.FC<EntityActivitiesProps> = ({ filters }) => {
  const { activities, loading, error } = useEntityActivities(filters);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
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
        <p className="text-gray-500 text-sm">No activities for this {filters.entityType}</p>
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
