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
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import {
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SectionCard,
  SelectField,
} from '../../components/ui';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchOutcomesReport } from '../../store/slices/outcomesReportsSlice';
import type { OutcomesReportFilters } from '../../types/outcomes';

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

const seriesColors = [
  'var(--loop-blue)',
  'var(--loop-yellow)',
  'var(--loop-green)',
  'var(--loop-purple)',
  'var(--loop-red)',
  'var(--loop-cyan)',
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
      const label = outcomeNameById.get(point.outcomeDefinitionId) || point.outcomeDefinitionId;
      if (!grouped.has(key)) {
        grouped.set(key, { bucketStart: key });
      }
      const current = grouped.get(key);
      if (!current) {
        continue;
      }
      current[label] = Number(current[label] || 0) + point.countImpacts;
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([bucketStart, values]) => ({
        ...values,
        bucketStart,
        bucketLabel: formatBucket(bucketStart),
      }));
  }, [report]);

  const outcomeSeries = useMemo(() => report?.totalsByOutcome.map((row) => row.name) || [], [report]);

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

    const headers = ['Outcome', 'Key', 'Count Impacts', 'Unique Clients Impacted'];
    const rows = report.totalsByOutcome.map((row) => [
      row.name,
      row.key,
      String(row.countImpacts),
      String(row.uniqueClientsImpacted),
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
          description="Track interaction-level outcomes over time."
          actions={
            <PrimaryButton onClick={handleCsvExport} disabled={!report || report.totalsByOutcome.length === 0}>
              Export CSV
            </PrimaryButton>
          }
        />

        <SectionCard title="Filters" subtitle="Adjust date range, segmentation, and reporting scope.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
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
                          Impacts
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                          Unique Clients
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Time Series">
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
