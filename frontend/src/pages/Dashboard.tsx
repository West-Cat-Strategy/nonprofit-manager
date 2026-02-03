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

function KPICard({ title, value, subtitle, color }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    teal: 'bg-teal-50 border-teal-200',
    indigo: 'bg-indigo-50 border-indigo-200',
  };

  const textColorClasses = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    purple: 'text-purple-900',
    yellow: 'text-yellow-900',
    red: 'text-red-900',
    teal: 'text-teal-900',
    indigo: 'text-indigo-900',
  };

  const subtitleColorClasses = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    yellow: 'text-yellow-700',
    red: 'text-red-700',
    teal: 'text-teal-700',
    indigo: 'text-indigo-700',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <p className={`text-sm font-medium ${subtitleColorClasses[color]}`}>{title}</p>
      <p className={`mt-1 text-2xl font-bold ${textColorClasses[color]}`}>{value}</p>
      {subtitle && <p className={`mt-1 text-xs ${subtitleColorClasses[color]}`}>{subtitle}</p>}
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
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Engagement Distribution</h3>
      <div className="flex h-4 rounded-full overflow-hidden mb-3">
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
      <div className="flex flex-wrap gap-3 text-xs">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${segment.color}`} />
            <span className="text-gray-600">
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
        color: 'green' as const,
      },
      {
        key: 'avgDonation' as const,
        title: 'Avg. Donation',
        value: formatCurrency(summary.average_donation_ytd),
        color: 'green' as const,
      },
      {
        key: 'activeAccounts' as const,
        title: 'Active Accounts',
        value: formatNumber(summary.active_accounts),
        subtitle: `${summary.total_accounts} total`,
        color: 'yellow' as const,
      },
      {
        key: 'activeContacts' as const,
        title: 'Active Contacts',
        value: formatNumber(summary.active_contacts),
        subtitle: `${summary.total_contacts} total`,
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
        color: 'red' as const,
      },
      {
        key: 'volunteers' as const,
        title: 'Volunteers',
        value: formatNumber(summary.total_volunteers),
        color: 'blue' as const,
      },
      {
        key: 'volunteerHours' as const,
        title: 'Volunteer Hours',
        value: formatNumber(summary.total_volunteer_hours_ytd),
        subtitle: 'hours logged',
        color: 'blue' as const,
      },
      {
        key: 'events' as const,
        title: 'Events',
        value: formatNumber(summary.total_events_ytd),
        subtitle: 'this year',
        color: 'purple' as const,
      },
      {
        key: 'engagement' as const,
        title: 'Engagement',
        value: `${summary.engagement_distribution.high + summary.engagement_distribution.medium}`,
        subtitle: 'highly/medium engaged',
        color: 'indigo' as const,
      },
    ];
  }, [summary, activeCases.length, urgentCases.length, casesDueThisWeek.length]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Overview of your organization's key metrics</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCustomize((prev) => !prev)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
                <span>{showCustomize ? 'Close' : 'Edit'} Metrics</span>
              </button>
              <Link
                to="/dashboard/custom"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
                <span>Customize Dashboard</span>
              </Link>
            </div>
          </div>

          {showCustomize && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Visible Metrics</h2>
                  <p className="text-sm text-gray-500">Choose which metrics and sections to show</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings(defaultDashboardSettings)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Reset defaults
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Sections</h3>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={settings.showQuickLookup}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, showQuickLookup: e.target.checked }))
                      }
                    />
                    Quick lookup
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                    <input
                      type="checkbox"
                      checked={settings.showQuickActions}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, showQuickActions: e.target.checked }))
                      }
                    />
                    Quick actions
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                    <input
                      type="checkbox"
                      checked={settings.showModules}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, showModules: e.target.checked }))
                      }
                    />
                    Modules
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                    <input
                      type="checkbox"
                      checked={settings.showEngagementChart}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, showEngagementChart: e.target.checked }))
                      }
                    />
                    Engagement chart
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
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
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">KPI cards</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(settings.kpis).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
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

          {/* Quick Lookup Section */}
          {settings.showQuickLookup && (
            <div className="mb-6">
              <QuickLookupWidget />
            </div>
          )}

          {/* Quick Actions */}
          {settings.showQuickActions && (
            <div className="mb-6">
              <QuickActionsWidget />
            </div>
          )}

          {/* Module Navigation Cards */}
          {settings.showModules && (
            <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Modules</h2>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  to="/accounts"
                  className="bg-yellow-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left block"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-yellow-900">Accounts</h3>
                        <p className="mt-1 text-sm text-yellow-700">
                          Manage organizations and individuals
                        </p>
                        {summary && (
                          <p className="mt-2 text-xs text-yellow-600">
                            {summary.active_accounts} active accounts
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/contacts"
                  className="bg-teal-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-teal-900">People</h3>
                        <p className="mt-1 text-sm text-teal-700">Manage individual people</p>
                        {summary && (
                          <p className="mt-2 text-xs text-teal-600">
                            {summary.active_contacts} active people
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/volunteers"
                  className="bg-blue-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-blue-900">Volunteers</h3>
                        <p className="mt-1 text-sm text-blue-700">Manage volunteer programs</p>
                        {summary && (
                          <p className="mt-2 text-xs text-blue-600">
                            {summary.total_volunteers} volunteers
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/events"
                  className="bg-green-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-green-900">Events</h3>
                        <p className="mt-1 text-sm text-green-700">Schedule and track events</p>
                        {summary && (
                          <p className="mt-2 text-xs text-green-600">
                            {summary.total_events_ytd} events this year
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/donations"
                  className="bg-purple-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-purple-900">Donations</h3>
                        <p className="mt-1 text-sm text-purple-700">Track donations and donors</p>
                        {summary && (
                          <p className="mt-2 text-xs text-purple-600">
                            {formatCurrency(summary.total_donations_ytd)} YTD
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/tasks"
                  className="bg-red-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-red-900">Tasks</h3>
                        <p className="mt-1 text-sm text-red-700">Organize and track tasks</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/analytics"
                  className="bg-indigo-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-indigo-900">Reports</h3>
                        <p className="mt-1 text-sm text-indigo-700">Analytics and insights</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* KPI Cards Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics (YTD)</h2>
            {summaryLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-24" />
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
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
              <div className="text-gray-500">No analytics data available</div>
            )}
          </div>

          {/* Engagement Distribution */}
          {summary && settings.showEngagementChart && (
            <div className="mb-6">
              <EngagementChart distribution={summary.engagement_distribution} />
            </div>
          )}

          {/* Volunteer Widget */}
          {settings.showVolunteerWidget && (
            <div className="mb-6">
              <VolunteerWidget showDetailedView={true} />
            </div>
          )}
        </div>
      </div>
  );
}
