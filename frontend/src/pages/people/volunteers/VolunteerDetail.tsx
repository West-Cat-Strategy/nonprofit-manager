import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchVolunteerById,
  fetchVolunteerAssignments,
  clearCurrentVolunteer,
  updateAssignment,
} from '../../../store/slices/volunteersSlice';
import type { VolunteerAssignment } from '../../../store/slices/volunteersSlice';
import {
  PeopleDetailContainer,
  ActivityTimeline,
} from '../../../components/people';
import AvailabilityCalendar from '../../../components/AvailabilityCalendar';
import TimeTracker from '../../../components/TimeTracker';

const VolunteerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentVolunteer, assignments, loading, error } = useAppSelector(
    (state) => state.volunteers
  );

  const [activeTab, setActiveTab] = useState<
    'info' | 'assignments' | 'calendar' | 'timetracker' | 'activity'
  >('info');
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

  if (error && !currentVolunteer) {
    return (
      <div className="min-h-screen bg-app-surface-muted p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Volunteer not found'}
          </div>
          <button
            onClick={() => navigate('/volunteers')}
            className="mt-4 text-app-accent hover:text-app-accent-text"
          >
            ← Back to Volunteers
          </button>
        </div>
      </div>
    );
  }

  if (!currentVolunteer) {
    return (
      <div className="min-h-screen bg-app-surface-muted p-6">
        <div className="max-w-6xl mx-auto bg-app-surface rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
          <p className="mt-4 text-app-text-muted">Loading volunteer...</p>
        </div>
      </div>
    );
  }

  const fullName = `${currentVolunteer.first_name} ${currentVolunteer.last_name}`;

  const tabs = [
    { id: 'info', label: 'Information' },
    { id: 'assignments', label: `Assignments (${assignments.length})` },
    { id: 'calendar', label: 'Calendar' },
    { id: 'timetracker', label: 'Time Tracker' },
    { id: 'activity', label: 'Activity' },
  ] as const;

  return (
    <PeopleDetailContainer
      title={fullName}
      description={`Volunteer since ${new Date(currentVolunteer.volunteer_since).toLocaleDateString()} • ${currentVolunteer.total_hours_logged} hours logged`}
      onBack={() => navigate('/volunteers')}
      onEdit={() => navigate(`/volunteers/${id}/edit`)}
      loading={loading}
      tabs={tabs.map((tab) => ({
        id: tab.id as string,
        label: tab.label,
      }))}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as any)}
    >
      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-app-text-muted">
                  Email
                </label>
                <p className="mt-1">{currentVolunteer.email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text-muted">
                  Phone
                </label>
                <p className="mt-1">
                  {currentVolunteer.phone ||
                    currentVolunteer.mobile_phone ||
                    '-'}
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
                    className="px-3 py-1 bg-app-accent-soft text-app-accent-text rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-app-text-muted">No skills listed</p>
              )}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Availability</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-app-text-muted">
                  Status
                </label>
                <p className="mt-1 capitalize">
                  {currentVolunteer.availability_status}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text-muted">
                  Max Hours Per Week
                </label>
                <p className="mt-1">
                  {currentVolunteer.max_hours_per_week || 'Not specified'}
                </p>
              </div>
            </div>
            {currentVolunteer.availability_notes && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-app-text-muted">
                  Notes
                </label>
                <p className="mt-1 text-app-text-muted">
                  {currentVolunteer.availability_notes}
                </p>
              </div>
            )}
          </div>

          {/* Background Check */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Background Check</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-app-text-muted">
                  Status
                </label>
                <p className="mt-1 capitalize">
                  {currentVolunteer.background_check_status.replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text-muted">
                  Check Date
                </label>
                <p className="mt-1">
                  {currentVolunteer.background_check_date
                    ? new Date(
                      currentVolunteer.background_check_date
                    ).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text-muted">
                  Expiry Date
                </label>
                <p className="mt-1">
                  {currentVolunteer.background_check_expiry
                    ? new Date(
                      currentVolunteer.background_check_expiry
                    ).toLocaleDateString()
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
                  <label className="block text-sm font-medium text-app-text-muted">
                    Name
                  </label>
                  <p className="mt-1">
                    {currentVolunteer.emergency_contact_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text-muted">
                    Phone
                  </label>
                  <p className="mt-1">
                    {currentVolunteer.emergency_contact_phone || '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text-muted">
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

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Assignment History</h3>
            <button
              onClick={() => {
                navigate(`/volunteers/${id}/assignments/new`);
              }}
              className="bg-app-accent text-white px-4 py-2 rounded-lg hover:bg-app-accent-hover transition text-sm"
              type="button"
            >
              + New Assignment
            </button>
          </div>

          {assignments.length === 0 ? (
            <p className="text-app-text-muted text-center py-8">No assignments yet</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="border border-app-border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-app-text">
                        {assignment.event_name ||
                          assignment.task_name ||
                          'General Assignment'}
                      </h4>
                      <p className="text-sm text-app-text-muted mt-1">
                        {assignment.role && (
                          <span>Role: {assignment.role} • </span>
                        )}
                        <span className="capitalize">
                          {assignment.assignment_type}
                        </span>
                      </p>
                      <p className="text-sm text-app-text-muted mt-2">
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
                        className="text-app-accent hover:text-app-accent-text text-sm"
                      >
                        Edit
                      </button>
                      <span
                        className={`px-2 py-1 text-xs rounded-full capitalize ${assignment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : assignment.status === 'in_progress'
                              ? 'bg-app-accent-soft text-app-accent-text'
                              : assignment.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-app-surface-muted text-app-text'
                          }`}
                      >
                        {assignment.status}
                      </span>
                      <p className="text-sm text-app-text-muted">
                        {assignment.hours_logged} hours
                      </p>
                    </div>
                  </div>
                  {assignment.notes && (
                    <p className="text-sm text-app-text-muted mt-3 border-t pt-3">
                      {assignment.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar Tab */}
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
            <div className="mt-6 p-4 bg-app-accent-soft rounded-lg border border-app-accent-soft">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-app-text">
                  Assignments for{' '}
                  {selectedDateAssignments.date.toLocaleDateString()}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedDateAssignments(null)}
                  className="text-app-text-muted hover:text-app-text-muted"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                {selectedDateAssignments.assignments.map((assignment) => (
                  <div
                    key={assignment.assignment_id}
                    className="bg-app-surface p-3 rounded-lg border border-app-border"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium text-app-text">
                          {assignment.event_name ||
                            assignment.task_name ||
                            'General Assignment'}
                        </h5>
                        {assignment.role && (
                          <p className="text-sm text-app-text-muted mt-1">
                            Role: {assignment.role}
                          </p>
                        )}
                        <p className="text-sm text-app-text-muted mt-1">
                          {assignment.hours_logged} hours logged
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full capitalize ${assignment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : assignment.status === 'in_progress'
                              ? 'bg-app-accent-soft text-app-accent-text'
                              : assignment.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-app-surface-muted text-app-text'
                          }`}
                      >
                        {assignment.status.replace('_', ' ')}
                      </span>
                    </div>
                    {assignment.notes && (
                      <p className="text-sm text-app-text-muted mt-2 pt-2 border-t">
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

      {/* Time Tracker Tab */}
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

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div>
          <ActivityTimeline
            events={[]}
            loading={false}
            emptyMessage="No activity recorded yet"
          />
        </div>
      )}
    </PeopleDetailContainer>
  );
};

export default VolunteerDetail;
