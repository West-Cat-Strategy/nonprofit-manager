import { memo } from 'react';
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
import type { DonationTrendPoint, EventTrendPoint, VolunteerHoursTrendPoint } from '../../types/analytics';
import { exportDonationTrendsToPDF, exportVolunteerTrendsToPDF } from '../../utils/exportUtils';
import { formatNumber } from './utils';

interface EngagementPieChartProps {
  distribution: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
}

const ENGAGEMENT_COLORS = ['#22c55e', '#eab308', '#f97316', '#9ca3af'];

function EngagementPieChartComponent({ distribution }: EngagementPieChartProps) {
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

export const EngagementPieChart = memo(EngagementPieChartComponent);

interface ConstituentBarChartProps {
  accounts: { total: number; active: number };
  contacts: { total: number; active: number };
  volunteers: number;
}

function ConstituentBarChartComponent({ accounts, contacts, volunteers }: ConstituentBarChartProps) {
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

export const ConstituentBarChart = memo(ConstituentBarChartComponent);

interface SummaryStatsChartProps {
  donations: number;
  events: number;
  volunteerHours: number;
}

function SummaryStatsChartComponent({ donations, events, volunteerHours }: SummaryStatsChartProps) {
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

export const SummaryStatsChart = memo(SummaryStatsChartComponent);

interface DonationTrendsChartProps {
  data: DonationTrendPoint[];
  loading: boolean;
}

export function DonationTrendsChartComponent({ data, loading }: DonationTrendsChartProps) {
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

export const DonationTrendsChart = memo(DonationTrendsChartComponent);

interface VolunteerTrendsChartProps {
  data: VolunteerHoursTrendPoint[];
  loading: boolean;
}

export function VolunteerTrendsChartComponent({ data, loading }: VolunteerTrendsChartProps) {
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

export const VolunteerTrendsChart = memo(VolunteerTrendsChartComponent);

interface EventAttendanceTrendsChartProps {
  data: EventTrendPoint[];
  loading: boolean;
}

function EventAttendanceTrendsChartComponent({ data, loading }: EventAttendanceTrendsChartProps) {
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

export const EventAttendanceTrendsChart = memo(EventAttendanceTrendsChartComponent);
