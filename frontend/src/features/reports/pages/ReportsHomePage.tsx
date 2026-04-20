import { Link } from 'react-router-dom';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { PageHeader, SectionCard } from '../../../components/ui';
import { classNames } from '../../../components/ui/classNames';
import { useAppSelector } from '../../../store/hooks';
import { getReportAccess } from '../../auth/state/reportAccess';

type ReportsHomeAction = {
  label: string;
  summary: string;
  to: string;
  tone: 'primary' | 'secondary';
  isAvailable: (access: ReturnType<typeof getReportAccess>) => boolean;
};

type ReportsHomeCard = {
  persona: string;
  title: string;
  summary: string;
  checkpoints: string[];
  actions: ReportsHomeAction[];
};

const actionClassName = (tone: ReportsHomeAction['tone']) =>
  classNames(
    'inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border px-4 py-2 text-sm font-semibold shadow-sm',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]',
    tone === 'primary'
      ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-accent-foreground)] hover:bg-[var(--app-accent-hover)] hover:border-[var(--app-accent-hover)]'
      : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-hover)]'
  );

const permissionHighlights = (access: ReturnType<typeof getReportAccess>) =>
  [
    access.canManageReports ? 'builder + template access' : null,
    access.canViewReports || access.canManageReports ? 'saved report visibility' : null,
    access.canManageScheduledReports
      ? 'schedule management'
      : access.canViewScheduledReports
        ? 'schedule visibility'
        : null,
  ].filter(Boolean);

const workflowCards: ReportsHomeCard[] = [
  {
    persona: 'Executive workflow',
    title: 'Executive + Board Pack',
    summary:
      'Start from board-ready templates, reopen the last saved packet, and tighten one-off leadership asks without hunting through the entire reports surface.',
    checkpoints: [
      'Board-pack templates for recurring leadership reviews',
      'Saved definitions for quick reruns before meetings',
      'Builder access for last-minute narrative or metric adjustments',
    ],
    actions: [
      {
        label: 'Board Pack Templates',
        summary: 'Open templates tagged for board-ready reporting packs.',
        to: '/reports/templates?tag=board-pack',
        tone: 'primary',
        isAvailable: (access) => access.canManageReports,
      },
      {
        label: 'Saved Reports',
        summary: 'Resume the latest leadership-ready definitions and reruns.',
        to: '/reports/saved',
        tone: 'secondary',
        isAvailable: (access) => access.canViewReports || access.canManageReports,
      },
      {
        label: 'Open Builder',
        summary: 'Draft a custom board packet variation from scratch.',
        to: '/reports/builder',
        tone: 'secondary',
        isAvailable: (access) => access.canManageReports,
      },
    ],
  },
  {
    persona: 'Operations workflow',
    title: 'Admin Reporting Reliability',
    summary:
      'Keep recurring delivery trustworthy by pairing saved definitions with schedule oversight and workflow gap monitoring.',
    checkpoints: [
      'Scheduled deliveries and recent run oversight',
      'Workflow coverage follow-through for missing notes, outcomes, or reminders',
      'Saved report definitions that feed the recurring schedules',
    ],
    actions: [
      {
        label: 'Scheduled Reports',
        summary: 'Inspect recurring delivery, recipients, and recent runs.',
        to: '/reports/scheduled',
        tone: 'primary',
        isAvailable: (access) =>
          access.canViewScheduledReports || access.canManageScheduledReports,
      },
      {
        label: 'Workflow Coverage',
        summary: 'Check cases with reporting workflow gaps before the next run.',
        to: '/reports/workflow-coverage',
        tone: 'secondary',
        isAvailable: (access) => access.canViewReports || access.canManageReports,
      },
      {
        label: 'Saved Reports',
        summary: 'Review which saved definitions should stay wired into schedules.',
        to: '/reports/saved',
        tone: 'secondary',
        isAvailable: (access) => access.canViewReports || access.canManageReports,
      },
    ],
  },
  {
    persona: 'Fundraising workflow',
    title: 'Fundraising Cadence',
    summary:
      'Use stewardship-oriented templates and custom builder access to keep pipeline reviews, campaign updates, and recurring donor check-ins moving on time.',
    checkpoints: [
      'Fundraising templates filtered for cadence-focused reporting',
      'Saved pipeline snapshots ready for weekly check-ins',
      'Builder access when campaign questions change mid-cycle',
    ],
    actions: [
      {
        label: 'Fundraising Templates',
        summary: 'Prefilter to fundraising cadence templates before building.',
        to: '/reports/templates?category=fundraising&tag=fundraising-cadence',
        tone: 'primary',
        isAvailable: (access) => access.canManageReports,
      },
      {
        label: 'Saved Reports',
        summary: 'Open the latest stewardship and pipeline reporting definitions.',
        to: '/reports/saved',
        tone: 'secondary',
        isAvailable: (access) => access.canViewReports || access.canManageReports,
      },
      {
        label: 'Open Builder',
        summary: 'Create an adjusted fundraising cadence report on demand.',
        to: '/reports/builder',
        tone: 'secondary',
        isAvailable: (access) => access.canManageReports,
      },
    ],
  },
];

export default function ReportsHomePage() {
  const user = useAppSelector((state) => state.auth.user);
  const access = getReportAccess(user);
  const activePermissionHighlights = permissionHighlights(access);

  return (
    <NeoBrutalistLayout pageTitle="REPORTS HOME">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Reports Home"
          description="Choose the reporting workflow that matches the persona, meeting rhythm, or reliability follow-through you need right now."
          badge={
            activePermissionHighlights.length > 0 ? (
              <span className="inline-flex items-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                Available now: {activePermissionHighlights.join(' / ')}
              </span>
            ) : undefined
          }
        />

        <SectionCard
          title="Workflow picks"
          subtitle="These cards stay inside the existing reports routes so the lead can wire this page in without changing downstream behavior."
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {workflowCards.map((card) => {
              const availableActions = card.actions.filter((action) => action.isAvailable(access));
              return (
                <article
                  key={card.title}
                  className="flex h-full flex-col rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-4"
                >
                  <div className="space-y-3">
                    <div className="inline-flex items-center rounded-full border border-app-border bg-app-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                      {card.persona}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-app-text-heading">{card.title}</h2>
                      <p className="mt-2 text-sm text-app-text-muted">{card.summary}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-app-text">
                    {card.checkpoints.map((checkpoint) => (
                      <p
                        key={checkpoint}
                        className="rounded-[var(--ui-radius-sm)] border border-dashed border-app-border bg-app-surface px-3 py-2"
                      >
                        {checkpoint}
                      </p>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2">
                    {availableActions.length > 0 ? (
                      availableActions.map((action) => (
                        <div key={action.label} className="space-y-1">
                          <Link className={actionClassName(action.tone)} to={action.to}>
                            {action.label}
                          </Link>
                          <p className="text-xs text-app-text-muted">{action.summary}</p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-muted">
                        This workflow needs routes that are outside your current report permissions.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </NeoBrutalistLayout>
  );
}
