import {
  useDashboardCaseSummary,
  useDashboardFollowUpSummary,
  useDashboardTaskSummary,
} from '../../context/DashboardDataContext';
import {
  FocusCard,
  WorkbenchPanelHeader,
  workbenchPanelClassName,
} from './WorkbenchPanelPrimitives';

export default function FocusQueuePanel() {
  const caseSummaryLane = useDashboardCaseSummary();
  const followUpSummaryLane = useDashboardFollowUpSummary();
  const taskSummaryLane = useDashboardTaskSummary();

  const urgentCasesCount = caseSummaryLane?.caseSummary?.by_priority.urgent ?? 0;
  const overdueCasesCount = caseSummaryLane?.caseSummary?.overdue_cases ?? 0;
  const casesDueThisWeekCount = caseSummaryLane?.caseSummary?.cases_due_this_week ?? 0;
  const followUpsDueToday = followUpSummaryLane?.followUpSummary?.due_today ?? 0;
  const followUpsDueThisWeek = followUpSummaryLane?.followUpSummary?.due_this_week ?? 0;
  const overdueTasks = taskSummaryLane?.taskSummary?.overdue ?? 0;
  const tasksDueToday = taskSummaryLane?.taskSummary?.due_today ?? 0;
  const tasksDueThisWeek = taskSummaryLane?.taskSummary?.due_this_week ?? 0;

  return (
    <section className={workbenchPanelClassName}>
      <WorkbenchPanelHeader
        title="Focus Queue"
        description="Triage overdue work first, then clear the tasks and follow-ups due this week."
      />

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
