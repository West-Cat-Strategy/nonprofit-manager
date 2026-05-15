import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PresentationChartLineIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  SecondaryButton,
} from '../../../components/ui';
import { classNames } from '../../../components/ui/classNames';
import { useAppSelector } from '../../../store/hooks';
import { getReportAccess } from '../../auth/state/reportAccess';
import { dashboardApiClient, type DashboardWorkqueueSummaryCard } from '../../dashboard/api/dashboardApiClient';
import { savedReportsApiClient } from '../../savedReports/api/savedReportsApiClient';
import type { SavedReportListItem } from '../../savedReports/types/contracts';
import { scheduledReportsApiClient } from '../../scheduledReports/api/scheduledReportsApiClient';
import type { ScheduledReport } from '../../scheduledReports/types/contracts';
import type { ReportTemplate } from '../../../types/reportTemplate';
import { reportsApiClient } from '../api/reportsApiClient';
import type { WorkflowCoverageReportResult } from '../types/contracts';
import { templateMatchesTag } from '../reportTemplateFilters';

type PacketErrorKey =
  | 'savedReports'
  | 'scheduledReports'
  | 'templates'
  | 'dashboard'
  | 'workflowCoverage';

type PacketErrorMap = Partial<Record<PacketErrorKey, string>>;

interface BoardPacketWorkspaceState {
  savedReports: SavedReportListItem[];
  scheduledReports: ScheduledReport[];
  templates: ReportTemplate[];
  workqueueSummaries: DashboardWorkqueueSummaryCard[];
  workflowCoverage: WorkflowCoverageReportResult | null;
}

const initialState: BoardPacketWorkspaceState = {
  savedReports: [],
  scheduledReports: [],
  templates: [],
  workqueueSummaries: [],
  workflowCoverage: null,
};

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Not scheduled';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getReportDefinitionName = (report: SavedReportListItem) => {
  if ('report_definition' in report && report.report_definition?.name) {
    return report.report_definition.name;
  }

  return report.name;
};

const getSavedReportTags = (report: SavedReportListItem): string[] => {
  if ('report_definition' in report && report.report_definition) {
    const maybeTags = (report.report_definition as { tags?: unknown }).tags;
    return Array.isArray(maybeTags)
      ? maybeTags.filter((tag): tag is string => typeof tag === 'string')
      : [];
  }

  return [];
};

const isBoardReadySavedReport = (report: SavedReportListItem) => {
  const haystack = [
    report.name,
    report.description,
    report.entity,
    getReportDefinitionName(report),
    ...getSavedReportTags(report),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return ['board', 'executive', 'packet', 'governance'].some((term) => haystack.includes(term));
};

const errorMessages: Record<PacketErrorKey, string> = {
  savedReports: 'Saved report summaries could not be loaded.',
  scheduledReports: 'Scheduled reports could not be loaded.',
  templates: 'Board-pack templates could not be loaded.',
  dashboard: 'Dashboard summaries could not be loaded.',
  workflowCoverage: 'Corrective-action follow-up could not be loaded.',
};

function useBoardPacketWorkspace() {
  const user = useAppSelector((state) => state.auth.user);
  const access = getReportAccess(user);
  const canReadReports = access.canViewReports || access.canManageReports;
  const canReadScheduledReports =
    access.canViewScheduledReports || access.canManageScheduledReports;
  const [state, setState] = useState<BoardPacketWorkspaceState>(initialState);
  const [errors, setErrors] = useState<PacketErrorMap>({});
  const [loading, setLoading] = useState(true);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setErrors({});

    const nextState: BoardPacketWorkspaceState = { ...initialState };
    const nextErrors: PacketErrorMap = {};

    const [
      savedReportsResult,
      scheduledReportsResult,
      templatesResult,
      dashboardResult,
      workflowCoverageResult,
    ] = await Promise.allSettled([
      canReadReports
        ? savedReportsApiClient.fetchSavedReports({ limit: 25, summary: true })
        : Promise.resolve({ items: [], pagination: { page: 1, limit: 25, total: 0, total_pages: 0 } }),
      canReadScheduledReports
        ? scheduledReportsApiClient.fetchScheduledReports()
        : Promise.resolve([]),
      canReadReports ? reportsApiClient.listTemplates() : Promise.resolve([]),
      dashboardApiClient.fetchWorkqueueSummary(),
      canReadReports
        ? reportsApiClient.fetchWorkflowCoverageReport()
        : Promise.resolve(null),
    ]);

    if (savedReportsResult.status === 'fulfilled') {
      nextState.savedReports = savedReportsResult.value.items;
    } else if (canReadReports) {
      nextErrors.savedReports = errorMessages.savedReports;
    }

    if (scheduledReportsResult.status === 'fulfilled') {
      nextState.scheduledReports = scheduledReportsResult.value;
    } else if (canReadScheduledReports) {
      nextErrors.scheduledReports = errorMessages.scheduledReports;
    }

    if (templatesResult.status === 'fulfilled') {
      nextState.templates = templatesResult.value as ReportTemplate[];
    } else if (canReadReports) {
      nextErrors.templates = errorMessages.templates;
    }

    if (dashboardResult.status === 'fulfilled') {
      nextState.workqueueSummaries = dashboardResult.value;
    } else {
      nextErrors.dashboard = errorMessages.dashboard;
    }

    if (workflowCoverageResult.status === 'fulfilled') {
      nextState.workflowCoverage = workflowCoverageResult.value;
    } else if (canReadReports) {
      nextErrors.workflowCoverage = errorMessages.workflowCoverage;
    }

    setState(nextState);
    setErrors(nextErrors);
    setLoading(false);
  }, [canReadReports, canReadScheduledReports]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  return {
    ...state,
    access,
    canReadReports,
    canReadScheduledReports,
    errors,
    hasErrors: Object.keys(errors).length > 0,
    loading,
    loadWorkspace,
  };
}

