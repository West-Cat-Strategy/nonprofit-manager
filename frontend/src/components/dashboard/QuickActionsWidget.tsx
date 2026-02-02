/**
 * Quick Actions Widget
 * Shortcuts to common tasks
 */

import { Link } from 'react-router-dom';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface QuickActionsWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const actions = [
  {
    title: 'New Donation',
    icon: '💰',
    link: '/donations/new',
    color: 'bg-green-100 text-green-700',
  },
  {
    title: 'Add Contact',
    icon: '👤',
    link: '/contacts/new',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    title: 'Create Case',
    icon: '📋',
    link: '/cases/new',
    color: 'bg-red-100 text-red-700',
  },
  {
    title: 'New Task',
    icon: '✓',
    link: '/tasks/new',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    title: 'New Event',
    icon: '📅',
    link: '/events/new',
    color: 'bg-orange-100 text-orange-700',
  },
  {
    title: 'Add Volunteer',
    icon: '🤝',
    link: '/volunteers/new',
    color: 'bg-indigo-100 text-indigo-700',
  },
];

const QuickActionsWidget = ({ widget, editMode, onRemove }: QuickActionsWidgetProps) => {
  const handleClick = (e: React.MouseEvent) => {
    // Prevent parent handlers from interfering with navigation
    if (editMode) {
      e.stopPropagation();
    }
  };

  return (
    <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-3" onClick={handleClick}>
        {actions.map((action) => (
          <Link
            key={action.title}
            to={action.link}
            className={`${action.color} rounded-lg p-4 flex flex-col items-center justify-center text-center hover:opacity-80 transition-opacity ${editMode ? 'pointer-events-auto' : ''}`}
            onClick={(e) => {
              console.log('Quick action clicked:', action.title, '-> navigating to:', action.link);
              if (editMode) {
                e.stopPropagation();
              }
            }}
          >
            <span className="text-3xl mb-2">{action.icon}</span>
            <span className="text-sm font-medium">{action.title}</span>
          </Link>
        ))}
      </div>
    </WidgetContainer>
  );
};

export default QuickActionsWidget;
