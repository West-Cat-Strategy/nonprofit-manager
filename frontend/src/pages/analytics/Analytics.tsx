/**
 * Analytics Page
 * Displays organization-wide analytics and reporting with charts
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchAnalyticsSummary,
  fetchDonationTrends,
  fetchVolunteerHoursTrends,
  fetchEventAttendanceTrends,
  fetchComparativeAnalytics,
  setFilters,
} from '../../store/slices/analyticsSlice';
import {
  exportAnalyticsSummaryToCSV,
  exportAnalyticsSummaryToPDF,
  exportEngagementToCSV,
  exportConstituentOverviewToCSV,
} from '../../utils/exportUtils';
import { formatCurrency, formatNumber } from './utils';
import { MetricCard, ComparisonCard } from './metrics';
import {
  EngagementPieChart,
  ConstituentBarChart,
  SummaryStatsChart,
  DonationTrendsChart,
  VolunteerTrendsChart,
  EventAttendanceTrendsChart,
} from './charts';

// Charts and cards live in ./analytics/*

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
    <div className="min-h-screen bg-app-surface-muted">
      {/* Header */}
      <div className="bg-app-surface shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-app-text-muted hover:text-app-text-muted"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-app-text-heading">Analytics & Reports</h1>
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
        <div className="bg-app-surface rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-app-text-label">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-app-input-border shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-app-text-label">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-app-input-border shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              className="px-4 py-2 bg-app-surface-muted text-app-text-muted rounded-md hover:bg-app-hover text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Loading State */}
        {summaryLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-app-text-muted">Loading analytics...</p>
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
              <h2 className="text-lg font-semibold text-app-text-heading mb-4">Key Performance Indicators</h2>
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
                  className="absolute top-4 right-4 p-2 text-app-text-subtle hover:text-app-text-muted hover:bg-app-surface-muted rounded"
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
                  className="absolute top-4 right-4 p-2 text-app-text-subtle hover:text-app-text-muted hover:bg-app-surface-muted rounded"
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
            <div className="bg-app-surface rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-app-text-heading">
                  Period Comparison
                  {comparativeAnalytics && (
                    <span className="ml-2 text-sm font-normal text-app-text-muted">
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
                        ? 'bg-app-accent text-white'
                        : 'bg-app-surface-muted text-app-text-muted hover:bg-app-surface-muted'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonPeriod('quarter')}
                    className={`px-3 py-1 text-sm rounded ${
                      comparisonPeriod === 'quarter'
                        ? 'bg-app-accent text-white'
                        : 'bg-app-surface-muted text-app-text-muted hover:bg-app-surface-muted'
                    }`}
                  >
                    Quarter
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonPeriod('year')}
                    className={`px-3 py-1 text-sm rounded ${
                      comparisonPeriod === 'year'
                        ? 'bg-app-accent text-white'
                        : 'bg-app-surface-muted text-app-text-muted hover:bg-app-surface-muted'
                    }`}
                  >
                    Year
                  </button>
                </div>
              </div>

              {comparativeLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto" />
                  <p className="text-app-text-muted mt-4">Loading comparisons...</p>
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
                <div className="text-center py-8 text-app-text-muted">
                  No comparison data available
                </div>
              )}
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-app-surface rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-app-text-muted mb-4">Accounts</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-app-text-heading">{summary.total_accounts}</p>
                    <p className="text-sm text-app-text-muted">Total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{summary.active_accounts}</p>
                    <p className="text-sm text-app-text-muted">Active</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-app-surface-muted rounded-full h-2">
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
                  <p className="text-xs text-app-text-muted mt-1">
                    {summary.total_accounts > 0
                      ? `${((summary.active_accounts / summary.total_accounts) * 100).toFixed(1)}% active`
                      : 'No accounts'}
                  </p>
                </div>
              </div>

              <div className="bg-app-surface rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-app-text-muted mb-4">Contacts</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-app-text-heading">{summary.total_contacts}</p>
                    <p className="text-sm text-app-text-muted">Total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{summary.active_contacts}</p>
                    <p className="text-sm text-app-text-muted">Active</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-app-surface-muted rounded-full h-2">
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
                  <p className="text-xs text-app-text-muted mt-1">
                    {summary.total_contacts > 0
                      ? `${((summary.active_contacts / summary.total_contacts) * 100).toFixed(1)}% active`
                      : 'No contacts'}
                  </p>
                </div>
              </div>

              <div className="bg-app-surface rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-app-text-muted mb-4">Volunteers</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-app-text-heading">{summary.total_volunteers}</p>
                    <p className="text-sm text-app-text-muted">Registered</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-app-accent">
                      {formatNumber(summary.total_volunteer_hours_ytd)}
                    </p>
                    <p className="text-sm text-app-text-muted">Hours YTD</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-app-text-muted">
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
              <div className="bg-app-surface rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-app-text-heading mb-4">Events Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-app-text-muted">Total Events (YTD)</span>
                    <span className="text-xl font-bold text-app-text">{summary.total_events_ytd}</span>
                  </div>
                  <p className="text-sm text-app-text-muted">
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

              <div className="bg-app-surface rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-app-text-heading mb-4">Donations Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-app-text-muted">Total Amount (YTD)</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(summary.total_donations_ytd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-app-text-muted">Number of Donations</span>
                    <span className="font-medium text-app-text">{summary.donation_count_ytd}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-app-text-muted">Average Donation</span>
                    <span className="font-medium text-app-text">
                      {formatCurrency(summary.average_donation_ytd)}
                    </span>
                  </div>
                  <p className="text-sm text-app-text-muted">
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
            <p className="text-app-text-muted">No analytics data available</p>
          </div>
        )}
      </main>
    </div>
  );
}
