/**
 * Quick Actions Widget
 * Shortcuts to common tasks
 */

import { Link } from 'react-router-dom';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface QuickActionsWidgetProps {
  widget?: DashboardWidget;
  editMode?: boolean;
  onRemove?: () => void;
}

const actions = [
  {
    title: 'New Intake',
    icon: '🧾',
    link: '/intake/new',
    color: 'bg-amber-100 text-amber-800',
  },
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
    title: 'Note an Interaction',
    icon: '📝',
    link: '/interactions/new',
    color: 'bg-blue-100 text-blue-700',
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

const QuickActionsWidget = ({ widget, editMode = false, onRemove }: QuickActionsWidgetProps) => {
  const handleClick = (e: React.MouseEvent) => {
    // Prevent parent handlers from interfering with navigation
    if (editMode) {
      e.stopPropagation();
    }
  };

  const content = (
    <div className="grid grid-cols-2 gap-3" onClick={handleClick}>
      {actions.map((action) => (
        <Link
          key={action.title}
          to={action.link}
          className={`${action.color} rounded-xl p-4 flex flex-col items-center justify-center text-center hover:opacity-80 transition-opacity ${editMode ? 'pointer-events-auto' : ''}`}
          onClick={(e) => {
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
  );

  if (widget && onRemove) {
    return (
      <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove}>
        {content}
      </WidgetContainer>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
        <span className="text-xs text-slate-400">Shortcuts</span>
      </div>
      {content}
    </div>
  );
};

export default QuickActionsWidget;
