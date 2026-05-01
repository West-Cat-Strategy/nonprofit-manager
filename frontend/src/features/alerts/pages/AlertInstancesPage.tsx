import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { acknowledgeAlert, fetchAlertInstances, fetchAlertStats, resolveAlert } from '../state';
import type { AlertInstance } from '../types';
import { getAlertMetricLabel, getAlertSeverityClasses } from '../alertOptions';
import { AlertSummaryCards, AlertsSectionTabs } from '../components';
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
} from '../../../components/ui';

const formatTimestamp = (value: string): string =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const getAlertInstanceStatus = (row: AlertInstance): string => {
  if (row.status === 'resolved') {
    return 'Resolved';
  }

  return row.acknowledged_at ? 'Reviewed' : 'Needs review';
};

export default function AlertInstancesPage() {
  const dispatch = useAppDispatch();
  const { actionError, instances, stats, loading, error, pendingInstanceActionIds } =
    useAppSelector((state) => state.alerts);

  useEffect(() => {
    void dispatch(fetchAlertInstances());
    void dispatch(fetchAlertStats());
  }, [dispatch]);

  const openInstances = useMemo(
    () => instances.filter((instance) => instance.status !== 'resolved'),
    [instances]
  );

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/alerts/history"
        className="inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border px-4 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
      >
        <ClockIcon className="h-4 w-4" aria-hidden="true" />
        Alert history
      </Link>
      <Link
        to="/alerts"
        className="inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-app-accent-hover hover:border-app-accent-hover"
      >
        <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
        Alert rules
      </Link>
    </div>
  );

  const columns = [
    {
      key: 'alert_name',
      label: 'Alert',
      render: (row: AlertInstance) => (
        <div className="space-y-1">
          <div className="font-semibold text-app-text">{row.alert_name}</div>
          <div className="text-xs text-app-text-muted">{row.message}</div>
        </div>
      ),
    },
    {
      key: 'metric_type',
      label: 'Metric',
      render: (row: AlertInstance) => getAlertMetricLabel(row.metric_type),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (row: AlertInstance) => (
        <span
          className={`rounded px-2 py-1 text-xs font-medium capitalize ${getAlertSeverityClasses(row.severity)}`}
        >
          {row.severity}
        </span>
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
    {
      key: 'actions',
      label: 'Actions',
      render: (row: AlertInstance) => {
        const actionPending = pendingInstanceActionIds.includes(row.id);

        return (
          <div className="flex flex-wrap gap-2">
            {row.status !== 'resolved' && !row.acknowledged_at ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-[var(--ui-radius-sm)] border border-app-border px-2.5 py-1.5 text-xs font-semibold text-app-text transition-colors hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-60"
                disabled={actionPending}
                onClick={() => {
                  void dispatch(acknowledgeAlert(row.id));
                }}
              >
                {actionPending ? (
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {actionPending ? 'Saving...' : 'Mark reviewed'}
              </button>
            ) : null}
            {row.status !== 'resolved' ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-2.5 py-1.5 text-xs font-semibold text-[var(--app-accent-foreground)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-app-accent-hover hover:border-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                disabled={actionPending}
                onClick={() => {
                  void dispatch(resolveAlert(row.id));
                }}
              >
                {actionPending ? (
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {actionPending ? 'Saving...' : 'Resolve'}
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active alerts"
        description="Review alerts that still need attention, mark them reviewed, and resolve them when the issue is closed."
        actions={actions}
      />

      <AlertsSectionTabs />
      <AlertSummaryCards stats={stats} />

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            void dispatch(fetchAlertInstances());
          }}
        />
      ) : null}

      {actionError ? <ErrorState message={actionError} /> : null}

      <SectionCard
        title="Active queue"
        subtitle="Only unresolved instances are shown here so staff can clear the queue without paging through archived activity."
      >
        {loading && openInstances.length === 0 ? (
          <LoadingState label="Loading active alerts..." />
        ) : openInstances.length > 0 ? (
          <DataTable
            rows={openInstances}
            columns={columns}
            rowKey={(row) => row.id}
            emptyLabel="No active alerts."
          />
        ) : (
          <EmptyState
            title="No active alerts"
            description="Your active queue is clear. Review historical activity if you need recent alert context."
            action={
              <Link
                to="/alerts/history"
                className="inline-flex items-center rounded-[var(--ui-radius-sm)] border border-app-border px-3 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
              >
                Open alert history
              </Link>
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
