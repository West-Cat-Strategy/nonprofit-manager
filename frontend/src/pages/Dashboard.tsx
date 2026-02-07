import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAnalyticsSummary } from '../store/slices/analyticsSlice';
import { fetchCases, selectActiveCases, selectUrgentCases, selectCasesDueThisWeek } from '../store/slices/casesSlice';
import { formatCurrency, formatNumber } from '../utils/format';
import { useDashboardSettings } from '../hooks/useDashboardSettings';
import VolunteerWidget from '../components/VolunteerWidget';
import {
  QuickLookupWidget,
  QuickActionsWidget,
  KPICard,
  EngagementChart,
  ModulesGrid,
  PriorityCards,
  DashboardCustomizer,
} from '../components/dashboard';
import type { KpiKey } from '../components/dashboard';

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { summary, summaryLoading, error } = useAppSelector((state) => state.analytics);
  const [showCustomize, setShowCustomize] = useState(false);
  const { settings, setSettings, resetSettings } = useDashboardSettings();

  // Get case metrics
  const activeCases = useAppSelector(selectActiveCases);
  const urgentCases = useAppSelector(selectUrgentCases);
  const casesDueThisWeek = useAppSelector(selectCasesDueThisWeek);

  useEffect(() => {
    dispatch(fetchAnalyticsSummary());
    dispatch(fetchCases({}));
  }, [dispatch]);

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        key: 'totalDonations' as KpiKey,
        title: 'Total Donations',
        value: formatCurrency(summary.total_donations_ytd),
        subtitle: `${summary.donation_count_ytd} donations`,
        caption: 'Year to date',
        color: 'green' as const,
      },
      {
        key: 'avgDonation' as KpiKey,
        title: 'Avg. Donation',
        value: formatCurrency(summary.average_donation_ytd),
        caption: 'Year to date',
        color: 'green' as const,
      },
      {
        key: 'activeAccounts' as KpiKey,
        title: 'Active Accounts',
        value: formatNumber(summary.active_accounts),
        subtitle: `${summary.total_accounts} total`,
        caption: 'Current',
        color: 'yellow' as const,
      },
      {
        key: 'activeContacts' as KpiKey,
        title: 'Active Contacts',
        value: formatNumber(summary.active_contacts),
        subtitle: `${summary.total_contacts} total`,
        caption: 'Current',
        color: 'teal' as const,
      },
      {
        key: 'activeCases' as KpiKey,
        title: 'Active Cases',
        value: activeCases.length,
        subtitle:
          urgentCases.length > 0
            ? `${urgentCases.length} urgent, ${casesDueThisWeek.length} due this week`
            : `${casesDueThisWeek.length} due this week`,
        caption: 'Open work',
        color: 'red' as const,
      },
      {
        key: 'volunteers' as KpiKey,
        title: 'Volunteers',
        value: formatNumber(summary.total_volunteers),
        caption: 'Rostered',
        color: 'blue' as const,
      },
      {
        key: 'volunteerHours' as KpiKey,
        title: 'Volunteer Hours',
        value: formatNumber(summary.total_volunteer_hours_ytd),
        subtitle: 'hours logged',
        caption: 'Year to date',
        color: 'blue' as const,
      },
      {
        key: 'events' as KpiKey,
        title: 'Events',
        value: formatNumber(summary.total_events_ytd),
        subtitle: 'this year',
        caption: 'Program calendar',
        color: 'purple' as const,
      },
      {
        key: 'engagement' as KpiKey,
        title: 'Engagement',
        value: `${summary.engagement_distribution.high + summary.engagement_distribution.medium}`,
        subtitle: 'highly/medium engaged',
        caption: 'Last 30 days',
        color: 'indigo' as const,
      },
    ];
  }, [summary, activeCases.length, urgentCases.length, casesDueThisWeek.length]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 font-body">
      {/* Header */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6 shadow-sm">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-sky-200/40 blur-2xl" aria-hidden="true" />
        <div className="absolute -left-12 -bottom-24 h-56 w-56 rounded-full bg-emerald-200/30 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Overview
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-500">
              Monitor your nonprofit's engagement, fundraising, and program delivery at a glance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowCustomize((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              aria-expanded={showCustomize}
              aria-controls="dashboard-customizer"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                />
              </svg>
              <span>{showCustomize ? 'Close' : 'Edit'} Metrics</span>
            </button>
            <Link
              to="/dashboard/custom"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                />
              </svg>
              <span>Customize Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Customizer Panel */}
      {showCustomize && (
        <div id="dashboard-customizer">
          <DashboardCustomizer
            settings={settings}
            onSettingsChange={setSettings}
            onReset={resetSettings}
          />
        </div>
      )}

      {/* Quick Lookup */}
      {settings.showQuickLookup && (
        <section className="mt-6" aria-label="Quick lookup">
          <QuickLookupWidget />
        </section>
      )}

      {/* Quick Actions */}
      {settings.showQuickActions && (
        <section className="mt-6" aria-label="Quick actions">
          <QuickActionsWidget />
        </section>
      )}

      {/* Priority Cards */}
      <PriorityCards
        urgentCasesCount={urgentCases.length}
        casesDueThisWeekCount={casesDueThisWeek.length}
        highEngagementCount={summary?.engagement_distribution.high ?? 0}
      />

      {/* Modules Grid */}
      {settings.showModules && (
        <ModulesGrid
          summary={summary}
          activeCasesCount={activeCases.length}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Key Metrics */}
      <section className="mt-6" aria-labelledby="key-metrics-heading">
        <h2 id="key-metrics-heading" className="text-lg font-semibold text-slate-900">Key Metrics (YTD)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Snapshot of year-to-date activity across fundraising and engagement.
        </p>
        <div className="mt-4">
          {summaryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading metrics">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
              {error}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpiCards
                .filter((card) => settings.kpis[card.key])
                .map((card) => (
                  <KPICard
                    key={card.key}
                    title={card.title}
                    value={card.value}
                    subtitle={card.subtitle}
                    color={card.color}
                  />
                ))}
            </div>
          ) : (
            <div className="text-slate-500">No analytics data available</div>
          )}
        </div>
      </section>

      {/* Engagement Chart */}
      {summary && settings.showEngagementChart && (
        <section className="mt-6" aria-label="Engagement distribution">
          <EngagementChart distribution={summary.engagement_distribution} />
        </section>
      )}

      {/* Volunteer Widget */}
      {settings.showVolunteerWidget && (
        <section className="mt-6" aria-label="Volunteer information">
          <VolunteerWidget showDetailedView={true} />
        </section>
      )}
    </main>
  );
}
