import { memo, useMemo } from 'react';
import { formatCurrency, formatNumber } from '../../utils/format';
import KPICard from './KPICard';
import type { KPICardProps } from './KPICard';
import type { KpiKey, DashboardSettings } from './types';

interface KPISectionProps {
  summary: {
    total_donations_ytd: number;
    donation_count_ytd: number;
    average_donation_ytd: number;
    active_accounts: number;
    total_accounts: number;
    active_contacts: number;
    total_contacts: number;
    total_volunteers: number;
    total_volunteer_hours_ytd: number;
    total_events_ytd: number;
    engagement_distribution: { high: number; medium: number };
  } | null;
  activeCasesCount: number;
  urgentCasesCount: number;
  casesDueThisWeekCount: number;
  loading: boolean;
  error: string | null;
  kpiSettings: DashboardSettings['kpis'];
}

interface KpiCardDef {
  key: KpiKey;
  title: string;
  value: string | number;
  subtitle?: string;
  caption: string;
  color: KPICardProps['color'];
}

function buildKpiCards(
  summary: NonNullable<KPISectionProps['summary']>,
  activeCasesCount: number,
  urgentCasesCount: number,
  casesDueThisWeekCount: number,
): KpiCardDef[] {
  return [
    {
      key: 'totalDonations',
      title: 'Total Donations',
      value: formatCurrency(summary.total_donations_ytd),
      subtitle: `${summary.donation_count_ytd} donations`,
      caption: 'Year to date',
      color: 'green',
    },
    {
      key: 'avgDonation',
      title: 'Avg. Donation',
      value: formatCurrency(summary.average_donation_ytd),
      caption: 'Year to date',
      color: 'green',
    },
    {
      key: 'activeAccounts',
      title: 'Active Accounts',
      value: formatNumber(summary.active_accounts),
      subtitle: `${summary.total_accounts} total`,
      caption: 'Current',
      color: 'yellow',
    },
    {
      key: 'activeContacts',
      title: 'Active Contacts',
      value: formatNumber(summary.active_contacts),
      subtitle: `${summary.total_contacts} total`,
      caption: 'Current',
      color: 'teal',
    },
    {
      key: 'activeCases',
      title: 'Active Cases',
      value: activeCasesCount,
      subtitle:
        urgentCasesCount > 0
          ? `${urgentCasesCount} urgent, ${casesDueThisWeekCount} due this week`
          : `${casesDueThisWeekCount} due this week`,
      caption: 'Open work',
      color: 'red',
    },
    {
      key: 'volunteers',
      title: 'Volunteers',
      value: formatNumber(summary.total_volunteers),
      caption: 'Rostered',
      color: 'blue',
    },
    {
      key: 'volunteerHours',
      title: 'Volunteer Hours',
      value: formatNumber(summary.total_volunteer_hours_ytd),
      subtitle: 'hours logged',
      caption: 'Year to date',
      color: 'blue',
    },
    {
      key: 'events',
      title: 'Events',
      value: formatNumber(summary.total_events_ytd),
      subtitle: 'this year',
      caption: 'Program calendar',
      color: 'purple',
    },
    {
      key: 'engagement',
      title: 'Engagement',
      value: `${summary.engagement_distribution.high + summary.engagement_distribution.medium}`,
      subtitle: 'highly/medium engaged',
      caption: 'Last 30 days',
      color: 'indigo',
    },
  ];
}

function KPISection({
  summary,
  activeCasesCount,
  urgentCasesCount,
  casesDueThisWeekCount,
  loading,
  error,
  kpiSettings,
}: KPISectionProps) {
  const visibleCards = useMemo(() => {
    if (!summary) return [];
    return buildKpiCards(summary, activeCasesCount, urgentCasesCount, casesDueThisWeekCount)
      .filter((card) => kpiSettings[card.key]);
  }, [summary, activeCasesCount, urgentCasesCount, casesDueThisWeekCount, kpiSettings]);

  return (
    <section className="mt-6" aria-labelledby="key-metrics-heading">
      <h2 id="key-metrics-heading" className="text-lg font-semibold text-slate-900">Key Metrics (YTD)</h2>
      <p className="mt-1 text-sm text-slate-500">
        Snapshot of year-to-date activity across fundraising and engagement.
      </p>
      <div className="mt-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading metrics">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
            {error}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {visibleCards.map((card) => (
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
  );
}

export default memo(KPISection);
