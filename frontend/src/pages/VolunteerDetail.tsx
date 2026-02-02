import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchVolunteerById,
  fetchVolunteerAssignments,
  clearCurrentVolunteer,
  updateAssignment,
} from '../store/slices/volunteersSlice';
import type { VolunteerAssignment } from '../store/slices/volunteersSlice';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import TimeTracker from '../components/TimeTracker';

const VolunteerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentVolunteer, assignments, loading, error } = useAppSelector(
    (state) => state.volunteers
  );

  const [activeTab, setActiveTab] = useState<'info' | 'assignments' | 'calendar' | 'timetracker'>(
    'info'
  );
  const [selectedDateAssignments, setSelectedDateAssignments] = useState<{
    date: Date;
    assignments: VolunteerAssignment[];
  } | null>(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchVolunteerById(id));
      dispatch(fetchVolunteerAssignments(id));
    }
    return () => {
      dispatch(clearCurrentVolunteer());
    };
  }, [id, dispatch]);

  if (loading && !currentVolunteer) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading volunteer...</p>
        </div>
      </div>
    );
  }

  if (error || !currentVolunteer) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Volunteer not found'}
          </div>
          <button
            onClick={() => navigate('/volunteers')}
            className="mt-4 text-blue-600 hover:text-blue-900"
          >
            ← Back to Volunteers
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${currentVolunteer.first_name} ${currentVolunteer.last_name}`;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link to="/volunteers" className="text-blue-600 hover:text-blue-900 mb-2 inline-block">
              ← Back to Volunteers
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
            <p className="text-gray-500 mt-1">
              Volunteer since {new Date(currentVolunteer.volunteer_since).toLocaleDateString()} •{' '}
              {currentVolunteer.total_hours_logged} hours logged
            </p>
          </div>
          <button
            onClick={() => navigate(`/volunteers/${id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Edit Volunteer
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Volunteer Information
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'assignments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Assignments ({assignments.length})
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'calendar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveTab('timetracker')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'timetracker'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Time Tracker
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="mt-1">{currentVolunteer.email || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <p className="mt-1">
                        {currentVolunteer.phone || currentVolunteer.mobile_phone || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentVolunteer.skills && currentVolunteer.skills.length > 0 ? (
                      currentVolunteer.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No skills listed</p>
                    )}
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Availability</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1 capitalize">{currentVolunteer.availability_status}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Max Hours Per Week
                      </label>
                      <p className="mt-1">
                        {currentVolunteer.max_hours_per_week || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  {currentVolunteer.availability_notes && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-500">Notes</label>
                      <p className="mt-1 text-gray-700">{currentVolunteer.availability_notes}</p>
                    </div>
                  )}
                </div>

                {/* Background Check */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Background Check</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1 capitalize">
                        {currentVolunteer.background_check_status.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Check Date</label>
                      <p className="mt-1">
                        {currentVolunteer.background_check_date
                          ? new Date(currentVolunteer.background_check_date).toLocaleDateString()
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Expiry Date</label>
                      <p className="mt-1">
                        {currentVolunteer.background_check_expiry
                          ? new Date(currentVolunteer.background_check_expiry).toLocaleDateString()
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                {currentVolunteer.emergency_contact_name && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Name</label>
                        <p className="mt-1">{currentVolunteer.emergency_contact_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Phone</label>
                        <p className="mt-1">{currentVolunteer.emergency_contact_phone || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">
                          Relationship
                        </label>
                        <p className="mt-1">
                          {currentVolunteer.emergency_contact_relationship || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'assignments' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Assignment History</h3>
                  <button
                    onClick={() => navigate(`/volunteers/${id}/assignments/new`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    + New Assignment
                  </button>
                </div>

                {assignments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No assignments yet</p>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.assignment_id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {assignment.event_name ||
                                assignment.task_name ||
                                'General Assignment'}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {assignment.role && <span>Role: {assignment.role} • </span>}
                              <span className="capitalize">{assignment.assignment_type}</span>
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              {new Date(assignment.start_time).toLocaleDateString()} -{' '}
                              {assignment.end_time
                                ? new Date(assignment.end_time).toLocaleDateString()
                                : 'Ongoing'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <button
                              onClick={() =>
                                navigate(
                                  `/volunteers/${id}/assignments/${assignment.assignment_id}/edit`
                                )
                              }
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <span
                              className={`px-2 py-1 text-xs rounded-full capitalize ${
                                assignment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : assignment.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : assignment.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {assignment.status}
                            </span>
                            <p className="text-sm text-gray-600">{assignment.hours_logged} hours</p>
                          </div>
                        </div>
                        {assignment.notes && (
                          <p className="text-sm text-gray-600 mt-3 border-t pt-3">
                            {assignment.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'calendar' && (
              <div>
                <AvailabilityCalendar
                  assignments={assignments}
                  availabilityStatus={currentVolunteer.availability_status}
                  onDateClick={(date, dateAssignments) => {
                    setSelectedDateAssignments({ date, assignments: dateAssignments });
                  }}
                />

                {/* Assignment Details Modal/Section */}
                {selectedDateAssignments && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-900">
                        Assignments for {selectedDateAssignments.date.toLocaleDateString()}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setSelectedDateAssignments(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selectedDateAssignments.assignments.map((assignment) => (
                        <div
                          key={assignment.assignment_id}
                          className="bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900">
                                {assignment.event_name ||
                                  assignment.task_name ||
                                  'General Assignment'}
                              </h5>
                              {assignment.role && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Role: {assignment.role}
                                </p>
                              )}
                              <p className="text-sm text-gray-500 mt-1">
                                {assignment.hours_logged} hours logged
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full capitalize ${
                                assignment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : assignment.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : assignment.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {assignment.status.replace('_', ' ')}
                            </span>
                          </div>
                          {assignment.notes && (
                            <p className="text-sm text-gray-600 mt-2 pt-2 border-t">
                              {assignment.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timetracker' && (
              <div>
                <TimeTracker
                  volunteerName={fullName}
                  totalHoursLogged={currentVolunteer.total_hours_logged}
                  assignments={assignments}
                  onUpdateHours={(assignmentId, hours) => {
                    // Find the assignment and calculate new total hours
                    const assignment = assignments.find(
                      (a) => a.assignment_id === assignmentId
                    );
                    if (assignment) {
                      const newHours = assignment.hours_logged + hours;
                      dispatch(
                        updateAssignment({
                          assignmentId,
                          data: { hours_logged: newHours },
                        })
                      ).then(() => {
                        // Refresh assignments
                        if (id) {
                          dispatch(fetchVolunteerAssignments(id));
                          dispatch(fetchVolunteerById(id));
                        }
                      });
                    }
                  }}
                  onStopTimer={(assignmentId, hoursLogged) => {
                    // Find the assignment and add timer hours
                    const assignment = assignments.find(
                      (a) => a.assignment_id === assignmentId
                    );
                    if (assignment) {
                      const newHours = assignment.hours_logged + hoursLogged;
                      dispatch(
                        updateAssignment({
                          assignmentId,
                          data: { hours_logged: newHours },
                        })
                      ).then(() => {
                        // Refresh assignments
                        if (id) {
                          dispatch(fetchVolunteerAssignments(id));
                          dispatch(fetchVolunteerById(id));
                        }
                      });
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerDetail;
