/**
 * My Cases Widget
 * Shows cases assigned to the current user
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCases, selectCasesByAssignee } from '../../features/cases/state';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface MyCasesWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const MyCasesWidget = ({ widget, editMode, onRemove }: MyCasesWidgetProps) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { loading, error } = useAppSelector((state) => state.casesV2);

  // Get cases assigned to current user
  const myCases = useAppSelector((state) =>
    user ? selectCasesByAssignee(state, user.id) : []
  );

  // Sort by due date (soonest first) and limit to 5
  const sortedCases = useMemo(() => {
    return [...myCases]
      .sort((a, b) => {
        // Cases without due dates go to the end
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 5);
  }, [myCases]);

  useEffect(() => {
    // Fetch cases on mount
    dispatch(fetchCases({}));
  }, [dispatch]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-app-surface-muted text-app-text border-app-border';
    }
  };

  const formatDueDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="text-red-600 font-medium">Overdue</span>;
    } else if (diffDays === 0) {
      return <span className="text-orange-600 font-medium">Due today</span>;
    } else if (diffDays === 1) {
      return <span className="text-yellow-600">Due tomorrow</span>;
    } else if (diffDays <= 7) {
      return <span className="text-yellow-600">Due in {diffDays} days</span>;
    } else {
      return <span className="text-app-text-muted">Due {date.toLocaleDateString()}</span>;
    }
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
        {sortedCases.length === 0 ? (
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
            <p className="mt-2 text-sm text-app-text-muted">No cases assigned to you</p>
            <Link
              to="/cases/new"
              className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-app-accent border border-transparent rounded-md hover:bg-app-accent-hover transition"
            >
              Create New Case
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {sortedCases.map((case_) => (
                <Link
                  key={case_.id}
                  to={`/cases/${case_.id}`}
                  className="block p-3 bg-app-surface border border-app-border rounded-lg hover:bg-app-surface-muted hover:border-app-input-border transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-app-text-muted">
                          {case_.case_number}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(
                            case_.priority
                          )}`}
                        >
                          {case_.priority.charAt(0).toUpperCase() + case_.priority.slice(1)}
                        </span>
                        {case_.is_urgent && (
                          <span className="text-xs" title="Urgent">
                            ⚠️
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-app-text truncate">
                        {case_.title}
                      </p>
                      <p className="text-xs text-app-text-muted mt-1">
                        {formatDueDate(case_.due_date)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Show total count if more than 5 cases */}
            {myCases.length > 5 && (
              <div className="pt-2 border-t border-app-border">
                <Link
                  to="/cases"
                  className="text-xs text-app-accent hover:text-app-accent-text font-medium"
                >
                  View all {myCases.length} assigned cases →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </WidgetContainer>
  );
};

export default MyCasesWidget;