const MetricTile = ({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: 'neutral' | 'attention';
}) => (
  <div
    className={classNames(
      'rounded-[var(--ui-radius-sm)] border bg-app-surface p-4',
      tone === 'attention' ? 'border-amber-300' : 'border-app-border'
    )}
  >
    <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
      {label}
    </div>
    <div className="mt-2 text-2xl font-semibold text-app-text-heading">{value}</div>
    <p className="mt-1 text-sm text-app-text-muted">{detail}</p>
  </div>
);

const SectionHeading = ({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof PresentationChartLineIcon;
  title: string;
  action?: ReactNode;
}) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
    <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-app-text-heading">
      <Icon className="h-5 w-5 text-app-accent" aria-hidden="true" />
      {title}
    </h2>
    {action}
  </div>
);

export default function BoardPacketWorkspacePage() {
  const {
    canReadReports,
    canReadScheduledReports,
    errors,
    hasErrors,
    loading,
    loadWorkspace,
    savedReports,
    scheduledReports,
    templates,
    workqueueSummaries,
    workflowCoverage,
  } = useBoardPacketWorkspace();

  const boardTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          templateMatchesTag(template, 'board-pack') ||
          templateMatchesTag(template, 'executive') ||
          templateMatchesTag(template, 'board')
      ),
    [templates]
  );

  const boardReadyReports = useMemo(
    () => savedReports.filter(isBoardReadySavedReport),
    [savedReports]
  );

  const publicSnapshots = useMemo(
    () => savedReports.filter((report) => report.is_public || Boolean(report.public_token)),
    [savedReports]
  );

  const activeSchedules = scheduledReports.filter((report) => report.is_active);
  const schedulesWithErrors = scheduledReports.filter((report) => report.last_error);
  const totalWorkqueueItems = workqueueSummaries.reduce((total, summary) => total + summary.count, 0);
  const totalGaps = workflowCoverage?.summary.totalGaps ?? 0;
  const casesWithGaps = workflowCoverage?.summary.casesWithGaps ?? 0;

  const hasAnyPacketInputs =
    savedReports.length > 0 ||
    scheduledReports.length > 0 ||
    boardTemplates.length > 0 ||
    workqueueSummaries.length > 0 ||
    totalGaps > 0;

  return (
    <NeoBrutalistLayout pageTitle="BOARD PACKET WORKSPACE">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Board Packet Workspace"
          description="Assemble a read-only leadership packet from reports, delivery schedules, dashboard summaries, public snapshots, and follow-up gaps already tracked in the app."
          actions={
            <SecondaryButton
              leadingIcon={<ArrowPathIcon className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void loadWorkspace()}
            >
              Refresh
            </SecondaryButton>
          }
        />

        {loading && <LoadingState label="Loading board packet workspace..." />}

        {!loading && hasErrors && (
          <ErrorState
            message={Object.values(errors).join(' ')}
            retryLabel="Retry packet refresh"
            onRetry={() => void loadWorkspace()}
          />
        )}

        {!loading && !hasAnyPacketInputs && !hasErrors && (
          <EmptyState
            title="No packet inputs yet"
            description="Saved reports, schedules, public snapshots, dashboard summaries, and workflow coverage will appear here once available."
            action={
              canReadReports ? (
                <Link
                  className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-[var(--app-accent)] bg-[var(--app-accent)] px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm hover:border-[var(--app-accent-hover)] hover:bg-[var(--app-accent-hover)]"
                  to="/reports/templates?tag=board-pack"
                >
                  Open Board-Pack Templates
                </Link>
              ) : undefined
            }
          />
        )}

        {!loading && hasAnyPacketInputs && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Saved packet inputs"
                value={formatNumber(boardReadyReports.length || savedReports.length)}
                detail={
                  boardReadyReports.length > 0
                    ? 'Board-ready saved reports detected'
                    : 'Saved reports available for packet assembly'
                }
              />
              <MetricTile
                label="Scheduled delivery"
                value={formatNumber(activeSchedules.length)}
                detail={`${formatNumber(scheduledReports.length)} recurring report schedules visible`}
                tone={schedulesWithErrors.length > 0 ? 'attention' : 'neutral'}
              />
              <MetricTile
                label="Public snapshots"
                value={formatNumber(publicSnapshots.length)}
                detail="Saved reports with public snapshot links"
              />
              <MetricTile
                label="Follow-up gaps"
                value={formatNumber(totalGaps)}
                detail={`${formatNumber(casesWithGaps)} cases need corrective-action review`}
                tone={totalGaps > 0 ? 'attention' : 'neutral'}
              />
            </div>

            <SectionCard
              title="Packet Assembly"
              subtitle="Use the existing report routes to review packet contents without creating new governance records."
            >
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface p-4">
                  <SectionHeading
                    icon={PresentationChartLineIcon}
                    title="Board-Pack Templates"
                    action={
                      canReadReports ? (
                        <Link
                          className="text-sm font-semibold text-app-accent hover:text-app-accent-hover"
                          to="/reports/templates?tag=board-pack"
                        >
                          Open templates
                        </Link>
                      ) : null
                    }
                  />
                  <div className="space-y-2">
                    {boardTemplates.slice(0, 4).map((template) => (
                      <div
                        key={template.id}
                        className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-3 py-2"
                      >
                        <div className="font-semibold text-app-text-heading">{template.name}</div>
                        <p className="text-sm text-app-text-muted">{template.description}</p>
                      </div>
                    ))}
                    {boardTemplates.length === 0 && (
                      <p className="text-sm text-app-text-muted">
                        No board-pack templates are visible to this user.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface p-4">
                  <SectionHeading
                    icon={DocumentChartBarIcon}
                    title="Saved Reports"
                    action={
                      canReadReports ? (
                        <Link
                          className="text-sm font-semibold text-app-accent hover:text-app-accent-hover"
                          to="/reports/saved"
                        >
                          Open saved
                        </Link>
                      ) : null
                    }
                  />
                  <div className="space-y-2">
                    {(boardReadyReports.length > 0 ? boardReadyReports : savedReports)
                      .slice(0, 4)
                      .map((report) => (
                        <div
                          key={report.id}
                          className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-3 py-2"
                        >
                          <div className="font-semibold text-app-text-heading">{report.name}</div>
                          <p className="text-sm text-app-text-muted">
                            {report.entity} · Updated {formatDateTime(report.updated_at)}
                          </p>
                        </div>
                      ))}
                    {savedReports.length === 0 && (
                      <p className="text-sm text-app-text-muted">
                        No saved report definitions are visible to this user.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface p-4">
                  <SectionHeading
                    icon={CalendarDaysIcon}
                    title="Scheduled Reports"
                    action={
                      canReadScheduledReports ? (
                        <Link
                          className="text-sm font-semibold text-app-accent hover:text-app-accent-hover"
                          to="/reports/scheduled"
                        >
                          Open schedules
                        </Link>
                      ) : null
                    }
                  />
                  <div className="space-y-2">
                    {scheduledReports.slice(0, 4).map((report) => (
                      <div
                        key={report.id}
                        className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-app-text-heading">{report.name}</span>
                          <span
                            className={classNames(
                              'rounded-full border px-2 py-0.5 text-xs font-semibold',
                              report.is_active
                                ? 'border-emerald-300 text-emerald-700'
                                : 'border-app-border text-app-text-muted'
                            )}
                          >
                            {report.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-sm text-app-text-muted">
                          Next run {formatDateTime(report.next_run_at)}
                        </p>
                        {report.last_error && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            Last run needs review
                          </p>
                        )}
                      </div>
                    ))}
                    {scheduledReports.length === 0 && (
                      <p className="text-sm text-app-text-muted">
                        No scheduled report delivery is visible to this user.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Read-Only Oversight"
              subtitle="Highlight current dashboard cues, public snapshots, and corrective-action follow-up for the packet."
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface p-4">
                  <SectionHeading icon={Squares2X2Icon} title="Dashboard Summaries" />
                  <div className="space-y-2">
                    {workqueueSummaries.map((summary) => (
                      <Link
                        key={summary.id}
                        className="block rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-3 py-2 hover:border-app-accent"
                        to={summary.primaryAction.href}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-app-text-heading">{summary.label}</span>
                          <span className="text-lg font-semibold text-app-text-heading">
                            {formatNumber(summary.count)}
                          </span>
                        </div>
                        <p className="text-sm text-app-text-muted">{summary.detail}</p>
                      </Link>
                    ))}
                    {workqueueSummaries.length === 0 && (
                      <p className="text-sm text-app-text-muted">
                        No dashboard workqueue summaries are visible right now.
                      </p>
                    )}
                    {totalWorkqueueItems > 0 && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                        {formatNumber(totalWorkqueueItems)} dashboard items in packet view
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface p-4">
                  <SectionHeading icon={LinkIcon} title="Public Snapshots" />
                  <div className="space-y-2">
                    {publicSnapshots.slice(0, 4).map((report) => (
                      <div
                        key={report.id}
                        className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-3 py-2"
                      >
                        <div className="font-semibold text-app-text-heading">{report.name}</div>
                        <p className="text-sm text-app-text-muted">
                          Snapshot link {report.public_token ? 'available' : 'enabled'}
                        </p>
                      </div>
                    ))}
                    {publicSnapshots.length === 0 && (
                      <p className="text-sm text-app-text-muted">
                        No public report snapshots are currently attached to saved reports.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface p-4">
                  <SectionHeading
                    icon={ClipboardDocumentCheckIcon}
                    title="Corrective Follow-Up"
                    action={
                      canReadReports ? (
                        <Link
                          className="text-sm font-semibold text-app-accent hover:text-app-accent-hover"
                          to="/reports/workflow-coverage"
                        >
                          Open coverage
                        </Link>
                      ) : null
                    }
                  />
                  <div className="space-y-2">
                    <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-3 py-2">
                      <div className="font-semibold text-app-text-heading">
                        {formatNumber(totalGaps)} workflow coverage gaps
                      </div>
                      <p className="text-sm text-app-text-muted">
                        {formatNumber(casesWithGaps)} cases need note, outcome, reminder, attendance, or status follow-up.
                      </p>
                    </div>
                    {workflowCoverage?.items.slice(0, 3).map((item) => (
                      <Link
                        key={item.caseId}
                        className="block rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-3 py-2 hover:border-app-accent"
                        to={`/cases/${item.caseId}`}
                      >
                        <div className="font-semibold text-app-text-heading">
                          {item.caseNumber} · {item.caseTitle}
                        </div>
                        <p className="text-sm text-app-text-muted">
                          {formatNumber(item.totalGaps)} gaps · {item.assignedToName || 'Unassigned'}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </NeoBrutalistLayout>
  );
}
