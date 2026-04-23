import { Link } from 'react-router-dom';
import {
  useDashboardAssignedCases,
  useDashboardCaseSummary,
  useDashboardTaskSummary,
} from '../../context/DashboardDataContext';
import {
  SummaryMetric,
  WorkbenchPanelHeader,
  workbenchActionClassName,
} from './WorkbenchPanelPrimitives';

interface WorkspaceSummaryPanelProps {
  pinnedWorkstreamsCount: number;
  activeSectionCount: number;
}

export default function WorkspaceSummaryPanel({
  pinnedWorkstreamsCount,
  activeSectionCount,
}: WorkspaceSummaryPanelProps) {
  const caseSummaryLane = useDashboardCaseSummary();
  const taskSummaryLane = useDashboardTaskSummary();
  const assignedCasesLane = useDashboardAssignedCases();

  const urgentCasesCount = caseSummaryLane?.caseSummary?.by_priority.urgent ?? 0;
  const tasksDueTodayCount = taskSummaryLane?.taskSummary?.due_today ?? 0;
  const assignedCasesCount = assignedCasesLane?.assignedCasesTotal ?? 0;

  return (
    <section className="mt-6 rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm">
      <WorkbenchPanelHeader
        title="Workspace Summary"
        description="A fast pulse on the shortcuts you rely on and the workload already waiting behind them."
        action={
          <Link to="/settings/navigation" className={workbenchActionClassName}>
            Tune shortcuts
          </Link>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Pinned"
          value={String(pinnedWorkstreamsCount)}
          description="Shortcut slots currently in use."
        />
        <SummaryMetric
          label="Urgent Cases"
          value={String(urgentCasesCount)}
          description="Case work flagged as urgent or critical."
        />
        <SummaryMetric
          label="Tasks Today"
          value={String(tasksDueTodayCount)}
          description="Tasks currently due today."
        />
        <SummaryMetric
          label="Assigned"
          value={String(assignedCasesCount)}
          description={`${activeSectionCount} sections are enabled across your workspace.`}
        />
      </div>
    </section>
  );
}
