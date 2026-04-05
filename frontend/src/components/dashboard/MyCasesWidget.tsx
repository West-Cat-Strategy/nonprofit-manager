/**
 * My Cases Widget
 * Shows cases assigned to the current user
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { casesApiClient } from '../../features/cases/api/casesApiClient';
import { useAppSelector } from '../../store/hooks';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';
import type { CasePriority, CaseWithDetails } from '../../types/case';
import {
  getCasePriorityLabel,
  isUrgentEquivalentPriority,
} from '../../features/cases/utils/casePriority';

const MAX_ASSIGNED_CASES = 5;

const sortByDueDate = (cases: CaseWithDetails[]): CaseWithDetails[] => {
  const normalizeDueDate = (dateString?: string | null): number => {
    if (!dateString) {
      return Number.POSITIVE_INFINITY;
    }

    const parsed = new Date(dateString).getTime();
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
  };

  return [...cases].sort((a, b) => {
    const dueDateDiff = normalizeDueDate(a.due_date) - normalizeDueDate(b.due_date);
    if (dueDateDiff !== 0) {
      return dueDateDiff;
    }

    return a.case_number.localeCompare(b.case_number);
  });
};

interface MyCasesWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const MyCasesWidget = ({ widget, editMode, onRemove }: MyCasesWidgetProps) => {
  const { user, authLoading } = useAppSelector((state) => state.auth);
  const userId = user?.id ?? null;
  const [cases, setCases] = useState<CaseWithDetails[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(Boolean(userId) || authLoading);
  const [error, setError] = useState<string | null>(null);

  const sortedCases = useMemo(() => {
    return sortByDueDate(cases).slice(0, MAX_ASSIGNED_CASES);
  }, [cases]);

  useEffect(() => {
    let cancelled = false;

    const fetchAssignedCases = async () => {
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!userId) {
        setCases([]);
        setTotalCases(0);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await casesApiClient.listCases({
          assignedTo: userId,
          page: 1,
          limit: MAX_ASSIGNED_CASES,
          sortBy: 'due_date',
          sortOrder: 'asc',
        });

        if (cancelled) {
          return;
        }

        const nextCases = Array.isArray(response.cases) ? response.cases : [];
        setCases(nextCases);
        setTotalCases(typeof response.total === 'number' ? response.total : nextCases.length);
      } catch {
        if (cancelled) {
          return;
        }

        setCases([]);
        setTotalCases(0);
        setError('Failed to load assigned cases');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchAssignedCases();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  const getPriorityColor = (priority: CasePriority) => {
    if (isUrgentEquivalentPriority(priority)) {
      return 'bg-app-accent-soft text-app-accent-text border-app-border';
    }

    switch (priority) {
      case 'low':
        return 'bg-app-accent-soft text-app-accent-text border-app-border';
      case 'medium':
        return 'bg-app-accent-soft text-app-accent-text border-app-border';
      case 'high':
        return 'bg-app-accent-soft text-app-accent-text border-app-border';
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
      return <span className="text-app-accent font-medium">Overdue</span>;
    } else if (diffDays === 0) {
      return <span className="text-app-accent font-medium">Due today</span>;
    } else if (diffDays === 1) {
      return <span className="text-app-accent">Due tomorrow</span>;
    } else if (diffDays <= 7) {
      return <span className="text-app-accent">Due in {diffDays} days</span>;
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
              className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-[var(--app-accent-foreground)] bg-app-accent border border-transparent rounded-md hover:bg-app-accent-hover transition"
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
                          {getCasePriorityLabel(case_.priority)}
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

            {/* Show total count if more than the widget limit */}
            {totalCases > MAX_ASSIGNED_CASES && userId && (
              <div className="pt-2 border-t border-app-border">
                <Link
                  to={`/cases?assigned_to=${userId}`}
                  className="text-xs text-app-accent hover:text-app-accent-text font-medium"
                >
                  View all {totalCases} assigned cases →
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
