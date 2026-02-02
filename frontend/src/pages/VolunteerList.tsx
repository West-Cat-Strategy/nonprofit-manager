import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchVolunteers,
  deleteVolunteer,
  setFilters,
  clearFilters,
} from '../store/slices/volunteersSlice';
import type { Volunteer } from '../store/slices/volunteersSlice';

const VolunteerList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { volunteers, loading, error, pagination, filters } = useAppSelector(
    (state) => state.volunteers
  );

  const [searchInput, setSearchInput] = useState(filters.search);
  const [availabilityFilter, setAvailabilityFilter] = useState(filters.availability_status);
  const [backgroundCheckFilter, setBackgroundCheckFilter] = useState(
    filters.background_check_status
  );

  const loadVolunteers = useCallback(() => {
    dispatch(
      fetchVolunteers({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        availability_status: filters.availability_status || undefined,
        background_check_status: filters.background_check_status || undefined,
        is_active: filters.is_active,
      })
    );
  }, [dispatch, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadVolunteers();
  }, [loadVolunteers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setFilters({ search: searchInput }));
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'availability_status') {
      setAvailabilityFilter(value);
      dispatch(setFilters({ availability_status: value }));
    } else if (filterType === 'background_check_status') {
      setBackgroundCheckFilter(value);
      dispatch(setFilters({ background_check_status: value }));
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setAvailabilityFilter('');
    setBackgroundCheckFilter('');
    dispatch(clearFilters());
  };

  const handleDelete = async (volunteerId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from volunteers?`)) {
      await dispatch(deleteVolunteer(volunteerId));
      loadVolunteers();
    }
  };

  const formatName = (volunteer: Volunteer) => {
    return `${volunteer.first_name} ${volunteer.last_name}`;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      unavailable: 'bg-red-100 text-red-800',
      limited: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getBackgroundCheckBadge = (status: string) => {
    const colors = {
      not_required: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Volunteers</h1>
            <p className="text-gray-600 mt-1">Manage volunteer profiles and assignments</p>
          </div>
          <button
            onClick={() => navigate('/volunteers/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + New Volunteer
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search volunteers..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <select
              value={availabilityFilter}
              onChange={(e) => handleFilterChange('availability_status', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Availability</option>
              <option value="available">Available</option>
              <option value="limited">Limited</option>
              <option value="unavailable">Unavailable</option>
            </select>

            <select
              value={backgroundCheckFilter}
              onChange={(e) => handleFilterChange('background_check_status', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Background Checks</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="expired">Expired</option>
              <option value="not_required">Not Required</option>
            </select>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading volunteers...</p>
          </div>
        )}

        {/* Volunteers Table */}
        {!loading && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skills
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Background Check
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours Logged
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {volunteers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No volunteers found. Add your first volunteer to get started!
                    </td>
                  </tr>
                ) : (
                  volunteers.map((volunteer) => (
                    <tr key={volunteer.volunteer_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/volunteers/${volunteer.volunteer_id}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          {formatName(volunteer)}
                        </Link>
                        <p className="text-sm text-gray-500">{volunteer.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {volunteer.skills && volunteer.skills.length > 0 ? (
                            volunteer.skills.slice(0, 3).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">No skills listed</span>
                          )}
                          {volunteer.skills && volunteer.skills.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{volunteer.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusBadge(
                            volunteer.availability_status
                          )}`}
                        >
                          {volunteer.availability_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full capitalize ${getBackgroundCheckBadge(
                            volunteer.background_check_status
                          )}`}
                        >
                          {volunteer.background_check_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {volunteer.total_hours_logged || 0} hrs
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/volunteers/${volunteer.volunteer_id}/edit`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(volunteer.volunteer_id, formatName(volunteer))
                          }
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                    <span className="font-medium">{pagination.total_pages}</span> (
                    {pagination.total} total)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerList;
