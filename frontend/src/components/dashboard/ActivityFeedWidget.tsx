/**
 * Activity Feed Widget
 * Recent activity across the organization
 */

import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface ActivityFeedWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const activities = [
  {
    id: '1',
    type: 'donation',
    title: 'New donation received',
    description: 'John Doe donated $500',
    timestamp: '5 minutes ago',
    icon: '💰',
  },
  {
    id: '2',
    type: 'volunteer',
    title: 'Volunteer hours logged',
    description: 'Sarah logged 4 hours',
    timestamp: '1 hour ago',
    icon: '👥',
  },
  {
    id: '3',
    type: 'case',
    title: 'Case updated',
    description: 'Case #123 marked as resolved',
    timestamp: '2 hours ago',
    icon: '📋',
  },
  {
    id: '4',
    type: 'event',
    title: 'Event registration',
    description: '3 new registrations for Food Drive',
    timestamp: '3 hours ago',
    icon: '📅',
  },
];

const ActivityFeedWidget = ({ widget, editMode, onRemove }: ActivityFeedWidgetProps) => {
  return (
    <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove}>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
            <span className="text-2xl">{activity.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
              <p className="text-xs text-gray-500">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </WidgetContainer>
  );
};

export default ActivityFeedWidget;
