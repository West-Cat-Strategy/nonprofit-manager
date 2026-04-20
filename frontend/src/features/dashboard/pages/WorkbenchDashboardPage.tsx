import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { QuickActionsWidget, QuickLookupWidget } from '../../../components/dashboard';
import { useDashboardSettings } from '../../../hooks/useDashboardSettings';
import { useNavigationPreferences, type NavigationItem } from '../../../hooks/useNavigationPreferences';
import { getRouteCatalogEntryById } from '../../../routes/routeCatalog';
import { getRouteMeta } from '../../../routes/routeMeta';
import {
  DashboardDataProvider,
  WORKBENCH_DASHBOARD_LANES,
  useDashboardAnalyticsSummary,
  useDashboardAssignedCases,
  useDashboardCaseSummary,
  useDashboardFollowUpSummary,
  useDashboardTaskSummary,
  useDashboardUpcomingFollowUps,
} from '../context/DashboardDataContext';
import DashboardViewSettingsPanel from '../components/DashboardViewSettingsPanel';
import type { FollowUpWithEntity } from '../../followUps/types/contracts';
import type { CaseWithDetails } from '../../../types/case';

type WorkbenchLink = NavigationItem & {
  sectionLabel: string;
};

interface SummaryMetricProps {
  label: string;
  value: string;
  description: string;
}

function SummaryMetric({ label, value, description }: SummaryMetricProps) {
  return (
    <div className="rounded-2xl border border-app-border/70 bg-app-surface px-4 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-subtle">{label}</p>
      <p className="mt-2 text-3xl font-black uppercase leading-none text-app-text-heading">{value}</p>
      <p className="mt-2 text-sm leading-5 text-app-text-muted">{description}</p>
    </div>
  );
}

interface WorkstreamPanelProps {
  title: string;
  description: string;
  items: WorkbenchLink[];
  emptyState: string;
  manageLabel?: string;
  manageTo?: string;
  compact?: boolean;
}

function WorkstreamPanel({
  title,
  description,
  items,
  emptyState,
  manageLabel,
  manageTo,
  compact = false,
}: WorkstreamPanelProps) {
  return (
    <section className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text-heading">{title}</h2>
          <p className="mt-1 text-sm text-app-text-muted">{description}</p>
        </div>
        {manageLabel && manageTo ? (
          <Link
            to={manageTo}
            className="inline-flex items-center rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-medium text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
          >
            {manageLabel}
          </Link>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className={`mt-5 grid gap-3 ${compact ? 'sm:grid-cols-1 lg:grid-cols-2' : 'sm:grid-cols-2'}`}>
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="group rounded-2xl border border-app-border bg-app-surface px-4 py-3 transition hover:-translate-y-0.5 hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent-soft text-lg text-app-accent-text"
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-app-text-heading">
                    {item.shortLabel ?? item.name}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-app-text-subtle">
                    {item.sectionLabel}
                  </p>
                </div>
                <span className="text-app-text-subtle transition group-hover:text-app-text" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-app-border bg-app-surface-muted/60 px-4 py-4 text-sm text-app-text-muted">
          {emptyState}
        </div>
      )}
    </section>
  );
}

interface FocusCardProps {
  label: string;
  value: string;
  detail: string;
  href: string;
  cta: string;
}

function FocusCard({ label, value, detail, href, cta }: FocusCardProps) {
  return (
    <Link
      to={href}
      className="rounded-2xl border border-app-border/70 bg-app-surface px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-subtle">{label}</p>
      <p className="mt-3 text-3xl font-black uppercase leading-none text-app-text-heading">{value}</p>
      <p className="mt-2 text-sm leading-5 text-app-text-muted">{detail}</p>
      <p className="mt-3 text-sm font-semibold text-app-accent">{cta} →</p>
    </Link>
  );
}

const formatWorkbenchCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatWorkbenchNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const formatWorkbenchDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

function formatDueLabel(caseItem: CaseWithDetails) {
  if (!caseItem.due_date) return 'No due date';
  const dueDate = new Date(caseItem.due_date);
  const diffMs = dueDate.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  return `Due ${formatWorkbenchDate(caseItem.due_date)}`;
}

function getFollowUpEntityLabel(followUp: FollowUpWithEntity) {
  if (followUp.entity_type === 'case') {
    return followUp.case_number || followUp.case_title || 'Case follow-up';
  }
  return followUp.task_subject || 'Task follow-up';
}

