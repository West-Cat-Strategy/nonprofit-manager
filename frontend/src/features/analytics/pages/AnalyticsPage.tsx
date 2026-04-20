/**
 * Analytics Page
 * Displays organization-wide analytics and reporting with charts
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
} from '../../../components/ui';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchAnalyticsSummary,
  fetchComparativeAnalytics,
  fetchDonationTrends,
  fetchEventAttendanceTrends,
  fetchVolunteerHoursTrends,
  setFilters,
} from '../state';
import {
  exportAnalyticsSummaryToCSV,
  exportAnalyticsSummaryToPDF,
  exportConstituentOverviewToCSV,
  exportEngagementToCSV,
} from '../../../utils/exportUtils';
import {
  ConstituentBarChart,
  DonationTrendsChart,
  EngagementPieChart,
  EventAttendanceTrendsChart,
  SummaryStatsChart,
  VolunteerTrendsChart,
} from './charts';
import { ComparisonCard, MetricCard } from './metrics';
import { formatCurrency, formatNumber } from './utils';
import { parseAllowedValue } from '../../../utils/persistedFilters';

const getProgressWidthClass = (value: number): string => {
  if (value <= 0) return 'w-0';
  if (value < 12.5) return 'w-1/12';
  if (value < 25) return 'w-1/4';
  if (value < 37.5) return 'w-1/3';
  if (value < 50) return 'w-1/2';
  if (value < 62.5) return 'w-7/12';
  if (value < 75) return 'w-3/4';
  if (value < 87.5) return 'w-10/12';
  return 'w-full';
};

const COMPARISON_PERIOD_VALUES = ['month', 'quarter', 'year'] as const;
const analyticsActionLinkClass =
  'inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2';
const relatedWorkspaceLinkClass =
  'flex h-full flex-col rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-4 py-4 text-left shadow-sm transition hover:bg-app-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2';
const analyticsInlineLinkClass = 'font-semibold text-app-accent hover:underline';

const relatedWorkspaceLinks = [
  {
    to: '/reports',
    label: 'Reports Home',
    description: 'Re-enter the reports workspace without rebuilding the route from scratch.',
  },
  {
    to: '/reports/builder',
    label: 'Report Builder',
    description: 'Move from charts into a custom report definition when you need deeper slicing.',
  },
  {
    to: '/alerts',
    label: 'Alerts',
    description: 'Review threshold rules and incident handling alongside the analytics signal.',
  },
  {
    to: '/settings/admin/branding',
    label: 'Branding',
    description: 'Check the shared application chrome that frames reports, alerts, and analytics.',
  },
];

const normalizeDateParam = (value: string | null): string =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';

const buildAnalyticsParams = ({
  startDate,
  endDate,
  period,
}: {
  startDate: string;
  endDate: string;
  period: (typeof COMPARISON_PERIOD_VALUES)[number];
}) => {
  const params = new URLSearchParams();
  if (startDate) {
    params.set('start_date', startDate);
  }
  if (endDate) {
    params.set('end_date', endDate);
  }
  if (period !== 'month') {
    params.set('period', period);
  }
  return params;
};

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
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
  } = useAppSelector((state) => state.analytics);

  const appliedStartDate = normalizeDateParam(searchParams.get('start_date'));
  const appliedEndDate = normalizeDateParam(searchParams.get('end_date'));
  const comparisonPeriod =
    parseAllowedValue(searchParams.get('period'), COMPARISON_PERIOD_VALUES) || 'month';
  const [dateRange, setDateRange] = useState({
    start_date: appliedStartDate,
    end_date: appliedEndDate,
  });
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [summaryPdfExporting, setSummaryPdfExporting] = useState(false);

  useEffect(() => {
    setDateRange((current) =>
      current.start_date === appliedStartDate && current.end_date === appliedEndDate
        ? current
        : {
            start_date: appliedStartDate,
            end_date: appliedEndDate,
          }
    );
  }, [appliedStartDate, appliedEndDate]);

  useEffect(() => {
    const sanitizedParams = buildAnalyticsParams({
      startDate: appliedStartDate,
      endDate: appliedEndDate,
      period: comparisonPeriod,
    });
    const currentParams = searchParamsString;
    const nextParams = sanitizedParams.toString();
    if (currentParams !== nextParams) {
      setSearchParams(sanitizedParams, { replace: true });
    }
  }, [appliedStartDate, appliedEndDate, comparisonPeriod, searchParamsString, setSearchParams]);

  useEffect(() => {
    dispatch(
      setFilters({
        start_date: appliedStartDate || undefined,
        end_date: appliedEndDate || undefined,
      })
    );
  }, [appliedEndDate, appliedStartDate, dispatch]);

  useEffect(() => {
    dispatch(
      fetchAnalyticsSummary({
        start_date: appliedStartDate || undefined,
        end_date: appliedEndDate || undefined,
      })
    );
    dispatch(fetchDonationTrends(12));
    dispatch(fetchVolunteerHoursTrends(12));
    dispatch(fetchEventAttendanceTrends(12));
    dispatch(fetchComparativeAnalytics(comparisonPeriod));
  }, [appliedEndDate, appliedStartDate, comparisonPeriod, dispatch]);

  useEffect(() => {
    if (!summary && !comparativeAnalytics) {
      return;
    }
    if (summaryLoading || trendsLoading || comparativeLoading) {
      return;
    }
    setLastUpdatedAt(new Date());
  }, [summary, comparativeAnalytics, summaryLoading, trendsLoading, comparativeLoading]);

  const handleApplyFilters = () => {
    setSearchParams(
      buildAnalyticsParams({
        startDate: dateRange.start_date,
        endDate: dateRange.end_date,
        period: comparisonPeriod,
      }),
      { replace: true }
    );
  };

  const handleClearFilters = () => {
    setDateRange({ start_date: '', end_date: '' });
    setSearchParams(
      buildAnalyticsParams({
        startDate: '',
        endDate: '',
        period: comparisonPeriod,
      }),
      { replace: true }
    );
  };

  const handleComparisonChange = (nextPeriod: (typeof COMPARISON_PERIOD_VALUES)[number]) => {
    setSearchParams(
      buildAnalyticsParams({
        startDate: appliedStartDate,
        endDate: appliedEndDate,
        period: nextPeriod,
      }),
      { replace: true }
    );
  };

  const handleExportSummaryPdf = async () => {
    if (!summary || summaryPdfExporting) return;

    setSummaryPdfExporting(true);
    try {
      await exportAnalyticsSummaryToPDF(summary);
    } finally {
      setSummaryPdfExporting(false);
    }
  };

  return (
    <NeoBrutalistLayout pageTitle="ANALYTICS">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Analytics & Reports"
          description={`Last updated: ${
            lastUpdatedAt
              ? new Intl.DateTimeFormat(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }).format(lastUpdatedAt)
              : 'Not yet loaded'
          }`}
          actions={
            <>
              <Link className={analyticsActionLinkClass} to="/dashboard">
                ← Back
              </Link>
              {summary && (
                <>
                  <SecondaryButton onClick={() => exportAnalyticsSummaryToCSV(summary)}>
                    CSV
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => void handleExportSummaryPdf()}
                    disabled={summaryPdfExporting}
                  >
                    {summaryPdfExporting ? 'Generating PDF...' : 'PDF'}
                  </SecondaryButton>
                </>
              )}
            </>
          }
        />

        <SectionCard
          title="Related workspaces"
          subtitle="Keep the analytics, reporting, alerts, and branding seams easy to navigate during browser review."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {relatedWorkspaceLinks.map((link) => (
              <Link key={link.to} to={link.to} className={relatedWorkspaceLinkClass}>
                <span className="text-sm font-semibold text-app-text-heading">{link.label}</span>
                <span className="mt-2 text-sm leading-6 text-app-text-muted">{link.description}</span>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Date Filters" subtitle="Apply a reporting period to all analytics modules.">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <FormField
                id="start_date"
                type="date"
                label="Start Date"
                value={dateRange.start_date}
                onChange={(event) =>
                  setDateRange((prev) => ({ ...prev, start_date: event.target.value }))
                }
              />
            </div>
            <div>
              <FormField
                id="end_date"
                type="date"
                label="End Date"
                value={dateRange.end_date}
                onChange={(event) =>
                  setDateRange((prev) => ({ ...prev, end_date: event.target.value }))
                }
              />
            </div>
            <PrimaryButton onClick={handleApplyFilters}>Apply Filters</PrimaryButton>
            <SecondaryButton onClick={handleClearFilters}>Clear</SecondaryButton>
          </div>
        </SectionCard>

        {summaryLoading && (
          <div className="space-y-4">
            <LoadingState label="Loading analytics..." />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`kpi-skeleton-${index}`}
                  className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-6"
                >
                  <div className="mb-3 h-4 w-32 animate-pulse rounded bg-app-surface-muted" />
                  <div className="mb-2 h-8 w-24 animate-pulse rounded bg-app-surface-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-app-surface-muted" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!summaryLoading && error && (
          <ErrorState
            message={error}
            onRetry={() => {
              dispatch(
                fetchAnalyticsSummary({
                  start_date: appliedStartDate || undefined,
                  end_date: appliedEndDate || undefined,
                })
              );
              dispatch(fetchDonationTrends(12));
              dispatch(fetchVolunteerHoursTrends(12));
              dispatch(fetchEventAttendanceTrends(12));
              dispatch(fetchComparativeAnalytics(comparisonPeriod));
            }}
            retryLabel="Retry analytics"
          />
        )}

        {!summaryLoading && !error && summary && (
          <>
            <SectionCard title="Key Performance Indicators">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            </SectionCard>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectionCard>
                <div className="relative">
                  <EngagementPieChart distribution={summary.engagement_distribution} />
                  <button
                    type="button"
                    onClick={() => exportEngagementToCSV(summary.engagement_distribution)}
                    className="absolute right-2 top-2 rounded-[var(--ui-radius-sm)] border border-app-border px-2 py-1 text-xs text-app-text-muted hover:bg-app-hover"
                    title="Export Engagement Data (CSV)"
                  >
                    Export
                  </button>
                </div>
              </SectionCard>

              <SectionCard>
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
                    className="absolute right-2 top-2 rounded-[var(--ui-radius-sm)] border border-app-border px-2 py-1 text-xs text-app-text-muted hover:bg-app-hover"
                    title="Export Constituent Data (CSV)"
                  >
                    Export
                  </button>
                </div>
              </SectionCard>
            </div>

            <SectionCard>
              <SummaryStatsChart
                donations={summary.donation_count_ytd}
                events={summary.total_events_ytd}
                volunteerHours={summary.total_volunteer_hours_ytd}
              />
            </SectionCard>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectionCard>
                <DonationTrendsChart data={donationTrends} loading={trendsLoading} />
              </SectionCard>
              <SectionCard>
                <VolunteerTrendsChart data={volunteerHoursTrends} loading={trendsLoading} />
              </SectionCard>
            </div>

            <SectionCard>
              <EventAttendanceTrendsChart data={eventAttendanceTrends} loading={trendsLoading} />
            </SectionCard>

            <SectionCard
              title="Period Comparison"
              subtitle={
                comparativeAnalytics
                  ? `(${comparativeAnalytics.previous_period} vs ${comparativeAnalytics.current_period})`
                  : undefined
              }
              actions={
                <div className="flex gap-2">
                  <SecondaryButton
                    className={comparisonPeriod === 'month' ? 'border-app-accent bg-app-accent-soft text-app-accent-text' : ''}
                    onClick={() => handleComparisonChange('month')}
                  >
                    Month
                  </SecondaryButton>
                  <SecondaryButton
                    className={comparisonPeriod === 'quarter' ? 'border-app-accent bg-app-accent-soft text-app-accent-text' : ''}
                    onClick={() => handleComparisonChange('quarter')}
                  >
                    Quarter
                  </SecondaryButton>
                  <SecondaryButton
                    className={comparisonPeriod === 'year' ? 'border-app-accent bg-app-accent-soft text-app-accent-text' : ''}
                    onClick={() => handleComparisonChange('year')}
                  >
                    Year
                  </SecondaryButton>
                </div>
              }
            >
              {comparativeLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`comparison-skeleton-${index}`}
                      className="rounded-[var(--ui-radius-md)] border border-app-border-muted p-4"
                    >
                      <div className="mb-3 h-4 w-28 animate-pulse rounded bg-app-surface-muted" />
                      <div className="mb-2 h-7 w-24 animate-pulse rounded bg-app-surface-muted" />
                      <div className="h-3 w-20 animate-pulse rounded bg-app-surface-muted" />
                    </div>
                  ))}
                </div>
              ) : comparativeAnalytics ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <EmptyState
                  title="No comparison data available"
                  description="Try another period or widen the date range to include more activity."
                />
              )}
            </SectionCard>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <SectionCard title="Accounts">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-app-text-heading">{summary.total_accounts}</p>
                    <p className="text-sm text-app-text-muted">Total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-app-accent">{summary.active_accounts}</p>
                    <p className="text-sm text-app-text-muted">Active</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 rounded-full bg-app-surface-muted">
                    <div
                      className={`h-2 rounded-full bg-app-accent transition-all ${getProgressWidthClass(
                        summary.total_accounts > 0
                          ? (summary.active_accounts / summary.total_accounts) * 100
                          : 0
                      )}`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-app-text-muted">
                    {summary.total_accounts > 0
                      ? `${((summary.active_accounts / summary.total_accounts) * 100).toFixed(1)}% active`
                      : 'No accounts'}
                  </p>
                </div>
              </SectionCard>

              <SectionCard title="Contacts">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold text-app-text-heading">{summary.total_contacts}</p>
                  <p className="text-sm text-app-text-muted">Total</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-app-accent">{summary.active_contacts}</p>
                  <p className="text-sm text-app-text-muted">Active</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2 rounded-full bg-app-surface-muted">
                  <div
                    className={`h-2 rounded-full bg-app-accent transition-all ${getProgressWidthClass(
                      summary.total_contacts > 0
                        ? (summary.active_contacts / summary.total_contacts) * 100
                        : 0
                    )}`}
                  />
                </div>
                <p className="mt-1 text-xs text-app-text-muted">
                  {summary.total_contacts > 0
                    ? `${((summary.active_contacts / summary.total_contacts) * 100).toFixed(1)}% active`
                    : 'No contacts'}
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Volunteers">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold text-app-text-heading">{summary.total_volunteers}</p>
                  <p className="text-sm text-app-text-muted">Registered</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-app-accent">
                    {formatNumber(summary.total_volunteer_hours_ytd)}
                  </p>
                  <p className="text-sm text-app-text-muted">Hours YTD</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-app-text-muted">
                Avg{' '}
                {summary.total_volunteers > 0
                  ? (summary.total_volunteer_hours_ytd / summary.total_volunteers).toFixed(1)
                  : 0}{' '}
                hours per volunteer
              </p>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SectionCard title="Events Summary">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-app-border-muted pb-3">
                  <span className="text-app-text-muted">Total Events (YTD)</span>
                  <span className="text-xl font-semibold text-app-text">{summary.total_events_ytd}</span>
                </div>
                <p className="text-sm text-app-text-muted">
                  View event details in the{' '}
                  <Link className={analyticsInlineLinkClass} to="/events">
                    Events module
                  </Link>
                </p>
                {summary.total_events_ytd === 0 && (
                  <p className="text-sm text-app-text-muted">
                    No events in this range. Try creating an event or clearing date filters.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Donations Summary">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-app-border-muted pb-3">
                  <span className="text-app-text-muted">Total Amount (YTD)</span>
                  <span className="text-xl font-semibold text-app-accent">
                    {formatCurrency(summary.total_donations_ytd)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-app-border-muted pb-3">
                  <span className="text-app-text-muted">Number of Donations</span>
                  <span className="font-medium text-app-text">{summary.donation_count_ytd}</span>
                </div>
                <div className="flex items-center justify-between border-b border-app-border-muted pb-3">
                  <span className="text-app-text-muted">Average Donation</span>
                  <span className="font-medium text-app-text">
                    {formatCurrency(summary.average_donation_ytd)}
                  </span>
                </div>
                <p className="text-sm text-app-text-muted">
                  View donation details in the{' '}
                  <Link className={analyticsInlineLinkClass} to="/donations">
                    Donations module
                  </Link>
                </p>
                {summary.donation_count_ytd === 0 && (
                  <p className="text-sm text-app-text-muted">
                    No donations in this range. Try recording a donation or widening the date range.
                  </p>
                )}
              </div>
            </SectionCard>
          </div>
        </>
      )}

      {!summaryLoading && !error && !summary && (
        <EmptyState
          title="No analytics data available"
          description="No data is available for the current filters."
          action={
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={handleClearFilters}>Clear Filters</PrimaryButton>
              <Link className={analyticsActionLinkClass} to="/donations/new">
                Add Donation
              </Link>
            </div>
          }
        />
      )}
      </div>
    </NeoBrutalistLayout>
  );
}
