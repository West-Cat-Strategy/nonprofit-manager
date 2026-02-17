import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchVolunteers } from '../store/slices/volunteersSlice';

interface VolunteerStats {
  total: number;
  available: number;
  limited: number;
  unavailable: number;
  totalHoursThisMonth: number;
  activeAssignments: number;
}

interface VolunteerWidgetProps {
  stats?: VolunteerStats;
  showDetailedView?: boolean;
}

const statCards = [
  { key: 'total' as const, label: 'Total', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-600', sub: 'text-sky-700' },
  { key: 'available' as const, label: 'Available', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', sub: 'text-emerald-700' },
  { key: 'limited' as const, label: 'Limited', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', sub: 'text-amber-700' },
  { key: 'unavailable' as const, label: 'Unavailable', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', sub: 'text-rose-700' },
];

const availabilityBadge: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-800',
  limited: 'bg-amber-100 text-amber-800',
  unavailable: 'bg-rose-100 text-rose-800',
};

const VolunteerWidget = ({ stats, showDetailedView = false }: VolunteerWidgetProps) => {
  const dispatch = useAppDispatch();
  const { volunteers, loading } = useAppSelector((state) => state.volunteers);

  useEffect(() => {
    if (!stats && volunteers.length === 0) {
      dispatch(fetchVolunteers({ limit: 100, is_active: true }));
    }
  }, [dispatch, stats, volunteers.length]);

  const calculatedStats: VolunteerStats = useMemo(() => 
    stats || {
      total: volunteers.length,
      available: volunteers.filter((v) => v.availability_status === 'available').length,
      limited: volunteers.filter((v) => v.availability_status === 'limited').length,
      unavailable: volunteers.filter((v) => v.availability_status === 'unavailable').length,
      totalHoursThisMonth: volunteers.reduce((sum, v) => sum + (v.total_hours_logged || 0), 0),
      activeAssignments: 0,
    },
    [stats, volunteers],
  );

  const topVolunteers = useMemo(
    () => [...volunteers]
      .sort((a, b) => (b.total_hours_logged || 0) - (a.total_hours_logged || 0))
      .slice(0, 5),
    [volunteers],
  );

  if (loading && volunteers.length === 0) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-app-surface-muted rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-app-surface-muted rounded" />
            <div className="h-4 bg-app-surface-muted rounded" />
            <div className="h-4 bg-app-surface-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-app-border bg-app-surface shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-app-border">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-app-text-heading">Volunteer Overview</h3>
          <Link
            to="/volunteers"
            className="text-sm text-sky-600 hover:text-sky-800 font-medium"
          >
            View All &rarr;
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <div key={card.key} className={`text-center p-4 ${card.bg} rounded-xl border ${card.border}`}>
              <div className={`text-3xl font-bold ${card.text}`}>{calculatedStats[card.key]}</div>
              <div className={`text-sm ${card.sub} mt-1`}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Hours Summary */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-4 mb-6 border border-violet-200/70">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-violet-700 font-medium">Total Hours Logged</div>
              <div className="text-2xl font-bold text-violet-900 mt-1">
                {calculatedStats.totalHoursThisMonth.toFixed(1)}
              </div>
            </div>
            <div className="bg-white p-3 rounded-full">
              <svg
                className="w-8 h-8 text-violet-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Top Volunteers */}
        {showDetailedView && topVolunteers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-app-text-label mb-3">Top Volunteers</h4>
            <div className="space-y-3">
              {topVolunteers.map((volunteer, idx) => (
                <Link
                  key={volunteer.volunteer_id}
                  to={`/volunteers/${volunteer.volunteer_id}`}
                  className="flex items-center justify-between p-3 bg-app-surface-muted rounded-xl hover:bg-app-hover transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="shrink-0 w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-app-text-heading">
                        {volunteer.first_name} {volunteer.last_name}
                      </div>
                      <div className="text-xs text-app-text-muted">
                        {volunteer.skills && volunteer.skills.length > 0
                          ? volunteer.skills.slice(0, 2).join(', ')
                          : 'No skills listed'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-semibold text-app-text-heading">
                      {(volunteer.total_hours_logged ?? 0).toFixed(1)}h
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${availabilityBadge[volunteer.availability_status] || 'bg-app-surface-muted text-app-text'}`}>
                      {volunteer.availability_status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-app-border">
          <h4 className="text-sm font-semibold text-app-text-label mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/volunteers/new"
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Volunteer</span>
            </Link>
            <Link
              to="/volunteers/assignments/new"
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span>New Assignment</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Availability Breakdown */}
      {calculatedStats.total > 0 && (
        <div className="px-6 pb-6">
          <h4 className="text-sm font-semibold text-app-text-label mb-3">Availability Breakdown</h4>
          <div className="flex h-3 rounded-full overflow-hidden bg-app-surface-muted">
            <div
              className="bg-emerald-500"
              style={{ width: `${(calculatedStats.available / calculatedStats.total) * 100}%` }}
              title={`Available: ${calculatedStats.available}`}
            />
            <div
              className="bg-amber-500"
              style={{ width: `${(calculatedStats.limited / calculatedStats.total) * 100}%` }}
              title={`Limited: ${calculatedStats.limited}`}
            />
            <div
              className="bg-rose-500"
              style={{ width: `${(calculatedStats.unavailable / calculatedStats.total) * 100}%` }}
              title={`Unavailable: ${calculatedStats.unavailable}`}
            />
          </div>
          <div className="flex justify-between text-xs text-app-text-muted mt-2">
            <span>{((calculatedStats.available / calculatedStats.total) * 100).toFixed(0)}% available</span>
            <span>{((calculatedStats.limited / calculatedStats.total) * 100).toFixed(0)}% limited</span>
            <span>{((calculatedStats.unavailable / calculatedStats.total) * 100).toFixed(0)}% unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerWidget;
