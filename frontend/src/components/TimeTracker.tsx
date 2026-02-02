/**
 * TimeTracker Component
 * Allows volunteers to track and log their hours
 */

import { useState } from 'react';
import type { VolunteerAssignment } from '../store/slices/volunteersSlice';

interface TimeTrackerProps {
  volunteerName: string;
  totalHoursLogged: number;
  assignments: VolunteerAssignment[];
  onUpdateHours?: (assignmentId: string, hours: number) => void;
  onStartTimer?: (assignmentId: string) => void;
  onStopTimer?: (assignmentId: string, hoursLogged: number) => void;
}

interface TimerState {
  assignmentId: string | null;
  startTime: Date | null;
  elapsedSeconds: number;
}

const TimeTracker = ({
  volunteerName,
  totalHoursLogged,
  assignments,
  onUpdateHours,
  onStartTimer,
  onStopTimer,
}: TimeTrackerProps) => {
  const [timerState, setTimerState] = useState<TimerState>({
    assignmentId: null,
    startTime: null,
    elapsedSeconds: 0,
  });
  const [manualHours, setManualHours] = useState<Record<string, string>>({});
  const [activeTimerInterval, setActiveTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Start timer for an assignment
  const handleStartTimer = (assignmentId: string) => {
    if (timerState.assignmentId) {
      alert('Please stop the current timer before starting a new one.');
      return;
    }

    const startTime = new Date();
    setTimerState({
      assignmentId,
      startTime,
      elapsedSeconds: 0,
    });

    // Start interval to update elapsed time
    const interval = setInterval(() => {
      setTimerState((prev) => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1,
      }));
    }, 1000);

    setActiveTimerInterval(interval);

    if (onStartTimer) {
      onStartTimer(assignmentId);
    }
  };

  // Stop timer and save hours
  const handleStopTimer = () => {
    if (!timerState.assignmentId || !timerState.startTime || !activeTimerInterval) {
      return;
    }

    clearInterval(activeTimerInterval);
    setActiveTimerInterval(null);

    const hoursLogged = timerState.elapsedSeconds / 3600;

    if (onStopTimer) {
      onStopTimer(timerState.assignmentId, hoursLogged);
    }

    setTimerState({
      assignmentId: null,
      startTime: null,
      elapsedSeconds: 0,
    });
  };

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle manual hours input
  const handleManualHoursChange = (assignmentId: string, value: string) => {
    setManualHours((prev) => ({
      ...prev,
      [assignmentId]: value,
    }));
  };

  // Submit manual hours
  const handleSubmitManualHours = (assignmentId: string) => {
    const hours = parseFloat(manualHours[assignmentId] || '0');

    if (isNaN(hours) || hours <= 0) {
      alert('Please enter a valid number of hours.');
      return;
    }

    if (onUpdateHours) {
      onUpdateHours(assignmentId, hours);
    }

    // Clear input
    setManualHours((prev) => ({
      ...prev,
      [assignmentId]: '',
    }));
  };

  // Get active (non-completed, non-cancelled) assignments
  const activeAssignments = assignments.filter(
    (a) => a.status !== 'completed' && a.status !== 'cancelled'
  );

  // Get completed assignments
  const completedAssignments = assignments.filter((a) => a.status === 'completed');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with total hours */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Time Tracker</h3>
        <div className="flex items-baseline space-x-2">
          <span className="text-4xl font-bold text-blue-600">{totalHoursLogged.toFixed(1)}</span>
          <span className="text-lg text-gray-600">total hours logged</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">by {volunteerName}</p>
      </div>

      {/* Active Timer Display */}
      {timerState.assignmentId && (
        <div className="p-6 border-b border-gray-200 bg-green-50">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Timer Running</h4>
              <p className="text-sm text-gray-600">
                {
                  assignments.find((a) => a.assignment_id === timerState.assignmentId)
                    ?.event_name ||
                  assignments.find((a) => a.assignment_id === timerState.assignmentId)
                    ?.task_name ||
                  'General Assignment'
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-mono font-bold text-green-600">
                {formatElapsedTime(timerState.elapsedSeconds)}
              </div>
              <button
                onClick={handleStopTimer}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Assignments */}
      <div className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Active Assignments</h4>

        {activeAssignments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active assignments</p>
        ) : (
          <div className="space-y-4">
            {activeAssignments.map((assignment) => {
              const isTimerActive = timerState.assignmentId === assignment.assignment_id;

              return (
                <div
                  key={assignment.assignment_id}
                  className={`border rounded-lg p-4 ${
                    isTimerActive ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {assignment.event_name ||
                          assignment.task_name ||
                          'General Assignment'}
                      </h5>
                      {assignment.role && (
                        <p className="text-sm text-gray-600 mt-1">Role: {assignment.role}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(assignment.start_time).toLocaleDateString()}
                        {assignment.end_time &&
                          ` - ${new Date(assignment.end_time).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full capitalize ${
                        assignment.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {assignment.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Hours logged: <span className="font-medium">{assignment.hours_logged}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Timer button */}
                      {!isTimerActive && !timerState.assignmentId && (
                        <button
                          onClick={() => handleStartTimer(assignment.assignment_id)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition text-sm flex items-center space-x-1"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>Start Timer</span>
                        </button>
                      )}

                      {/* Manual hours input */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          placeholder="0.0"
                          value={manualHours[assignment.assignment_id] || ''}
                          onChange={(e) =>
                            handleManualHoursChange(assignment.assignment_id, e.target.value)
                          }
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          onClick={() => handleSubmitManualHours(assignment.assignment_id)}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm"
                        >
                          Log
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Completed Assignments */}
      {completedAssignments.length > 0 && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h4 className="font-semibold text-gray-900 mb-4">Recently Completed</h4>
          <div className="space-y-3">
            {completedAssignments.slice(0, 5).map((assignment) => (
              <div
                key={assignment.assignment_id}
                className="flex justify-between items-center text-sm"
              >
                <div>
                  <span className="text-gray-900">
                    {assignment.event_name ||
                      assignment.task_name ||
                      'General Assignment'}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({new Date(assignment.start_time).toLocaleDateString()})
                  </span>
                </div>
                <span className="font-medium text-green-600">
                  {assignment.hours_logged}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTracker;
