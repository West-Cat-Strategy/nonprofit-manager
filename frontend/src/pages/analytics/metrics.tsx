import { formatCurrency, formatNumber } from './utils';
import type { PeriodComparison } from '../../types/analytics';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function MetricCard({ title, value, subtitle, trend, trendValue }: MetricCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      {trend && trendValue && (
        <p className={`mt-2 text-sm ${trendColors[trend]}`}>
          {trendIcons[trend]} {trendValue}
        </p>
      )}
    </div>
  );
}

interface ComparisonCardProps {
  title: string;
  comparison: PeriodComparison;
  format?: 'currency' | 'number' | 'decimal';
}

export function ComparisonCard({ title, comparison, format = 'number' }: ComparisonCardProps) {
  const formatValue = (value: number) => {
    if (format === 'currency') {
      return formatCurrency(value);
    } else if (format === 'decimal') {
      return value.toFixed(2);
    }
    return formatNumber(value);
  };

  const getTrendIcon = () => {
    if (comparison.trend === 'up') {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    } else if (comparison.trend === 'down') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  const trendColor =
    comparison.trend === 'up' ? 'text-green-600' : comparison.trend === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
      <div className="flex items-baseline justify-between">
        <div className="flex-1">
          <div className="text-2xl font-bold text-gray-900">{formatValue(comparison.current)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Previous: {formatValue(comparison.previous)}
          </div>
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          {getTrendIcon()}
          <span className="text-sm font-medium">
            {comparison.change_percent > 0 ? '+' : ''}
            {comparison.change_percent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