function FocusQueuePanel() {
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
    <section className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text-heading">Focus Queue</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Triage overdue work first, then clear the tasks and follow-ups due this week.
          </p>
        </div>
        <Link
          to="/dashboard/custom"
          className="inline-flex items-center rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-medium text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
        >
          Customize layout
        </Link>
      </div>

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

const dailyPathLinks = [
  {
    label: 'People',
    detail: 'Open the contact directory and relationship records.',
    href: '/contacts',
  },
  {
    label: 'Cases',
    detail: 'Jump into the active service queue and case detail views.',
    href: '/cases',
  },
  {
    label: 'Donations',
    detail: 'Review gifts, receipts, and fundraiser follow-through.',
    href: '/donations',
  },
  {
    label: 'Reports',
    detail: 'Open reporting templates and recurring delivery workflows.',
    href: '/reports',
  },
] as const;

function DailyPathsPanel() {
  return (
    <section className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text-heading">Daily Paths</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Fast links for the staff surfaces people use most often between queue checks.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dailyPathLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="rounded-2xl border border-app-border bg-app-surface px-4 py-4 transition hover:-translate-y-0.5 hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
          >
            <p className="text-sm font-semibold text-app-text-heading">{link.label}</p>
            <p className="mt-2 text-sm leading-5 text-app-text-muted">{link.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MyWorkPanel() {
  const assignedCasesLane = useDashboardAssignedCases();
  const upcomingFollowUpsLane = useDashboardUpcomingFollowUps();
  const cases = assignedCasesLane?.assignedCases ?? [];
  const totalCases = assignedCasesLane?.assignedCasesTotal ?? cases.length;
  const upcomingFollowUps = upcomingFollowUpsLane?.upcomingFollowUps ?? [];

  return (
    <section className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text-heading">My Work</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Your assigned cases and the next follow-ups likely to need a touch today.
          </p>
        </div>
        <Link
          to="/cases"
          className="inline-flex items-center rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-medium text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
        >
          Open case queue
        </Link>
      </div>

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
            <Link className="inline-flex text-sm font-semibold text-app-accent" to={`/cases?assigned_to=me`}>
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

function InsightStrip() {
  const analyticsSummaryLane = useDashboardAnalyticsSummary();
  const analyticsSummary = analyticsSummaryLane?.analyticsSummary;

  if (!analyticsSummary) {
    return (
      <section className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-app-text-heading">Insight Strip</h2>
        <p className="mt-2 text-sm text-app-text-muted">
          Insights will appear here after the lightweight workbench finishes loading.
        </p>
      </section>
    );
  }

  const engagedConstituents =
    analyticsSummary.engagement_distribution.high + analyticsSummary.engagement_distribution.medium;

  return (
    <section className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text-heading">Insight Strip</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Compact organization-wide signals, kept below the productivity-focused workspace blocks.
          </p>
        </div>
        <Link
          to="/analytics"
          className="inline-flex items-center rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-medium text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
        >
          Open analytics
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Donations YTD"
          value={formatWorkbenchCurrency(analyticsSummary.total_donations_ytd)}
          description={`${analyticsSummary.donation_count_ytd} gifts recorded this year.`}
        />
        <SummaryMetric
          label="Volunteer Hours"
          value={formatWorkbenchNumber(analyticsSummary.total_volunteer_hours_ytd)}
          description={`${analyticsSummary.total_volunteers} volunteers are currently rostered.`}
        />
        <SummaryMetric
          label="Events"
          value={formatWorkbenchNumber(analyticsSummary.total_events_ytd)}
          description="Events logged so far this year."
        />
        <SummaryMetric
          label="Engagement"
          value={formatWorkbenchNumber(engagedConstituents)}
          description="Constituents with high or medium engagement."
        />
      </div>
    </section>
  );
}

function WorkspaceSummaryPanel({
  pinnedWorkstreamsCount,
  activeSectionCount,
}: {
  pinnedWorkstreamsCount: number;
  activeSectionCount: number;
}) {
  const caseSummaryLane = useDashboardCaseSummary();
  const taskSummaryLane = useDashboardTaskSummary();
  const assignedCasesLane = useDashboardAssignedCases();

  const urgentCasesCount = caseSummaryLane?.caseSummary?.by_priority.urgent ?? 0;
  const tasksDueTodayCount = taskSummaryLane?.taskSummary?.due_today ?? 0;
  const assignedCasesCount = assignedCasesLane?.assignedCasesTotal ?? 0;

  return (
    <section className="mt-6 rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text-heading">Workspace Summary</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            A fast pulse on the shortcuts you rely on and the workload already waiting behind them.
          </p>
        </div>
        <Link
          to="/settings/navigation"
          className="inline-flex items-center rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-medium text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
        >
          Tune shortcuts
        </Link>
      </div>

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

function WorkbenchDashboardContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dashboardMeta = getRouteMeta('/dashboard');
  const primaryAction = dashboardMeta.primaryAction;
  const { settings, setSettings, resetSettings } = useDashboardSettings();
  const { pinnedItems, enabledItems } = useNavigationPreferences();

  const settingsOpen = searchParams.get('panel') === 'settings';

  const pinnedWorkstreams = useMemo<WorkbenchLink[]>(
    () =>
      pinnedItems.map((item) => ({
        ...item,
        sectionLabel: getRouteCatalogEntryById(item.id)?.section ?? 'Core',
      })),
    [pinnedItems]
  );

  const enabledWorkstreams = useMemo<WorkbenchLink[]>(
    () =>
      enabledItems
        .filter((item) => item.id !== 'dashboard' && !item.pinned)
        .map((item) => ({
          ...item,
          sectionLabel: getRouteCatalogEntryById(item.id)?.section ?? 'Core',
        })),
    [enabledItems]
  );

  const activeSectionCount = useMemo(
    () =>
      new Set(
        enabledItems
          .filter((item) => item.id !== 'dashboard')
          .map((item) => getRouteCatalogEntryById(item.id)?.section ?? 'Core')
      ).size,
    [enabledItems]
  );

  const toggleSettingsPanel = () => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (settingsOpen) {
      nextSearchParams.delete('panel');
    } else {
      nextSearchParams.set('panel', 'settings');
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  return (
    <NeoBrutalistLayout pageTitle="WORKBENCH">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-4 sm:px-6 sm:py-8 lg:px-8">
        <header className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-subtle">
                Staff workspace
              </p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.03em] text-app-text-heading sm:text-4xl">
                Workbench
              </h1>
              <p className="mt-3 text-sm leading-6 text-app-text-muted sm:text-base">
                Start from the work that needs attention, then jump into the modules and shortcuts you use every day.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {primaryAction ? (
                <Link
                  to={primaryAction.path}
                  className="inline-flex items-center justify-center rounded-xl border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                >
                  {primaryAction.label}
                </Link>
              ) : null}
              <Link
                to="/settings/navigation"
                className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
              >
                Manage Navigation
              </Link>
              <button
                type="button"
                onClick={toggleSettingsPanel}
                className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                aria-expanded={settingsOpen}
                aria-controls="dashboard-view-settings"
              >
                {settingsOpen ? 'Close View Settings' : 'Customize View'}
              </button>
              <Link
                to="/dashboard/custom"
                className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
              >
                Customize Layout
              </Link>
            </div>
          </div>
        </header>

        {settingsOpen ? (
          <div id="dashboard-view-settings" className="mt-6">
            <DashboardViewSettingsPanel
              settings={settings}
              onSettingsChange={setSettings}
              onReset={resetSettings}
            />
          </div>
        ) : null}

        {settings.showFocusQueue ? (
          <div className="mt-6">
            <FocusQueuePanel />
          </div>
        ) : null}

        <div className="mt-6">
          <DailyPathsPanel />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {settings.showQuickLookup ? <QuickLookupWidget className="h-full" /> : null}
          <MyWorkPanel />
        </div>

        {settings.showQuickActions ? (
          <div className="mt-6">
            <QuickActionsWidget />
          </div>
        ) : null}

        {settings.showWorkspaceSummary ? (
          <WorkspaceSummaryPanel
            pinnedWorkstreamsCount={pinnedWorkstreams.length}
            activeSectionCount={activeSectionCount}
          />
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {settings.showPinnedWorkstreams ? (
            <WorkstreamPanel
              title="Pinned Shortcuts"
              description="Routes you marked for quick access so they stay close to the focus queue."
              items={pinnedWorkstreams}
              emptyState="No shortcuts are pinned yet. Open Navigation Settings and pin the modules you revisit every day."
              manageLabel="Manage shortcuts"
              manageTo="/settings/navigation"
              compact
            />
          ) : null}

          {settings.showModules ? (
            <WorkstreamPanel
              title="Enabled Workstreams"
              description="Available staff modules pulled directly from your navigation preferences."
              items={enabledWorkstreams}
              emptyState="No additional workstreams are enabled right now. Use Navigation Settings to turn modules back on."
              manageLabel="Navigation settings"
              manageTo="/settings/navigation"
            />
          ) : null}
        </div>

        {settings.showInsightStrip ? (
          <div className="mt-6">
            <InsightStrip />
          </div>
        ) : null}
      </div>
    </NeoBrutalistLayout>
  );
}

export default function WorkbenchDashboardPage() {
  return (
    <DashboardDataProvider lanes={WORKBENCH_DASHBOARD_LANES}>
      <WorkbenchDashboardContent />
    </DashboardDataProvider>
  );
}
