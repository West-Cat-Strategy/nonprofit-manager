import { Link } from 'react-router-dom';
import {
  useDashboardAssignedCases,
  useDashboardUpcomingFollowUps,
} from '../../context/DashboardDataContext';
import {
  formatDueLabel,
  formatWorkbenchDate,
  getFollowUpEntityLabel,
} from './workbenchUtils';
import {
  WorkbenchPanelHeader,
  workbenchActionClassName,
  workbenchPanelClassName,
} from './WorkbenchPanelPrimitives';

export default function MyWorkPanel() {
  const assignedCasesLane = useDashboardAssignedCases();
  const upcomingFollowUpsLane = useDashboardUpcomingFollowUps();
  const cases = assignedCasesLane?.assignedCases ?? [];
  const totalCases = assignedCasesLane?.assignedCasesTotal ?? cases.length;
  const upcomingFollowUps = upcomingFollowUpsLane?.upcomingFollowUps ?? [];

  return (
    <section className={workbenchPanelClassName}>
      <WorkbenchPanelHeader
        title="My Work"
        description="Your assigned cases and the next follow-ups likely to need a touch today."
        action={
          <Link to="/cases" className={workbenchActionClassName}>
            Open case queue
          </Link>
        }
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-3">
          {cases.length > 0 ? (
            cases.map((caseItem) => (
              <Link
                key={caseItem.id}
                to={`/cases/${caseItem.id}`}
                className="block rounded-2xl border border-app-border bg-app-surface px-4 py-3 transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-text-subtle">
                      {caseItem.case_number}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-app-text-heading">
                      {caseItem.title}
                    </p>
                  </div>
                  <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-semibold text-app-accent-text">
                    {formatDueLabel(caseItem)}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-app-border bg-app-surface-muted/60 px-4 py-4 text-sm text-app-text-muted">
              No assigned cases are waiting for you right now.
            </div>
          )}

          {totalCases > cases.length ? (
            <Link className="inline-flex text-sm font-semibold text-app-accent" to="/cases?assigned_to=me">
              View all {totalCases} assigned cases →
            </Link>
          ) : null}
        </div>

        <div className="rounded-2xl border border-app-border/70 bg-app-surface px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
            Next follow-ups
          </p>
          <div className="mt-3 space-y-3">
            {upcomingFollowUps.length > 0 ? (
              upcomingFollowUps.slice(0, 3).map((followUp) => (
                <Link
                  key={followUp.id}
                  to="/follow-ups"
                  className="block rounded-2xl border border-app-border bg-app-surface-muted px-3 py-3 transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                >
                  <p className="text-sm font-semibold text-app-text-heading">{followUp.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-app-text-subtle">
                    {getFollowUpEntityLabel(followUp)}
                  </p>
                  <p className="mt-2 text-sm text-app-text-muted">
                    {formatWorkbenchDate(followUp.scheduled_date)}
                    {followUp.scheduled_time ? ` · ${followUp.scheduled_time}` : ''}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-app-text-muted">No upcoming follow-ups are scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
