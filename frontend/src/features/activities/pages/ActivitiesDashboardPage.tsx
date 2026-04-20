/**
 * Activities Dashboard Page
 * Displays recent activities across the application
 */

import React from 'react';
import { RecentActivities } from '../components';

export const ActivitiesDashboardPage: React.FC = () => {
  return (
    <div className="activities-dashboard">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Recent Activities</h1>
          <p className="text-sm text-gray-600 mt-1">
            View recent actions and changes across your organization
          </p>
        </div>
        <RecentActivities limit={50} />
      </div>
    </div>
  );
};
