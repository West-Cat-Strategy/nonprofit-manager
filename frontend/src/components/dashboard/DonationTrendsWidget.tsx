import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';
import { analyticsApiClient } from '../../features/analytics/api/analyticsApiClient';
import { useDashboardData } from '../../features/dashboard/context/DashboardDataContext';
import type { DonationTrendPoint } from '../../features/analytics/types/contracts';

interface DonationTrendsWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat('en-CA', {
  maximumFractionDigits: 0,
});

const monthLabelFormatter = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  timeZone: 'UTC',
});

const monthHeadingFormatter = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const parseMonthValue = (value: string): Date | null => {
  const yearMonthMatch = /^(\d{4})-(\d{2})$/.exec(value);
  if (yearMonthMatch) {
    const [, year, month] = yearMonthMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const formatMonthLabel = (value: string) => {
  const parsed = parseMonthValue(value);
  if (!parsed) {
    return value;
  }

  return monthLabelFormatter.format(parsed);
};

const formatMonthHeading = (value: string) => {
  const parsed = parseMonthValue(value);
  if (!parsed) {
    return value;
  }

  return monthHeadingFormatter.format(parsed);
};

const summarizeDonationTrends = (points: DonationTrendPoint[]) => {
  if (points.length === 0) {
    return null;
  }

  const totals = points.reduce(
    (accumulator, point) => ({
      amount: accumulator.amount + point.amount,
      count: accumulator.count + point.count,
    }),
    { amount: 0, count: 0 }
  );

  const peakPoint = points.reduce<DonationTrendPoint | null>((currentPeak, point) => {
    if (!currentPeak || point.amount > currentPeak.amount) {
      return point;
    }
    return currentPeak;
  }, null);

  return {
    totalAmount: totals.amount,
    totalCount: totals.count,
    peakMonth: peakPoint ? formatMonthHeading(peakPoint.month) : 'N/A',
  };
};

const DonationTrendsWidget = ({ widget, editMode, onRemove }: DonationTrendsWidgetProps) => {
  const dashboardData = useDashboardData();
  const [data, setData] = useState<DonationTrendPoint[]>([]);
  const [loading, setLoading] = useState(!dashboardData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dashboardData) {
      return undefined;
    }

    let isMounted = true;

    const fetchDonationTrends = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await analyticsApiClient.fetchDonationTrends(12);
        if (!isMounted) {
          return;
        }
        setData(Array.isArray(result) ? result : []);
      } catch {
        if (!isMounted) {
          return;
        }
        setError('Failed to load donation trend data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchDonationTrends();

    return () => {
      isMounted = false;
    };
  }, [dashboardData]);

  const resolvedData = dashboardData ? dashboardData.donationTrends : data;
  const isLoading = dashboardData ? dashboardData.loading.donationTrends : loading;
  const resolvedError = dashboardData ? dashboardData.errors.donationTrends ?? null : error;

  const chartData = resolvedData.map((point) => ({
    ...point,
    monthLabel: formatMonthLabel(point.month),
    monthHeading: formatMonthHeading(point.month),
  }));

  const summary = summarizeDonationTrends(resolvedData);

  return (
    <WidgetContainer
      widget={widget}
      editMode={editMode}
      onRemove={onRemove}
      loading={isLoading}
      error={resolvedError}
    >
      {chartData.length === 0 ? (
        <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-app-border bg-app-surface-muted/40 p-6 text-center">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-app-text">No donation trends available yet</p>
            <p className="text-xs text-app-text-muted">
              This chart will populate as completed donations are recorded over time.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-[280px] flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-app-border bg-app-surface-muted/50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">12-Month Total</p>
              <p className="mt-1 text-xl font-semibold text-app-text">
                {currencyFormatter.format(summary?.totalAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted/50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">Gifts Recorded</p>
              <p className="mt-1 text-xl font-semibold text-app-text">
                {countFormatter.format(summary?.totalCount ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted/50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">Peak Month</p>
              <p className="mt-1 text-xl font-semibold text-app-text">{summary?.peakMonth ?? 'N/A'}</p>
            </div>
          </div>

          <div className="h-56 w-full min-h-[224px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={12}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => currencyFormatter.format(value)}
                />
                <Tooltip
                  formatter={(value: number) => [currencyFormatter.format(value), 'Raised']}
                  labelFormatter={(_, payload) => {
                    const firstPoint = payload?.[0]?.payload as { monthHeading?: string } | undefined;
                    return firstPoint?.monthHeading ?? '';
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#0f766e"
                  strokeWidth={3}
                  dot={{ fill: '#0f766e', r: 2 }}
                  activeDot={{ r: 5 }}
                  name="Raised"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

export default DonationTrendsWidget;
