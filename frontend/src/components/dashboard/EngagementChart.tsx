import { memo, useMemo } from 'react';

interface EngagementDistribution {
  high: number;
  medium: number;
  low: number;
  inactive: number;
}

interface EngagementChartProps {
  distribution: EngagementDistribution;
}

interface Segment {
  label: string;
  value: number;
  color: string;
}

function EngagementChart({ distribution }: EngagementChartProps) {
  const { total, segments } = useMemo(() => {
    const total = distribution.high + distribution.medium + distribution.low + distribution.inactive;
    const segments: Segment[] = [
      { label: 'High', value: distribution.high, color: 'bg-green-500' },
      { label: 'Medium', value: distribution.medium, color: 'bg-yellow-500' },
      { label: 'Low', value: distribution.low, color: 'bg-orange-500' },
      { label: 'Inactive', value: distribution.inactive, color: 'bg-app-text-subtle' },
    ];
    return { total, segments };
  }, [distribution]);

  if (total === 0) return null;

  return (
    <div
      className="rounded-2xl border border-app-border/70 bg-app-surface/85 p-5 shadow-sm"
      role="figure"
      aria-label="Engagement distribution chart"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-app-text-muted">Engagement Distribution</h3>
        <span className="text-xs text-app-text-subtle">Last 30 days</span>
      </div>
      <div
        className="mt-4 flex h-3 rounded-full overflow-hidden bg-app-surface-muted"
        role="progressbar"
        aria-label="Engagement breakdown"
      >
        {segments.map(
          (segment) =>
            segment.value > 0 && (
              <div
                key={segment.label}
                className={segment.color}
                style={{ width: `${(segment.value / total) * 100}%` }}
                title={`${segment.label}: ${segment.value}`}
                aria-label={`${segment.label}: ${segment.value} (${Math.round((segment.value / total) * 100)}%)`}
              />
            )
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs" role="list" aria-label="Engagement legend">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-1" role="listitem">
            <div className={`w-3 h-3 rounded ${segment.color}`} aria-hidden="true" />
            <span className="text-app-text-muted">
              {segment.label}: {segment.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(EngagementChart);
export type { EngagementChartProps, EngagementDistribution };
