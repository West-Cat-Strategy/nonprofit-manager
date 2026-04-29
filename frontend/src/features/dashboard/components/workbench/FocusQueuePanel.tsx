import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../../store/hooks';
import { queueViewsApiClient } from '../../../cases/api/queueViewsApiClient';
import type { QueueViewDefinition } from '../../../cases/api/queueViewsApiClient';
import {
  useDashboardCaseSummary,
  useDashboardFollowUpSummary,
  useDashboardTaskSummary,
} from '../../context/DashboardDataContext';
import {
  FocusCard,
  WorkbenchPanelHeader,
  workbenchInteractiveCardClassName,
  workbenchPanelClassName,
} from './WorkbenchPanelPrimitives';

interface SavedQueueEntry {
  id: string;
  name: string;
  description: string;
  href: string;
  cta: string;
}

const MAX_SAVED_QUEUE_ENTRIES = 2;
export const SAVED_QUEUE_LOAD_DELAY_MS = 2000;

interface FocusQueuePanelProps {
  loadSavedQueues?: boolean;
  savedQueueLoadDelayMs?: number;
}

const isSafeInternalHref = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

const getBehaviorText = (
  dashboardBehavior: Record<string, unknown>,
  key: string
): string | null => {
  const value = dashboardBehavior[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const getSavedQueueHref = (view: QueueViewDefinition): string => {
  const configuredHref =
    view.dashboardBehavior.href ??
    view.dashboardBehavior.to ??
    view.dashboardBehavior.path ??
    view.filters.href ??
    view.filters.path;

  if (isSafeInternalHref(configuredHref)) {
    return configuredHref;
  }

  return `/dashboard?queue_view=${encodeURIComponent(view.id)}`;
};

const toSavedQueueEntry = (view: QueueViewDefinition): SavedQueueEntry => ({
  id: view.id,
  name: view.name,
  description:
    getBehaviorText(view.dashboardBehavior, 'description') ??
    `Opens the saved queue with up to ${view.rowLimit} ${view.rowLimit === 1 ? 'row' : 'rows'}.`,
  href: getSavedQueueHref(view),
  cta: getBehaviorText(view.dashboardBehavior, 'cta') ?? 'Open saved queue',
});

export default function FocusQueuePanel({
  loadSavedQueues = true,
  savedQueueLoadDelayMs = SAVED_QUEUE_LOAD_DELAY_MS,
}: FocusQueuePanelProps = {}) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const caseSummaryLane = useDashboardCaseSummary();
  const followUpSummaryLane = useDashboardFollowUpSummary();
  const taskSummaryLane = useDashboardTaskSummary();
  const [savedQueueViews, setSavedQueueViews] = useState<QueueViewDefinition[]>([]);

  const urgentCasesCount = caseSummaryLane?.caseSummary?.by_priority.urgent ?? 0;
  const overdueCasesCount = caseSummaryLane?.caseSummary?.overdue_cases ?? 0;
  const casesDueThisWeekCount = caseSummaryLane?.caseSummary?.cases_due_this_week ?? 0;
  const followUpsDueToday = followUpSummaryLane?.followUpSummary?.due_today ?? 0;
  const followUpsDueThisWeek = followUpSummaryLane?.followUpSummary?.due_this_week ?? 0;
  const overdueTasks = taskSummaryLane?.taskSummary?.overdue ?? 0;
  const tasksDueToday = taskSummaryLane?.taskSummary?.due_today ?? 0;
  const tasksDueThisWeek = taskSummaryLane?.taskSummary?.due_this_week ?? 0;
  const savedQueueEntries = useMemo(
    () => savedQueueViews.slice(0, MAX_SAVED_QUEUE_ENTRIES).map(toSavedQueueEntry),
    [savedQueueViews]
  );

  useEffect(() => {
    let cancelled = false;

    if (!loadSavedQueues || !isAuthenticated) {
      setSavedQueueViews([]);
      return undefined;
    }

    const loadSavedQueueViews = async () => {
      try {
        const views = await queueViewsApiClient.listQueueViews('workbench');
        if (!cancelled) {
          setSavedQueueViews(views);
        }
      } catch {
        if (!cancelled) {
          setSavedQueueViews([]);
        }
      }
    };

    const timeoutId = window.setTimeout(
      () => {
        void loadSavedQueueViews();
      },
      Math.max(0, savedQueueLoadDelayMs)
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isAuthenticated, loadSavedQueues, savedQueueLoadDelayMs]);

  return (
    <section className={workbenchPanelClassName}>
      <WorkbenchPanelHeader
        title="Focus Queue"
        description="Triage overdue work first, then clear the tasks and follow-ups due this week."
      />

      {savedQueueEntries.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {savedQueueEntries.map((entry) => (
            <Link key={entry.id} to={entry.href} className={workbenchInteractiveCardClassName}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                Saved queue
              </p>
              <p className="mt-2 text-base font-bold text-app-text-heading">{entry.name}</p>
              <p className="mt-2 text-sm leading-5 text-app-text-muted">{entry.description}</p>
              <p className="mt-3 text-sm font-semibold text-app-accent">{entry.cta} →</p>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <FocusCard
          label="Cases"
          value={String(urgentCasesCount)}
          detail={`${overdueCasesCount} overdue and ${casesDueThisWeekCount} due this week.`}
          href="/cases?quick_filter=urgent"
          cta="Review urgent cases"
        />
        <FocusCard
          label="Follow-ups"
          value={String(followUpsDueToday)}
          detail={`${followUpsDueThisWeek} follow-ups are due over the next seven days.`}
          href="/follow-ups"
          cta="Open follow-ups"
        />
        <FocusCard
          label="Tasks"
          value={String(tasksDueToday)}
          detail={`${overdueTasks} overdue and ${tasksDueThisWeek} due this week.`}
          href="/tasks"
          cta="Open tasks"
        />
      </div>
    </section>
  );
}
