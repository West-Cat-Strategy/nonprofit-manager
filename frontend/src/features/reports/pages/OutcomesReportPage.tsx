import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import {
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SectionCard,
  SelectField,
} from '../../../components/ui';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchOutcomesReport } from '../../outcomes/state';
import type {
  OutcomeReportSource,
  OutcomeWorkflowStage,
  OutcomesReportFilters,
} from '../../../types/outcomes';

const getDateString = (date: Date): string => date.toISOString().split('T')[0];

const getDefaultFilters = (): OutcomesReportFilters => {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(now.getMonth() - 2);

  return {
    from: getDateString(from),
    to: getDateString(now),
    bucket: 'month',
    includeNonReportable: false,
    source: 'all',
  };
};

const formatBucket = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const workflowStageOrder: OutcomeWorkflowStage[] = [
  'interaction',
  'conversation',
  'appointment',
  'follow_up',
  'case_status',
  'manual',
  'legacy',
];

const workflowStageLabels: Record<OutcomeWorkflowStage, string> = {
  interaction: 'Interaction',
  conversation: 'Conversation',
  appointment: 'Appointment',
  follow_up: 'Follow-up',
  case_status: 'Case status',
  manual: 'Manual',
  legacy: 'Legacy',
};

const formatSeriesKey = (outcomeName: string, workflowStage: OutcomeWorkflowStage): string =>
  `${outcomeName} (${workflowStageLabels[workflowStage]})`;

const matchesSourceFilter = (
  source: OutcomeReportSource,
  filter: OutcomesReportFilters['source']
): boolean => filter === undefined || filter === 'all' || source === filter;

const seriesColors = [
  'var(--loop-blue)',
  'var(--loop-yellow)',
  'var(--loop-green)',
  'var(--loop-purple)',
  'var(--loop-red)',
  'var(--loop-cyan)',
  '#1f8f5f',
  '#b45a1a',
  '#4b5dff',
  '#9466ff',
  '#0b7285',
  '#9a031e',
];

