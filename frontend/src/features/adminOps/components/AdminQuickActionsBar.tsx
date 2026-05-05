import { Link } from 'react-router-dom';
import { classNames } from '../../../components/ui/classNames';
import { getAdminQuickActionsForRole } from './adminQuickActions';

interface AdminQuickActionsBarProps {
  role?: string;
  className?: string;
  compact?: boolean;
  onActionClick?: () => void;
  maxItems?: number;
}

export default function AdminQuickActionsBar({
  role,
  className,
  compact = false,
  onActionClick,
  maxItems,
}: AdminQuickActionsBarProps) {
  const actions = getAdminQuickActionsForRole(role);
  const visibleActions = typeof maxItems === 'number' ? actions.slice(0, maxItems) : actions;

  if (visibleActions.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={classNames('space-y-1', className)} data-testid="admin-quick-actions-compact">
        <h3 className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-app-text-subtle">
          Admin Quick Actions
        </h3>
        {visibleActions.map((action) => (
          <Link
            key={action.id}
            to={action.to}
            onClick={onActionClick}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-app-text hover:bg-app-hover"
          >
            <span aria-hidden="true">{action.icon}</span>
            <div>
              <p className="font-medium text-app-text">{action.label}</p>
              <p className="text-xs text-app-text-muted">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section
      className={classNames(
        'rounded-lg border border-app-border bg-app-surface p-4 shadow-sm',
        className
      )}
      aria-label="Admin quick actions"
      data-testid="admin-quick-actions"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-app-text-heading">
          Quick Actions
        </h3>
        <span className="text-xs text-app-text-subtle">Role-aware shortcuts</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {visibleActions.map((action) => (
          <Link
            key={action.id}
            to={action.to}
            onClick={onActionClick}
            className="group rounded-md border border-app-border px-3 py-3 transition-colors hover:border-app-accent hover:bg-app-accent-soft"
          >
            <div className="mb-2 flex items-center gap-2">
              <span aria-hidden="true" className="text-lg">
                {action.icon}
              </span>
              <span className="text-sm font-semibold text-app-text group-hover:text-app-accent-text">
                {action.label}
              </span>
            </div>
            <p className="text-xs text-app-text-muted">{action.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
