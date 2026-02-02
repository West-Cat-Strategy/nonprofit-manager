import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { fetchAnalyticsSummary } from '../store/slices/analyticsSlice';
import VolunteerWidget from '../components/VolunteerWidget';

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
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { summary, summaryLoading, error } = useAppSelector((state) => state.analytics);

  useEffect(() => {
    dispatch(fetchAnalyticsSummary());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Nonprofit Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
                <KPICard
                  title="Total Donations"
                  value={formatCurrency(summary.total_donations_ytd)}
                  subtitle={`${summary.donation_count_ytd} donations`}
                  color="green"
                />
                <KPICard
                  title="Avg. Donation"
                  value={formatCurrency(summary.average_donation_ytd)}
                  color="green"
                />
                <KPICard
                  title="Active Accounts"
                  value={formatNumber(summary.active_accounts)}
                  subtitle={`${summary.total_accounts} total`}
                  color="yellow"
                />
                <KPICard
                  title="Active Contacts"
                  value={formatNumber(summary.active_contacts)}
                  subtitle={`${summary.total_contacts} total`}
                  color="teal"
                />
                <KPICard
                  title="Volunteers"
                  value={formatNumber(summary.total_volunteers)}
                  color="blue"
                />
                <KPICard
                  title="Volunteer Hours"
                  value={formatNumber(summary.total_volunteer_hours_ytd)}
                  subtitle="hours logged"
                  color="blue"
                />
                <KPICard
                  title="Events"
                  value={formatNumber(summary.total_events_ytd)}
                  subtitle="this year"
                  color="purple"
                />
                <KPICard
                  title="Engagement"
                  value={`${summary.engagement_distribution.high + summary.engagement_distribution.medium}`}
                  subtitle="highly/medium engaged"
                  color="indigo"
                />
              </div>
            ) : (
              <div className="text-gray-500">No analytics data available</div>
            )}
          </div>

          {/* Engagement Distribution */}
          {summary && (
            <div className="mb-6">
              <EngagementChart distribution={summary.engagement_distribution} />
            </div>
          )}

          {/* Volunteer Widget */}
          <div className="mb-6">
            <VolunteerWidget showDetailedView={true} />
          </div>

          {/* Module Navigation Cards */}
          <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Modules</h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => navigate('/accounts')}
                className="bg-yellow-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left"
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
              </button>

              <button
                onClick={() => navigate('/contacts')}
                className="bg-teal-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-teal-900">Contacts</h3>
                      <p className="mt-1 text-sm text-teal-700">Manage individual contacts</p>
                      {summary && (
                        <p className="mt-2 text-xs text-teal-600">
                          {summary.active_contacts} active contacts
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/volunteers')}
                className="bg-blue-50 overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer text-left"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-blue-900">Volunteers</h3>
                      <p className="mt-1 text-sm text-blue-700">
                        Manage volunteer profiles and assignments
                      </p>
                      {summary && (
                        <p className="mt-2 text-xs text-blue-600">
                          {summary.total_volunteers} volunteers |{' '}
                          {formatNumber(summary.total_volunteer_hours_ytd)} hrs
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/events')}
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
              </button>

              <button
                onClick={() => navigate('/donations')}
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
              </button>

              <button
                onClick={() => navigate('/tasks')}
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
              </button>

              <button
                onClick={() => navigate('/analytics')}
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
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
