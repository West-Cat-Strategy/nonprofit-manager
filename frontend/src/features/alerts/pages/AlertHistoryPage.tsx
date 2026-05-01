import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchAlertInstances, fetchAlertStats } from '../state';
import type { AlertInstance, AlertSeverity } from '../types';
import { getAlertMetricLabel, getAlertSeverityClasses } from '../alertOptions';
import { AlertSummaryCards, AlertsSectionTabs } from '../components';
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatCard,
} from '../../../components/ui';

type AlertHistoryRow = {
  id: string;
  alertName: string;
  metricLabel: string;
  severity: AlertSeverity;
  triggeredCount: number;
  openCount: number;
  lastTriggered: string;
  averageResolutionLabel: string;
};

const formatTimestamp = (value: string): string =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatResolutionWindow = (minutes: number | null): string => {
  if (minutes === null) {
    return 'No resolved incidents yet';
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  return `${(minutes / 60).toFixed(1)} hr`;
};

const averageResolutionMinutes = (instances: AlertInstance[]): number | null => {
  const resolvedDurations = instances
    .filter((instance) => instance.resolved_at)
    .map((instance) => {
      const resolvedAt = new Date(instance.resolved_at as string).getTime();
      const triggeredAt = new Date(instance.triggered_at).getTime();
      return (resolvedAt - triggeredAt) / 60000;
    })
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (resolvedDurations.length === 0) {
    return null;
  }

  return resolvedDurations.reduce((sum, value) => sum + value, 0) / resolvedDurations.length;
};

const getAlertInstanceStatus = (row: AlertInstance): string => {
  if (row.status === 'resolved') {
    return 'Resolved';
  }

  return row.acknowledged_at ? 'Reviewed' : 'Needs review';
};

export default function AlertHistoryPage() {
  const dispatch = useAppDispatch();
  const { instances, stats, loading, error } = useAppSelector((state) => state.alerts);

  useEffect(() => {
    void dispatch(fetchAlertInstances({ limit: 100 }));
    void dispatch(fetchAlertStats());
  }, [dispatch]);

  const historyRows = useMemo<AlertHistoryRow[]>(() => {
    const grouped = new Map<string, AlertInstance[]>();

    for (const instance of instances) {
      const key = instance.alert_config_id || instance.alert_name;
      const bucket = grouped.get(key) ?? [];
      bucket.push(instance);
      grouped.set(key, bucket);
    }

    return Array.from(grouped.entries())
      .map(([key, groupedInstances]) => {
        const sorted = [...groupedInstances].sort(
          (left, right) =>
            new Date(right.triggered_at).getTime() - new Date(left.triggered_at).getTime()
        );
        const latest = sorted[0];

        return {
          id: key,
          alertName: latest?.alert_name || 'Unnamed alert',
          metricLabel: latest ? getAlertMetricLabel(latest.metric_type) : 'Unknown',
          severity: latest?.severity || 'low',
          triggeredCount: groupedInstances.length,
          openCount: groupedInstances.filter((instance) => instance.status !== 'resolved').length,
          lastTriggered: latest?.triggered_at || '',
          averageResolutionLabel: formatResolutionWindow(
            averageResolutionMinutes(groupedInstances)
          ),
        };
      })
      .sort((left, right) => {
        return new Date(right.lastTriggered).getTime() - new Date(left.lastTriggered).getTime();
      });
  }, [instances]);

  const recentInstances = useMemo(
    () =>
      [...instances]
        .sort(
          (left, right) =>
            new Date(right.triggered_at).getTime() - new Date(left.triggered_at).getTime()
        )
        .slice(0, 8),
    [instances]
  );

  const averageResolutionAcrossAll = useMemo(
    () => formatResolutionWindow(averageResolutionMinutes(instances)),
    [instances]
  );

  const openIncidentCount = useMemo(
    () => instances.filter((instance) => instance.status !== 'resolved').length,
    [instances]
  );

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/alerts/instances"
        className="inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border px-4 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
      >
        <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
        Active alerts
      </Link>
      <Link
        to="/alerts"
        className="inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-app-accent-hover hover:border-app-accent-hover"
      >
        <ClockIcon className="h-4 w-4" aria-hidden="true" />
        Alert rules
      </Link>
    </div>
  );

  const historyColumns = [
    {
      key: 'alertName',
      label: 'Alert',
      render: (row: AlertHistoryRow) => (
        <div className="space-y-1">
          <div className="font-semibold text-app-text">{row.alertName}</div>
          <div className="text-xs text-app-text-muted">{row.metricLabel}</div>
        </div>
      ),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (row: AlertHistoryRow) => (
        <span
          className={`rounded px-2 py-1 text-xs font-medium capitalize ${getAlertSeverityClasses(row.severity)}`}
        >
          {row.severity}
        </span>
      ),
    },
    {
      key: 'triggeredCount',
      label: 'Triggers',
      render: (row: AlertHistoryRow) => row.triggeredCount,
    },
    {
      key: 'openCount',
      label: 'Open',
      render: (row: AlertHistoryRow) => row.openCount,
    },
    {
      key: 'lastTriggered',
      label: 'Last triggered',
      render: (row: AlertHistoryRow) =>
        row.lastTriggered ? formatTimestamp(row.lastTriggered) : 'No activity',
    },
    {
      key: 'averageResolutionLabel',
      label: 'Avg. resolution',
      render: (row: AlertHistoryRow) => row.averageResolutionLabel,
    },
  ];

  const recentColumns = [
    {
      key: 'alert_name',
      label: 'Recent Activity',
      render: (row: AlertInstance) => (
        <div className="space-y-1">
          <div className="font-semibold text-app-text">{row.alert_name}</div>
          <div className="text-xs text-app-text-muted">{row.message}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: AlertInstance) => (
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
            row.status === 'resolved'
              ? 'bg-app-surface-muted text-app-text-muted'
              : 'bg-app-accent-soft text-app-accent-text'
          }`}
        >
          {row.status === 'resolved' ? (
            <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ExclamationCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {getAlertInstanceStatus(row)}
        </span>
      ),
    },
    {
      key: 'triggered_at',
      label: 'Triggered',
      render: (row: AlertInstance) => formatTimestamp(row.triggered_at),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert history"
        description="Review past alert activity, watch for noisy rules, and decide which alert rules need tuning."
        actions={actions}
      />

      <AlertsSectionTabs />
      <AlertSummaryCards stats={stats} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Alert rules" value={historyRows.length} />
        <StatCard label="Logged alerts" value={instances.length} />
        <StatCard label="Active alerts" value={openIncidentCount} />
        <StatCard label="Average resolution" value={averageResolutionAcrossAll} />
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            void dispatch(fetchAlertInstances({ limit: 100 }));
          }}
        />
      ) : null}

      <SectionCard
        title="Rule history"
        subtitle="This view groups recent alert instances by rule so you can spot noisy thresholds and slow resolution patterns."
      >
        {loading && historyRows.length === 0 ? (
          <LoadingState label="Loading alert history..." />
        ) : historyRows.length > 0 ? (
          <DataTable
            rows={historyRows}
            columns={historyColumns}
            rowKey={(row) => row.id}
            emptyLabel="No alert history available."
          />
        ) : (
          <EmptyState
            title="No alert history yet"
            description="Triggered alerts will appear here once rules start firing."
            action={
              <Link
                to="/alerts"
                className="inline-flex items-center rounded-[var(--ui-radius-sm)] border border-app-border px-3 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
              >
                Configure your first alert
              </Link>
            }
          />
        )}
      </SectionCard>

      <SectionCard
        title="Recent activity"
        subtitle="A recent timeline of alert activity across all configured rules."
      >
        {recentInstances.length > 0 ? (
          <DataTable
            rows={recentInstances}
            columns={recentColumns}
            rowKey={(row) => row.id}
            emptyLabel="No recent alert activity."
          />
        ) : (
          <EmptyState
            title="Nothing to review"
            description="Once alerts trigger, the latest activity will be listed here."
          />
        )}
      </SectionCard>
    </div>
  );
}
