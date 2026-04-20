/**
 * ActivityItem Component
 * Displays a single activity record
 */

import React from 'react';
import { formatDateTime } from '../../../utils/format';
import type { ActivityRecord } from '../types';

interface ActivityItemProps {
  activity: ActivityRecord;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const description = activity.description.trim();

  return (
    <div className="activity-item border-b border-gray-200 py-3 px-4 hover:bg-gray-50">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
          {activity.user_name && (
            <p className="text-xs text-gray-500 mt-2">Recorded by {activity.user_name}</p>
          )}
        </div>
        <time className="text-xs text-gray-500 ml-2 whitespace-nowrap">
          {formatDateTime(activity.timestamp)}
        </time>
      </div>
    </div>
  );
};
