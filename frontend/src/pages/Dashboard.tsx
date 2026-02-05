import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAnalyticsSummary } from '../store/slices/analyticsSlice';
import { fetchCases, selectActiveCases, selectUrgentCases, selectCasesDueThisWeek } from '../store/slices/casesSlice';
import VolunteerWidget from '../components/VolunteerWidget';
import QuickLookupWidget from '../components/dashboard/QuickLookupWidget';
import QuickActionsWidget from '../components/dashboard/QuickActionsWidget';
import api from '../services/api';

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
 * KPI Card Component
 */
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  caption?: string;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'teal' | 'indigo';
  icon?: React.ReactNode;
}

type KpiKey =
  | 'totalDonations'
  | 'avgDonation'
  | 'activeAccounts'
  | 'activeContacts'
  | 'activeCases'
  | 'volunteers'
  | 'volunteerHours'
  | 'events'
  | 'engagement';

interface DashboardSettings {
  showQuickLookup: boolean;
  showQuickActions: boolean;
  showModules: boolean;
  showEngagementChart: boolean;
  showVolunteerWidget: boolean;
  kpis: Record<KpiKey, boolean>;
}

const DASHBOARD_SETTINGS_KEY = 'dashboardSettings';
const DASHBOARD_SETTINGS_PREF_KEY = 'dashboard_settings';

const defaultDashboardSettings: DashboardSettings = {
  showQuickLookup: true,
  showQuickActions: true,
  showModules: true,
  showEngagementChart: true,
  showVolunteerWidget: true,
  kpis: {
    totalDonations: true,
    avgDonation: true,
    activeAccounts: true,
    activeContacts: true,
    activeCases: true,
    volunteers: true,
    volunteerHours: true,
    events: true,
    engagement: true,
  },
};

const loadDashboardSettings = (): DashboardSettings => {
  try {
    const raw = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (!raw) return defaultDashboardSettings;
    const parsed = JSON.parse(raw) as DashboardSettings;
    return {
      ...defaultDashboardSettings,
      ...parsed,
      kpis: {
        ...defaultDashboardSettings.kpis,
        ...(parsed.kpis || {}),
      },
    };
  } catch {
    return defaultDashboardSettings;
  }
};

