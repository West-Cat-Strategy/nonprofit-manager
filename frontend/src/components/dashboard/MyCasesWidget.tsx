/**
 * My Cases Widget
 * Shows cases assigned to the current user
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCases, selectCasesByAssignee } from '../../store/slices/casesSlice';
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
  const { loading, error } = useAppSelector((state) => state.cases);

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
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
      return <span className="text-gray-600">Due {date.toLocaleDateString()}</span>;
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
              className="mx-auto h-12 w-12 text-gray-400"
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
            <p className="mt-2 text-sm text-gray-500">No cases assigned to you</p>
            <Link
              to="/cases/new"
              className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition"
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
                  className="block p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">
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
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {case_.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDueDate(case_.due_date)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Show total count if more than 5 cases */}
            {myCases.length > 5 && (
              <div className="pt-2 border-t border-gray-200">
                <Link
                  to="/cases"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
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