const OutcomesReport = () => {
  const dispatch = useAppDispatch();
  const { report, loading, error } = useAppSelector((state) => state.outcomesReports);

  const [filters, setFilters] = useState<OutcomesReportFilters>(getDefaultFilters);

  useEffect(() => {
    void dispatch(fetchOutcomesReport(filters));
  }, [dispatch, filters]);

  const timeseriesChartData = useMemo(() => {
    if (!report) {
      return [];
    }

    const outcomeNameById = new Map(
      report.totalsByOutcome.map((row) => [row.outcomeDefinitionId, row.name])
    );

    const grouped = new Map<string, Record<string, string | number>>();

    for (const point of report.timeseries) {
      const key = point.bucketStart;
      const outcomeName = outcomeNameById.get(point.outcomeDefinitionId) || point.outcomeDefinitionId;
      const seriesKey = formatSeriesKey(outcomeName, point.workflowStage);

      if (!grouped.has(key)) {
        grouped.set(key, { bucketStart: key });
      }
      const current = grouped.get(key);
      if (!current) {
        continue;
      }
      current[seriesKey] = Number(current[seriesKey] || 0) + point.countImpacts;
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([bucketStart, values]) => ({
        ...values,
        bucketStart,
        bucketLabel: formatBucket(bucketStart),
      }));
  }, [report]);

  const outcomeSeries = useMemo(() => {
    if (!report) {
      return [];
    }

    return Array.from(
      new Set(
        report.timeseries
          .filter((point) => matchesSourceFilter(point.source, filters.source))
          .map((point) => {
            const outcomeName =
              report.totalsByOutcome.find(
                (row) => row.outcomeDefinitionId === point.outcomeDefinitionId
              )?.name || point.outcomeDefinitionId;
            return formatSeriesKey(outcomeName, point.workflowStage);
          })
      )
    );
  }, [filters.source, report]);

  const handleFilterChange = <K extends keyof OutcomesReportFilters>(
    key: K,
    value: OutcomesReportFilters[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCsvExport = () => {
    if (!report || report.totalsByOutcome.length === 0) {
      return;
    }

    const headers = [
      'Outcome',
      'Key',
      'Total Impacts',
      'Unique Clients Impacted',
      'Interaction Impacts',
      'Interaction Unique Clients',
      'Event Impacts',
      'Event Unique Clients',
      ...workflowStageOrder.map((stage) => `${workflowStageLabels[stage]} Impacts`),
    ];
    const rows = report.totalsByOutcome.map((row) => [
      row.name,
      row.key,
      String(row.countImpacts),
      String(row.uniqueClientsImpacted),
      String(row.sourceBreakdown.interaction.countImpacts),
      String(row.sourceBreakdown.interaction.uniqueClientsImpacted),
      String(row.sourceBreakdown.event.countImpacts),
      String(row.sourceBreakdown.event.uniqueClientsImpacted),
      ...workflowStageOrder.map((stage) => String(row.workflowStageBreakdown[stage] || 0)),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => (value.includes(',') ? `"${value}"` : value)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outcomes-report-${filters.from}-to-${filters.to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <NeoBrutalistLayout pageTitle="OUTCOMES REPORT">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Outcomes Report"
          description="Track outcomes across both interaction tags and case outcome events."
          actions={
            <PrimaryButton onClick={handleCsvExport} disabled={!report || report.totalsByOutcome.length === 0}>
              Export CSV
            </PrimaryButton>
          }
        />

        <SectionCard title="Filters" subtitle="Adjust date range, segmentation, source scope, and reporting options.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-7">
            <FormField
              type="date"
              label="From"
              value={filters.from}
              onChange={(event) => handleFilterChange('from', event.target.value)}
            />
            <FormField
              type="date"
              label="To"
              value={filters.to}
              onChange={(event) => handleFilterChange('to', event.target.value)}
            />
            <SelectField
              label="Bucket"
              value={filters.bucket || 'month'}
              onChange={(event) =>
                handleFilterChange('bucket', event.target.value as OutcomesReportFilters['bucket'])
              }
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
            </SelectField>
            <SelectField
              label="Source"
              value={filters.source || 'all'}
              onChange={(event) =>
                handleFilterChange('source', event.target.value as OutcomesReportFilters['source'])
              }
            >
              <option value="all">All</option>
              <option value="interaction">Interaction tags</option>
              <option value="event">Case outcome events</option>
            </SelectField>
            <FormField
              type="text"
              label="Staff ID"
              value={filters.staffId || ''}
              onChange={(event) => handleFilterChange('staffId', event.target.value || undefined)}
              placeholder="Optional"
            />
            <SelectField
              label="Interaction Type"
              value={filters.interactionType || ''}
              onChange={(event) =>
                handleFilterChange(
                  'interactionType',
                  (event.target.value || undefined) as OutcomesReportFilters['interactionType']
                )
              }
            >
              <option value="">All</option>
              <option value="note">Note</option>
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="update">Update</option>
              <option value="status_change">Status Change</option>
            </SelectField>
            <label className="mt-6 inline-flex items-center gap-2 text-sm text-app-text-muted">
              <input
                type="checkbox"
                checked={Boolean(filters.includeNonReportable)}
                onChange={(event) =>
                  handleFilterChange('includeNonReportable', event.target.checked || undefined)
                }
              />
              Include Non-Reportable
            </label>
          </div>
        </SectionCard>

        {loading && <LoadingState label="Loading outcomes report..." />}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => void dispatch(fetchOutcomesReport(filters))}
            retryLabel="Retry"
          />
        )}

        {!loading && !error && report && (
          <>
            <SectionCard title="Totals by Outcome">
              {report.totalsByOutcome.length === 0 ? (
                <EmptyState
                  title="No outcomes in selected period"
                  description="Adjust filters or date range to include reported outcome activity."
                />
              ) : (
                <div className="overflow-x-auto rounded-[var(--ui-radius-sm)] border border-app-border-muted">
                  <table className="min-w-full divide-y divide-app-border-muted bg-app-surface text-sm">
                    <thead className="bg-app-surface-muted">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                          Outcome
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                          Total Impacts
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                          Total Unique Clients
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                          Interaction Impacts
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                          Event Impacts
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                          Workflow Stages
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border-muted">
                      {report.totalsByOutcome.map((row) => (
                        <tr key={row.outcomeDefinitionId}>
                          <td className="px-3 py-2 text-sm text-app-text">
                            <p className="font-semibold">{row.name}</p>
                            <p className="text-xs text-app-text-muted">{row.key}</p>
                          </td>
                          <td className="px-3 py-2 text-sm text-app-text">{row.countImpacts}</td>
                          <td className="px-3 py-2 text-sm text-app-text">{row.uniqueClientsImpacted}</td>
                          <td className="px-3 py-2 text-sm text-app-text">
                            {row.sourceBreakdown.interaction.countImpacts}
                          </td>
                          <td className="px-3 py-2 text-sm text-app-text">
                            {row.sourceBreakdown.event.countImpacts}
                          </td>
                          <td className="px-3 py-2 text-sm text-app-text">
                            <div className="flex flex-wrap gap-1">
                              {workflowStageOrder
                                .filter((stage) => row.workflowStageBreakdown[stage] > 0)
                                .map((stage) => (
                                  <span
                                    key={stage}
                                    className="inline-flex items-center rounded-full border border-app-border px-2 py-1 text-xs text-app-text-muted"
                                  >
                                    {workflowStageLabels[stage]}: {row.workflowStageBreakdown[stage]}
                                  </span>
                                ))}
                              {workflowStageOrder.every(
                                (stage) => row.workflowStageBreakdown[stage] === 0
                              ) && (
                                <span className="text-xs text-app-text-muted">No staged outcomes</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Time Series"
              subtitle="Trend lines are grouped by workflow stage so conversation, appointment, follow-up, and case-status outcomes remain visible."
            >
              {timeseriesChartData.length === 0 ? (
                <EmptyState
                  title="No time-series data"
                  description="No trend points are available for the selected filters."
                />
              ) : (
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeseriesChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucketLabel" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      {outcomeSeries.map((outcomeName, index) => (
                        <Bar
                          key={outcomeName}
                          dataKey={outcomeName}
                          stackId="outcomes"
                          fill={seriesColors[index % seriesColors.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </NeoBrutalistLayout>
  );
};

export default OutcomesReport;
