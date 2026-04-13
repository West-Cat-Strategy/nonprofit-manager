/**
 * Case Summary Widget
 * Enhanced overview of case management metrics
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCaseSummary } from '../../features/cases/state';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface CaseSummaryWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const CaseSummaryWidget = ({ widget, editMode, onRemove }: CaseSummaryWidgetProps) => {
  const dispatch = useAppDispatch();
  const summary = useAppSelector((state) => state.cases.list.summary);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(summary === null);
  const initialSummaryExistsRef = useRef(summary !== null);

  const priorityCounts = summary?.by_priority ?? {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };
  const caseOutcomes = summary?.by_case_outcome ?? {};
  const activeCasesCount = summary?.open_cases ?? 0;
  const urgentCasesCount = priorityCounts.urgent;
  const overdueCasesCount = summary?.overdue_cases ?? 0;
  const casesDueThisWeekCount = summary?.cases_due_this_week ?? 0;
  const unassignedCasesCount = summary?.unassigned_cases ?? 0;
  const attendedEventOutcomes = caseOutcomes.attended_event ?? 0;
  const relatedCaseOutcomes = caseOutcomes.additional_related_case ?? 0;
  const outcomeDenominator = Math.max(1, activeCasesCount);

  useEffect(() => {
    if (summary !== null) {
      initialSummaryExistsRef.current = true;
    }
  }, [summary]);

  useEffect(() => {
    let cancelled = false;

    if (!initialSummaryExistsRef.current) {
      setSummaryError(null);
      setSummaryLoading(true);
    }

    void Promise.resolve(dispatch(fetchCaseSummary()))
      .then((action) => {
        if (cancelled || initialSummaryExistsRef.current) {
          return;
        }

        if (fetchCaseSummary.rejected.match(action)) {
          setSummaryError(
            typeof action.payload === 'string' && action.payload.trim().length > 0
              ? action.payload
              : 'Failed to load case summary'
          );
        }
      })
      .finally(() => {
        if (!cancelled && !initialSummaryExistsRef.current) {
          setSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return (
    <WidgetContainer
      widget={widget}
      editMode={editMode}
      onRemove={onRemove}
      loading={summaryLoading}
      error={summary === null ? summaryError || undefined : undefined}
    >
      <div className="space-y-4">
        {/* Top Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/cases?quick_filter=active"
            className="p-3 bg-app-accent-soft rounded-lg hover:bg-app-accent-soft transition"
          >
            <p className="text-xs text-app-accent font-medium">Active Cases</p>
            <p className="text-2xl font-bold text-app-accent-text">{activeCasesCount}</p>
          </Link>

          <Link
            to="/cases?quick_filter=urgent"
            className="p-3 bg-app-accent-soft rounded-lg hover:bg-app-accent-soft transition relative"
          >
            <p className="text-xs text-app-accent font-medium">Urgent</p>
            <p className="text-2xl font-bold text-app-accent-text">{urgentCasesCount}</p>
            {urgentCasesCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent-soft opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span>
              </span>
            )}
          </Link>

          <div className="p-3 bg-app-accent-soft rounded-lg">
            <p className="text-xs text-app-accent font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Overdue
            </p>
            <p className="text-2xl font-bold text-app-accent-text">{overdueCasesCount}</p>
          </div>

          <Link
            to="/cases?quick_filter=unassigned"
            className="p-3 bg-app-surface-muted rounded-lg hover:bg-app-surface-muted transition"
          >
            <p className="text-xs text-app-text-muted font-medium">Unassigned</p>
            <p className="text-2xl font-bold text-app-text">{unassignedCasesCount}</p>
          </Link>
        </div>

        {/* Due This Week */}
        <div className="p-3 bg-app-accent-soft rounded-lg border border-app-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-app-accent-text font-medium">Due This Week</p>
              <p className="text-xl font-bold text-app-accent-text">{casesDueThisWeekCount}</p>
            </div>
            <svg className="w-8 h-8 text-app-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="pt-2 border-t border-app-border">
          <p className="text-xs text-app-text-muted font-medium mb-2">Priority Distribution</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-app-accent">{priorityCounts.low}</div>
              <div className="text-xs text-app-text-muted">Low</div>
            </div>
            <div>
              <div className="text-lg font-bold text-app-accent">{priorityCounts.medium}</div>
              <div className="text-xs text-app-text-muted">Med</div>
            </div>
            <div>
              <div className="text-lg font-bold text-app-accent">{priorityCounts.high}</div>
              <div className="text-xs text-app-text-muted">High</div>
            </div>
            <div>
              <div className="text-lg font-bold text-app-accent">{priorityCounts.urgent}</div>
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
                  className="h-full bg-app-accent"
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
            className="flex-1 text-center px-3 py-2 text-xs font-medium text-[var(--app-accent-foreground)] bg-app-accent border border-transparent rounded hover:bg-app-accent-hover transition"
          >
            New Case
          </Link>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default CaseSummaryWidget;
