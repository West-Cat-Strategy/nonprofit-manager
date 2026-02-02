/**
 * Analytics Page
 * Displays organization-wide analytics and reporting with charts
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchAnalyticsSummary,
  fetchDonationTrends,
  fetchVolunteerHoursTrends,
  fetchEventAttendanceTrends,
  fetchComparativeAnalytics,
  setFilters,
} from '../store/slices/analyticsSlice';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DonationTrendPoint, VolunteerHoursTrendPoint, EventTrendPoint, PeriodComparison } from '../types/analytics';
import {
  exportAnalyticsSummaryToCSV,
  exportAnalyticsSummaryToPDF,
  exportEngagementToCSV,
  exportConstituentOverviewToCSV,
  exportDonationTrendsToPDF,
  exportVolunteerTrendsToPDF,
} from '../utils/exportUtils';

/**
 * Format currency values
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format large numbers with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function MetricCard({ title, value, subtitle, trend, trendValue }: MetricCardProps) {
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

/**
 * Engagement Pie Chart Component
 */
interface EngagementPieChartProps {
  distribution: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
}

const ENGAGEMENT_COLORS = ['#22c55e', '#eab308', '#f97316', '#9ca3af'];

function EngagementPieChart({ distribution }: EngagementPieChartProps) {
  const total = distribution.high + distribution.medium + distribution.low + distribution.inactive;
  if (total === 0) return <div className="text-gray-500 text-center py-8">No engagement data</div>;

  const data = [
    { name: 'Highly Engaged', value: distribution.high, color: '#22c55e' },
    { name: 'Medium Engaged', value: distribution.medium, color: '#eab308' },
    { name: 'Low Engaged', value: distribution.low, color: '#f97316' },
    { name: 'Inactive', value: distribution.inactive, color: '#9ca3af' },
  ].filter((item) => item.value > 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={ENGAGEMENT_COLORS[index % ENGAGEMENT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [String(value), 'Count']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {[
          { label: 'High', value: distribution.high, color: 'bg-green-500' },
          { label: 'Medium', value: distribution.medium, color: 'bg-yellow-500' },
          { label: 'Low', value: distribution.low, color: 'bg-orange-500' },
          { label: 'Inactive', value: distribution.inactive, color: 'bg-gray-400' },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center">
            <div className={`w-4 h-4 rounded-full ${item.color} mb-1`} />
            <p className="text-lg font-bold text-gray-900">{item.value}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Constituent Bar Chart Component
 */
interface ConstituentBarChartProps {
  accounts: { total: number; active: number };
  contacts: { total: number; active: number };
  volunteers: number;
}

function ConstituentBarChart({ accounts, contacts, volunteers }: ConstituentBarChartProps) {
  const data = [
    { name: 'Accounts', total: accounts.total, active: accounts.active },
    { name: 'Contacts', total: contacts.total, active: contacts.active },
    { name: 'Volunteers', total: volunteers, active: volunteers },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Constituent Overview</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#94a3b8" name="Total" />
            <Bar dataKey="active" fill="#22c55e" name="Active" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Summary Stats Bar Chart
 */
interface SummaryStatsChartProps {
  donations: number;
  events: number;
  volunteerHours: number;
}

function SummaryStatsChart({ donations, events, volunteerHours }: SummaryStatsChartProps) {
  const data = [
    { name: 'Donations', value: donations, fill: '#8b5cf6' },
    { name: 'Events', value: events, fill: '#06b6d4' },
    { name: 'Volunteer Hours', value: volunteerHours, fill: '#3b82f6' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Summary (YTD)</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Donation Trends Line Chart Component
 */
interface DonationTrendsChartProps {
  data: DonationTrendPoint[];
  loading: boolean;
}

function DonationTrendsChart({ data, loading }: DonationTrendsChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Donation Trends (12 Months)</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Donation Trends (12 Months)</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No donation trend data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Donation Trends (12 Months)</h3>
        <button
          type="button"
          onClick={() => exportDonationTrendsToPDF(data)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
          title="Export to PDF"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tickFormatter={(value) => `$${formatNumber(value)}`} />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value, name) => [
                name === 'amount' ? `$${Number(value).toLocaleString()}` : value,
                name === 'amount' ? 'Amount' : 'Count',
              ]}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="amount"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2 }}
              name="Amount"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: '#6366f1', strokeWidth: 2 }}
              name="Count"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Volunteer Hours Trends Line Chart Component
 */
interface VolunteerTrendsChartProps {
  data: VolunteerHoursTrendPoint[];
  loading: boolean;
}

function VolunteerTrendsChart({ data, loading }: VolunteerTrendsChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Volunteer Hours Trends (12 Months)</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Volunteer Hours Trends (12 Months)</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No volunteer hours trend data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Volunteer Hours Trends (12 Months)</h3>
        <button
          type="button"
          onClick={() => exportVolunteerTrendsToPDF(data)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
          title="Export to PDF"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value, name) => [
                value,
                name === 'hours' ? 'Hours' : 'Assignments',
              ]}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="hours"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              name="Hours"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="assignments"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2 }}
              name="Assignments"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Event Attendance Trends Chart Component
 */
interface EventAttendanceTrendsChartProps {
  data: EventTrendPoint[];
  loading: boolean;
}

function EventAttendanceTrendsChart({ data, loading }: EventAttendanceTrendsChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Event Attendance Trends</h3>
        <div className="text-gray-500 text-center py-8">No event attendance data</div>
      </div>
    );
  }

  // Format month for display (YYYY-MM to MMM YYYY)
  const formattedData = data.map((point) => ({
    ...point,
    monthLabel: new Date(point.month + '-01').toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Event Attendance Trends</h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" />
            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="total_registrations"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              name="Registrations"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="total_attendance"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
              name="Attendance"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="attendance_rate"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2 }}
              name="Attendance Rate (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-blue-600">
            {data.reduce((sum, t) => sum + t.total_events, 0)}
          </p>
          <p className="text-sm text-gray-600">Total Events</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-purple-600">
            {data.reduce((sum, t) => sum + t.total_registrations, 0)}
          </p>
          <p className="text-sm text-gray-600">Total Registrations</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">
            {data.reduce((sum, t) => sum + t.total_attendance, 0)}
          </p>
          <p className="text-sm text-gray-600">Total Attendance</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Comparison Card Component
 * Displays period-over-period comparison with trend indicator
 */
interface ComparisonCardProps {
  title: string;
  comparison: PeriodComparison;
  format?: 'currency' | 'number' | 'decimal';
}

function ComparisonCard({ title, comparison, format = 'number' }: ComparisonCardProps) {
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

export default function Analytics() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    summary,
    summaryLoading,
    donationTrends,
    volunteerHoursTrends,
    eventAttendanceTrends,
    trendsLoading,
    comparativeAnalytics,
    comparativeLoading,
    error,
    filters,
  } = useAppSelector((state) => state.analytics);

  const [dateRange, setDateRange] = useState({
    start_date: filters.start_date || '',
    end_date: filters.end_date || '',
  });

  const [comparisonPeriod, setComparisonPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    dispatch(fetchAnalyticsSummary(filters));
    dispatch(fetchDonationTrends(12));
    dispatch(fetchVolunteerHoursTrends(12));
    dispatch(fetchEventAttendanceTrends(12));
    dispatch(fetchComparativeAnalytics(comparisonPeriod));
  }, [dispatch, filters, comparisonPeriod]);

  const handleApplyFilters = () => {
    dispatch(setFilters(dateRange));
  };

  const handleClearFilters = () => {
    setDateRange({ start_date: '', end_date: '' });
    dispatch(setFilters({ start_date: undefined, end_date: undefined }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
            </div>
            {summary && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportAnalyticsSummaryToCSV(summary)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportAnalyticsSummaryToPDF(summary)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Date Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Loading State */}
        {summaryLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading analytics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Analytics Content */}
        {!summaryLoading && summary && (
          <>
            {/* Key Metrics */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Donations (YTD)"
                  value={formatCurrency(summary.total_donations_ytd)}
                  subtitle={`${summary.donation_count_ytd} donations`}
                />
                <MetricCard
                  title="Average Donation"
                  value={formatCurrency(summary.average_donation_ytd)}
                />
                <MetricCard
                  title="Active Constituents"
                  value={formatNumber(summary.active_accounts + summary.active_contacts)}
                  subtitle={`${summary.active_accounts} accounts, ${summary.active_contacts} contacts`}
                />
                <MetricCard
                  title="Volunteer Hours (YTD)"
                  value={formatNumber(summary.total_volunteer_hours_ytd)}
                  subtitle={`${summary.total_volunteers} active volunteers`}
                />
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Engagement Pie Chart */}
              <div className="relative">
                <EngagementPieChart distribution={summary.engagement_distribution} />
                <button
                  type="button"
                  onClick={() => exportEngagementToCSV(summary.engagement_distribution)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Export Engagement Data (CSV)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>

              {/* Constituent Bar Chart */}
              <div className="relative">
                <ConstituentBarChart
                  accounts={{ total: summary.total_accounts, active: summary.active_accounts }}
                  contacts={{ total: summary.total_contacts, active: summary.active_contacts }}
                  volunteers={summary.total_volunteers}
                />
                <button
                  type="button"
                  onClick={() =>
                    exportConstituentOverviewToCSV({
                      accounts: { total: summary.total_accounts, active: summary.active_accounts },
                      contacts: { total: summary.total_contacts, active: summary.active_contacts },
                      volunteers: summary.total_volunteers,
                      volunteerHours: summary.total_volunteer_hours_ytd,
                    })
                  }
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Export Constituent Data (CSV)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Activity Summary Chart */}
            <div className="mb-6">
              <SummaryStatsChart
                donations={summary.donation_count_ytd}
                events={summary.total_events_ytd}
                volunteerHours={summary.total_volunteer_hours_ytd}
              />
            </div>

            {/* Trends Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <DonationTrendsChart data={donationTrends} loading={trendsLoading} />
              <VolunteerTrendsChart data={volunteerHoursTrends} loading={trendsLoading} />
            </div>

            {/* Event Attendance Chart */}
            <div className="mb-6">
              <EventAttendanceTrendsChart data={eventAttendanceTrends} loading={trendsLoading} />
            </div>

            {/* Comparative Analytics Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Period Comparison
                  {comparativeAnalytics && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({comparativeAnalytics.previous_period} vs {comparativeAnalytics.current_period})
                    </span>
                  )}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setComparisonPeriod('month')}
                    className={`px-3 py-1 text-sm rounded ${
                      comparisonPeriod === 'month'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonPeriod('quarter')}
                    className={`px-3 py-1 text-sm rounded ${
                      comparisonPeriod === 'quarter'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Quarter
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonPeriod('year')}
                    className={`px-3 py-1 text-sm rounded ${
                      comparisonPeriod === 'year'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Year
                  </button>
                </div>
              </div>

              {comparativeLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                  <p className="text-gray-500 mt-4">Loading comparisons...</p>
                </div>
              ) : comparativeAnalytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ComparisonCard
                    title="Total Donations"
                    comparison={comparativeAnalytics.metrics.total_donations}
                    format="currency"
                  />
                  <ComparisonCard
                    title="Donation Count"
                    comparison={comparativeAnalytics.metrics.donation_count}
                    format="number"
                  />
                  <ComparisonCard
                    title="Average Donation"
                    comparison={comparativeAnalytics.metrics.average_donation}
                    format="currency"
                  />
                  <ComparisonCard
                    title="New Contacts"
                    comparison={comparativeAnalytics.metrics.new_contacts}
                    format="number"
                  />
                  <ComparisonCard
                    title="Total Events"
                    comparison={comparativeAnalytics.metrics.total_events}
                    format="number"
                  />
                  <ComparisonCard
                    title="Volunteer Hours"
                    comparison={comparativeAnalytics.metrics.volunteer_hours}
                    format="decimal"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No comparison data available
                </div>
              )}
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Accounts</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.total_accounts}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{summary.active_accounts}</p>
                    <p className="text-sm text-gray-500">Active</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 rounded-full h-2"
                      style={{
                        width:
                          summary.total_accounts > 0
                            ? `${(summary.active_accounts / summary.total_accounts) * 100}%`
                            : '0%',
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.total_accounts > 0
                      ? `${((summary.active_accounts / summary.total_accounts) * 100).toFixed(1)}% active`
                      : 'No accounts'}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Contacts</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.total_contacts}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{summary.active_contacts}</p>
                    <p className="text-sm text-gray-500">Active</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 rounded-full h-2"
                      style={{
                        width:
                          summary.total_contacts > 0
                            ? `${(summary.active_contacts / summary.total_contacts) * 100}%`
                            : '0%',
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.total_contacts > 0
                      ? `${((summary.active_contacts / summary.total_contacts) * 100).toFixed(1)}% active`
                      : 'No contacts'}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Volunteers</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.total_volunteers}</p>
                    <p className="text-sm text-gray-500">Registered</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatNumber(summary.total_volunteer_hours_ytd)}
                    </p>
                    <p className="text-sm text-gray-500">Hours YTD</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-500">
                    Avg{' '}
                    {summary.total_volunteers > 0
                      ? (summary.total_volunteer_hours_ytd / summary.total_volunteers).toFixed(1)
                      : 0}{' '}
                    hours per volunteer
                  </p>
                </div>
              </div>
            </div>

            {/* Events & Donations Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Events Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600">Total Events (YTD)</span>
                    <span className="text-xl font-bold text-gray-900">{summary.total_events_ytd}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    View event details in the{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/events')}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Events module
                    </button>
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Donations Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600">Total Amount (YTD)</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(summary.total_donations_ytd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600">Number of Donations</span>
                    <span className="font-medium text-gray-900">{summary.donation_count_ytd}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600">Average Donation</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(summary.average_donation_ytd)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    View donation details in the{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/donations')}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Donations module
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!summaryLoading && !error && !summary && (
          <div className="text-center py-12">
            <p className="text-gray-500">No analytics data available</p>
          </div>
        )}
      </main>
    </div>
  );
}