const saveDashboardSettings = (settings: DashboardSettings) => {
  try {
    localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
};

function KPICard({ title, value, subtitle, caption, color }: KPICardProps) {
  const accentGlow = {
    blue: 'bg-sky-200/60',
    green: 'bg-emerald-200/60',
    purple: 'bg-violet-200/60',
    yellow: 'bg-amber-200/60',
    red: 'bg-rose-200/60',
    teal: 'bg-teal-200/60',
    indigo: 'bg-indigo-200/60',
  };

  const accentText = {
    blue: 'text-sky-700',
    green: 'text-emerald-700',
    purple: 'text-violet-700',
    yellow: 'text-amber-700',
    red: 'text-rose-700',
    teal: 'text-teal-700',
    indigo: 'text-indigo-700',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${accentGlow[color]}`} />
      <div className="relative">
        <p className={`text-xs font-semibold uppercase tracking-wide ${accentText[color]}`}>
          {title}
        </p>
        <p className="font-display mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        {caption && <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{caption}</p>}
      </div>
    </div>
  );
}

/**
 * Engagement Distribution Chart
 */
interface EngagementChartProps {
  distribution: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
}

function EngagementChart({ distribution }: EngagementChartProps) {
  const total = distribution.high + distribution.medium + distribution.low + distribution.inactive;
  if (total === 0) return null;

  const segments = [
    { label: 'High', value: distribution.high, color: 'bg-green-500' },
    { label: 'Medium', value: distribution.medium, color: 'bg-yellow-500' },
    { label: 'Low', value: distribution.low, color: 'bg-orange-500' },
    { label: 'Inactive', value: distribution.inactive, color: 'bg-gray-400' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Engagement Distribution</h3>
        <span className="text-xs text-slate-400">Last 30 days</span>
      </div>
      <div className="mt-4 flex h-3 rounded-full overflow-hidden bg-slate-100">
        {segments.map(
          (segment) =>
            segment.value > 0 && (
              <div
                key={segment.label}
                className={`${segment.color}`}
                style={{ width: `${(segment.value / total) * 100}%` }}
                title={`${segment.label}: ${segment.value}`}
              />
            )
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${segment.color}`} />
            <span className="text-slate-600">
              {segment.label}: {segment.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { summary, summaryLoading, error } = useAppSelector((state) => state.analytics);
  const [showCustomize, setShowCustomize] = useState(false);
  const [settings, setSettings] = useState<DashboardSettings>(defaultDashboardSettings);

  // Get case metrics
  const activeCases = useAppSelector(selectActiveCases);
  const urgentCases = useAppSelector(selectUrgentCases);
  const casesDueThisWeek = useAppSelector(selectCasesDueThisWeek);

  useEffect(() => {
    dispatch(fetchAnalyticsSummary());
    dispatch(fetchCases({}));
  }, [dispatch]);

  useEffect(() => {
    let isMounted = true;
    const localSettings = loadDashboardSettings();
    setSettings(localSettings);

    const fetchServerSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await api.get('/auth/preferences');
        const serverPrefs = response.data?.preferences || {};
        if (serverPrefs[DASHBOARD_SETTINGS_PREF_KEY]) {
          const merged = {
            ...defaultDashboardSettings,
            ...serverPrefs[DASHBOARD_SETTINGS_PREF_KEY],
            kpis: {
              ...defaultDashboardSettings.kpis,
              ...(serverPrefs[DASHBOARD_SETTINGS_PREF_KEY].kpis || {}),
            },
          } as DashboardSettings;
          if (isMounted) {
            setSettings(merged);
            saveDashboardSettings(merged);
          }
        }
      } catch {
        // Keep local settings if server fetch fails
      }
    };

    fetchServerSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    saveDashboardSettings(settings);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        await api.patch(`/auth/preferences/${DASHBOARD_SETTINGS_PREF_KEY}`, {
          value: settings,
        });
      } catch {
        // Ignore save errors (local cache still updated)
      }
    }, 400);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [settings]);

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        key: 'totalDonations' as const,
        title: 'Total Donations',
        value: formatCurrency(summary.total_donations_ytd),
        subtitle: `${summary.donation_count_ytd} donations`,
        caption: 'Year to date',
        color: 'green' as const,
      },
      {
        key: 'avgDonation' as const,
        title: 'Avg. Donation',
        value: formatCurrency(summary.average_donation_ytd),
        caption: 'Year to date',
        color: 'green' as const,
      },
      {
        key: 'activeAccounts' as const,
        title: 'Active Accounts',
        value: formatNumber(summary.active_accounts),
        subtitle: `${summary.total_accounts} total`,
        caption: 'Current',
        color: 'yellow' as const,
      },
      {
        key: 'activeContacts' as const,
        title: 'Active Contacts',
        value: formatNumber(summary.active_contacts),
        subtitle: `${summary.total_contacts} total`,
        caption: 'Current',
        color: 'teal' as const,
      },
      {
        key: 'activeCases' as const,
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
        key: 'volunteers' as const,
        title: 'Volunteers',
        value: formatNumber(summary.total_volunteers),
        caption: 'Rostered',
        color: 'blue' as const,
      },
      {
        key: 'volunteerHours' as const,
        title: 'Volunteer Hours',
        value: formatNumber(summary.total_volunteer_hours_ytd),
        subtitle: 'hours logged',
        caption: 'Year to date',
        color: 'blue' as const,
      },
      {
        key: 'events' as const,
        title: 'Events',
        value: formatNumber(summary.total_events_ytd),
        subtitle: 'this year',
        caption: 'Program calendar',
        color: 'purple' as const,
      },
      {
        key: 'engagement' as const,
        title: 'Engagement',
        value: `${summary.engagement_distribution.high + summary.engagement_distribution.medium}`,
        subtitle: 'highly/medium engaged',
        caption: 'Last 30 days',
        color: 'indigo' as const,
      },
    ];
  }, [summary, activeCases.length, urgentCases.length, casesDueThisWeek.length]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 font-body">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6 shadow-sm">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-sky-200/40 blur-2xl" />
        <div className="absolute -left-12 -bottom-24 h-56 w-56 rounded-full bg-emerald-200/30 blur-2xl" />
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {showCustomize && (
        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Visible Metrics</h2>
              <p className="text-sm text-slate-500">Choose which metrics and sections to show.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(defaultDashboardSettings)}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Reset defaults
            </button>
          </div>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Sections</h3>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={settings.showQuickLookup}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, showQuickLookup: e.target.checked }))
                  }
                />
                Quick lookup
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={settings.showQuickActions}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, showQuickActions: e.target.checked }))
                  }
                />
                Quick actions
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={settings.showModules}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, showModules: e.target.checked }))
                  }
                />
                Modules
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={settings.showEngagementChart}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, showEngagementChart: e.target.checked }))
                  }
                />
                Engagement chart
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={settings.showVolunteerWidget}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, showVolunteerWidget: e.target.checked }))
                  }
                />
                Volunteer widget
              </label>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">KPI cards</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(settings.kpis).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          kpis: { ...prev.kpis, [key]: e.target.checked },
                        }))
                      }
                    />
                    {key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (c) => c.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {settings.showQuickLookup && (
        <section className="mt-6">
          <QuickLookupWidget />
        </section>
      )}

      {settings.showQuickActions && (
        <section className="mt-6">
          <QuickActionsWidget />
        </section>
      )}

      <section className="mt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-sm">
            <div className="absolute -right-10 -top-10 h-20 w-20 rounded-full bg-rose-200/50" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Priority</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {urgentCases.length}
              </p>
              <p className="mt-1 text-sm text-slate-600">Urgent cases need attention</p>
              <Link className="mt-3 inline-flex text-xs font-semibold text-rose-600 hover:text-rose-700" to="/cases">
                Review cases
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-sm">
            <div className="absolute -right-10 -top-10 h-20 w-20 rounded-full bg-amber-200/50" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">This Week</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {casesDueThisWeek.length}
              </p>
              <p className="mt-1 text-sm text-slate-600">Cases due for follow-up</p>
              <Link className="mt-3 inline-flex text-xs font-semibold text-amber-600 hover:text-amber-700" to="/cases">
                Plan follow-ups
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-sm">
            <div className="absolute -right-10 -top-10 h-20 w-20 rounded-full bg-emerald-200/50" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Engagement</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {summary ? summary.engagement_distribution.high : 0}
              </p>
              <p className="mt-1 text-sm text-slate-600">Highly engaged constituents</p>
              <Link className="mt-3 inline-flex text-xs font-semibold text-emerald-600 hover:text-emerald-700" to="/analytics">
                View reports
              </Link>
            </div>
          </div>
        </div>
      </section>

      {settings.showModules && (
        <section className="mt-6 rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Modules</h2>
              <p className="text-sm text-slate-500">Jump into the workstreams you manage most.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/accounts"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-amber-200/50" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-slate-900">Accounts</h3>
                <p className="mt-1 text-sm text-slate-600">Manage organizations and households</p>
                {summary && (
                  <p className="mt-3 text-xs text-slate-500">
                    {summary.active_accounts} active accounts
                  </p>
                )}
              </div>
            </Link>

            <Link
              to="/contacts"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-teal-200/50" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-slate-900">People</h3>
                <p className="mt-1 text-sm text-slate-600">Keep constituent profiles updated</p>
                {summary && (
                  <p className="mt-3 text-xs text-slate-500">
                    {summary.active_contacts} active people
                  </p>
                )}
              </div>
            </Link>

            <Link
              to="/volunteers"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-sky-200/50" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-slate-900">Volunteers</h3>
                <p className="mt-1 text-sm text-slate-600">Coordinate volunteer programs</p>
                {summary && (
                  <p className="mt-3 text-xs text-slate-500">
                    {summary.total_volunteers} volunteers
                  </p>
                )}
              </div>
            </Link>

            <Link
              to="/events"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-200/50" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-slate-900">Events</h3>
                <p className="mt-1 text-sm text-slate-600">Plan and track event operations</p>
                {summary && (
                  <p className="mt-3 text-xs text-slate-500">
                    {summary.total_events_ytd} events this year
                  </p>
                )}
              </div>
            </Link>

            <Link
              to="/donations"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-200/50" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-slate-900">Donations</h3>
                <p className="mt-1 text-sm text-slate-600">Track giving and stewardship</p>
                {summary && (
                  <p className="mt-3 text-xs text-slate-500">
                    {formatCurrency(summary.total_donations_ytd)} YTD
                  </p>
                )}
              </div>
            </Link>

            <Link
              to="/tasks"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-rose-200/50" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-slate-900">Tasks</h3>
                <p className="mt-1 text-sm text-slate-600">Stay on top of team to-dos</p>
              </div>
            </Link>

            <Link
              to="/cases"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-red-200/50" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-slate-900">Cases</h3>
                <p className="mt-1 text-sm text-slate-600">Track client cases and follow-ups</p>
                <p className="mt-3 text-xs text-slate-500">{activeCases.length} active cases</p>
              </div>
            </Link>

            <Link
              to="/analytics"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-indigo-200/50" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-slate-900">Reports</h3>
                <p className="mt-1 text-sm text-slate-600">Dig into trends and insights</p>
              </div>
            </Link>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Key Metrics (YTD)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Snapshot of year-to-date activity across fundraising and engagement.
        </p>
        <div className="mt-4">
          {summaryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
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

      {summary && settings.showEngagementChart && (
        <section className="mt-6">
          <EngagementChart distribution={summary.engagement_distribution} />
        </section>
      )}

      {settings.showVolunteerWidget && (
        <section className="mt-6">
          <VolunteerWidget showDetailedView={true} />
        </section>
      )}
    </div>
  );
}
