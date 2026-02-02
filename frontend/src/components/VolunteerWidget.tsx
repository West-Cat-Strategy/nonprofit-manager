/**
 * VolunteerWidget Component
 * Dashboard widget displaying volunteer summary statistics and quick actions
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const VolunteerWidget = ({ stats, showDetailedView = false }: VolunteerWidgetProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { volunteers, loading } = useAppSelector((state) => state.volunteers);

  useEffect(() => {
    // Fetch volunteers if stats are not provided
    if (!stats && volunteers.length === 0) {
      dispatch(fetchVolunteers({ limit: 100, is_active: true }));
    }
  }, [dispatch, stats, volunteers.length]);

  // Calculate stats from volunteers if not provided
  const calculatedStats: VolunteerStats = stats || {
    total: volunteers.length,
    available: volunteers.filter((v) => v.availability_status === 'available').length,
    limited: volunteers.filter((v) => v.availability_status === 'limited').length,
    unavailable: volunteers.filter((v) => v.availability_status === 'unavailable').length,
    totalHoursThisMonth: volunteers.reduce((sum, v) => sum + (v.total_hours_logged || 0), 0),
    activeAssignments: 0, // This would need to come from assignments data
  };

  // Top volunteers by hours (if we have the full list)
  const topVolunteers = [...volunteers]
    .sort((a, b) => (b.total_hours_logged || 0) - (a.total_hours_logged || 0))
    .slice(0, 5);

  if (loading && volunteers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Volunteer Overview</h3>
          <button
            onClick={() => navigate('/volunteers')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All →
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Total Volunteers */}
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-600">{calculatedStats.total}</div>
            <div className="text-sm text-blue-700 mt-1">Total</div>
          </div>

          {/* Available */}
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-3xl font-bold text-green-600">{calculatedStats.available}</div>
            <div className="text-sm text-green-700 mt-1">Available</div>
          </div>

          {/* Limited */}
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-600">{calculatedStats.limited}</div>
            <div className="text-sm text-yellow-700 mt-1">Limited</div>
          </div>

          {/* Unavailable */}
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-3xl font-bold text-red-600">{calculatedStats.unavailable}</div>
            <div className="text-sm text-red-700 mt-1">Unavailable</div>
          </div>
        </div>

        {/* Hours Summary */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-700 font-medium">Total Hours Logged</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                {calculatedStats.totalHoursThisMonth.toFixed(1)}
              </div>
            </div>
            <div className="bg-white p-3 rounded-full">
              <svg
                className="w-8 h-8 text-purple-600"
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

        {/* Detailed View */}
        {showDetailedView && topVolunteers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Volunteers</h4>
            <div className="space-y-3">
              {topVolunteers.map((volunteer, idx) => (
                <div
                  key={volunteer.volunteer_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  onClick={() => navigate(`/volunteers/${volunteer.volunteer_id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {volunteer.first_name} {volunteer.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {volunteer.skills && volunteer.skills.length > 0
                          ? volunteer.skills.slice(0, 2).join(', ')
                          : 'No skills listed'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-semibold text-gray-900">
                      {volunteer.total_hours_logged.toFixed(1)}h
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        volunteer.availability_status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : volunteer.availability_status === 'limited'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {volunteer.availability_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/volunteers/new')}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Volunteer</span>
            </button>
            <button
              onClick={() => navigate('/volunteers/assignments/new')}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
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
            </button>
          </div>
        </div>
      </div>

      {/* Availability Breakdown */}
      {calculatedStats.total > 0 && (
        <div className="px-6 pb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Availability Breakdown</h4>
          <div className="relative">
            <div className="flex h-4 rounded-full overflow-hidden">
              <div
                className="bg-green-500"
                style={{
                  width: `${(calculatedStats.available / calculatedStats.total) * 100}%`,
                }}
                title={`Available: ${calculatedStats.available}`}
              ></div>
              <div
                className="bg-yellow-500"
                style={{
                  width: `${(calculatedStats.limited / calculatedStats.total) * 100}%`,
                }}
                title={`Limited: ${calculatedStats.limited}`}
              ></div>
              <div
                className="bg-red-500"
                style={{
                  width: `${(calculatedStats.unavailable / calculatedStats.total) * 100}%`,
                }}
                title={`Unavailable: ${calculatedStats.unavailable}`}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>
                {((calculatedStats.available / calculatedStats.total) * 100).toFixed(0)}%
                available
              </span>
              <span>
                {((calculatedStats.limited / calculatedStats.total) * 100).toFixed(0)}% limited
              </span>
              <span>
                {((calculatedStats.unavailable / calculatedStats.total) * 100).toFixed(0)}%
                unavailable
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerWidget;
