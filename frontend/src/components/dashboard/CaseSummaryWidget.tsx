/**
 * Case Summary Widget
 * Enhanced overview of case management metrics
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCases, selectActiveCases, selectUrgentCases, selectOverdueCases, selectCasesDueThisWeek, selectUnassignedCases, selectCasesByPriority } from '../../store/slices/casesSlice';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface CaseSummaryWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const CaseSummaryWidget = ({ widget, editMode, onRemove }: CaseSummaryWidgetProps) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.cases);

  // Use selectors to get filtered case data
  const activeCases = useAppSelector(selectActiveCases);
  const urgentCases = useAppSelector(selectUrgentCases);
  const overdueCases = useAppSelector(selectOverdueCases);
  const casesDueThisWeek = useAppSelector(selectCasesDueThisWeek);
  const unassignedCases = useAppSelector(selectUnassignedCases);
  const priorityCounts = useAppSelector(selectCasesByPriority);
  const attendedEventOutcomes = activeCases.filter((c) => c.outcome === 'attended_event').length;
  const relatedCaseOutcomes = activeCases.filter((c) => c.outcome === 'additional_related_case').length;
  const outcomeDenominator = Math.max(1, activeCases.length);

  useEffect(() => {
    // Fetch all cases on mount
    dispatch(fetchCases({}));
  }, [dispatch]);

  return (
    <WidgetContainer
      widget={widget}
      editMode={editMode}
      onRemove={onRemove}
      loading={loading}
      error={error || undefined}
    >
      <div className="space-y-4">
        {/* Top Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/cases?quick_filter=active"
            className="p-3 bg-app-accent-soft rounded-lg hover:bg-app-accent-soft transition"
          >
            <p className="text-xs text-app-accent font-medium">Active Cases</p>
            <p className="text-2xl font-bold text-app-accent-text">{activeCases.length}</p>
          </Link>

          <Link
            to="/cases?quick_filter=urgent"
            className="p-3 bg-red-50 rounded-lg hover:bg-red-100 transition relative"
          >
            <p className="text-xs text-red-600 font-medium">Urgent</p>
            <p className="text-2xl font-bold text-red-900">{urgentCases.length}</p>
            {urgentCases.length > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </Link>

          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Overdue
            </p>
            <p className="text-2xl font-bold text-orange-900">{overdueCases.length}</p>
          </div>

          <Link
            to="/cases?quick_filter=unassigned"
            className="p-3 bg-app-surface-muted rounded-lg hover:bg-app-surface-muted transition"
          >
            <p className="text-xs text-app-text-muted font-medium">Unassigned</p>
            <p className="text-2xl font-bold text-app-text">{unassignedCases.length}</p>
          </Link>
        </div>

        {/* Due This Week */}
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-700 font-medium">Due This Week</p>
              <p className="text-xl font-bold text-yellow-900">{casesDueThisWeek.length}</p>
            </div>
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="pt-2 border-t border-app-border">
          <p className="text-xs text-app-text-muted font-medium mb-2">Priority Distribution</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">{priorityCounts.low}</div>
              <div className="text-xs text-app-text-muted">Low</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">{priorityCounts.medium}</div>
              <div className="text-xs text-app-text-muted">Med</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">{priorityCounts.high}</div>
              <div className="text-xs text-app-text-muted">High</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{priorityCounts.urgent}</div>
              <div className="text-xs text-app-text-muted">Urg</div>
            </div>
          </div>
        </div>

        {/* Outcome Signals */}
        <div className="pt-2 border-t border-app-border">
          <p className="text-xs text-app-text-muted font-medium mb-2">Outcome Signals</p>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-app-text">Attended Event</span>
                <span className="text-app-text">{attendedEventOutcomes}</span>
              </div>
              <div className="h-2 bg-app-surface-muted rounded overflow-hidden">
                <div
                  className="h-full bg-[var(--loop-blue)]"
                  style={{ width: `${(attendedEventOutcomes / outcomeDenominator) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-app-text">Additional Related Case</span>
                <span className="text-app-text">{relatedCaseOutcomes}</span>
              </div>
              <div className="h-2 bg-app-surface-muted rounded overflow-hidden">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${(relatedCaseOutcomes / outcomeDenominator) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Link
            to="/cases"
            className="flex-1 text-center px-3 py-2 text-xs font-medium text-app-text-muted bg-app-surface border border-app-input-border rounded hover:bg-app-surface-muted transition"
          >
            View All
          </Link>
          <Link
            to="/cases/new"
            className="flex-1 text-center px-3 py-2 text-xs font-medium text-white bg-app-accent border border-transparent rounded hover:bg-app-accent-hover transition"
          >
            New Case
          </Link>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default CaseSummaryWidget;
