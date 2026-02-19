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

  const outcomeSeries = useMemo(() => {
    return report?.totalsByOutcome.map((row) => row.name) || [];
  }, [report]);

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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-black uppercase text-[var(--app-text)]">Outcomes Report</h1>
              <p className="text-sm text-[var(--app-text-muted)] mt-1">
                Track interaction-level outcomes over time.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCsvExport}
              className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--loop-green)] font-bold uppercase text-sm"
              disabled={!report || report.totalsByOutcome.length === 0}
            >
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-[var(--app-text-muted)] mb-1">From</label>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => handleFilterChange('from', event.target.value)}
                className="w-full px-3 py-2 border-2 border-[var(--app-border)]"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-[var(--app-text-muted)] mb-1">To</label>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => handleFilterChange('to', event.target.value)}
                className="w-full px-3 py-2 border-2 border-[var(--app-border)]"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-[var(--app-text-muted)] mb-1">Bucket</label>
              <select
                value={filters.bucket || 'month'}
                onChange={(event) =>
                  handleFilterChange('bucket', event.target.value as OutcomesReportFilters['bucket'])
                }
                className="w-full px-3 py-2 border-2 border-[var(--app-border)]"
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-[var(--app-text-muted)] mb-1">Staff ID</label>
              <input
                type="text"
                value={filters.staffId || ''}
                onChange={(event) => handleFilterChange('staffId', event.target.value || undefined)}
                className="w-full px-3 py-2 border-2 border-[var(--app-border)]"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-[var(--app-text-muted)] mb-1">Interaction Type</label>
              <select
                value={filters.interactionType || ''}
                onChange={(event) =>
                  handleFilterChange(
                    'interactionType',
                    (event.target.value || undefined) as OutcomesReportFilters['interactionType']
                  )
                }
                className="w-full px-3 py-2 border-2 border-[var(--app-border)]"
              >
                <option value="">All</option>
                <option value="note">Note</option>
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="update">Update</option>
                <option value="status_change">Status Change</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
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
          </div>
        </section>

        {loading && (
          <section className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] p-6">
            <p className="text-sm text-[var(--app-text-muted)]">Loading outcomes report...</p>
          </section>
        )}

        {error && (
          <section className="bg-[var(--app-surface)] border-2 border-red-500 p-6">
            <p className="text-sm text-red-700">{error}</p>
          </section>
        )}

        {!loading && report && (
          <>
            <section className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] p-6 overflow-x-auto">
              <h2 className="text-lg font-black uppercase text-[var(--app-text)] mb-3">Totals by Outcome</h2>
              <table className="min-w-full divide-y divide-[var(--app-border)]">
                <thead className="bg-[var(--app-surface-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-black uppercase text-[var(--app-text-muted)]">Outcome</th>
                    <th className="px-3 py-2 text-left text-xs font-black uppercase text-[var(--app-text-muted)]">Impacts</th>
                    <th className="px-3 py-2 text-left text-xs font-black uppercase text-[var(--app-text-muted)]">Unique Clients</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--app-border)]">
                  {report.totalsByOutcome.map((row) => (
                    <tr key={row.outcomeDefinitionId}>
                      <td className="px-3 py-2 text-sm text-[var(--app-text)]">
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-xs text-[var(--app-text-muted)]">{row.key}</p>
                      </td>
                      <td className="px-3 py-2 text-sm text-[var(--app-text)]">{row.countImpacts}</td>
                      <td className="px-3 py-2 text-sm text-[var(--app-text)]">{row.uniqueClientsImpacted}</td>
                    </tr>
                  ))}
                  {report.totalsByOutcome.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-sm text-[var(--app-text-muted)]">
                        No outcomes in selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] p-6">
              <h2 className="text-lg font-black uppercase text-[var(--app-text)] mb-3">Time Series</h2>
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
                        fill={['#2563eb', '#f59e0b', '#16a34a', '#9333ea', '#ef4444'][index % 5]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </div>
    </NeoBrutalistLayout>
  );
};

export default OutcomesReport;
