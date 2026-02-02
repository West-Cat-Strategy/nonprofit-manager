/**
 * AvailabilityCalendar Component
 * Displays a monthly calendar view of volunteer assignments and availability
 */

import { useState, useMemo } from 'react';
import type { VolunteerAssignment } from '../store/slices/volunteersSlice';

interface AvailabilityCalendarProps {
  assignments: VolunteerAssignment[];
  availabilityStatus?: 'available' | 'unavailable' | 'limited';
  onDateClick?: (date: Date, assignments: VolunteerAssignment[]) => void;
}

const AvailabilityCalendar = ({
  assignments,
  availabilityStatus = 'available',
  onDateClick,
}: AvailabilityCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get calendar data for the current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and how many days in month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get days from previous month to fill in the start
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = Array.from(
      { length: startingDayOfWeek },
      (_, i) => prevMonthLastDay - startingDayOfWeek + i + 1
    );

    // Current month days
    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Next month days to fill in the end
    const totalCells = prevMonthDays.length + currentMonthDays.length;
    const remainingCells = 42 - totalCells; // 6 rows × 7 days
    const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => i + 1);

    return {
      prevMonthDays,
      currentMonthDays,
      nextMonthDays,
      startingDayOfWeek,
    };
  }, [currentDate]);

  // Group assignments by date
  const assignmentsByDate = useMemo(() => {
    const grouped: Record<string, VolunteerAssignment[]> = {};

    assignments.forEach((assignment) => {
      const startDate = new Date(assignment.start_time);
      const dateKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(assignment);
    });

    return grouped;
  }, [assignments]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to check if a date is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  };

  // Helper to get assignments for a specific day
  const getAssignmentsForDay = (day: number) => {
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return assignmentsByDate[dateKey] || [];
  };

  // Helper to get status color class
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'scheduled':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Previous month"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Next month"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Availability Status Indicator */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Availability:</span>
          <span
            className={`px-2 py-1 text-xs rounded-full capitalize ${
              availabilityStatus === 'available'
                ? 'bg-green-100 text-green-800'
                : availabilityStatus === 'limited'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {availabilityStatus}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {/* Previous month days */}
          {calendarData.prevMonthDays.map((day, idx) => (
            <div
              key={`prev-${idx}`}
              className="min-h-[80px] p-2 bg-gray-50 rounded-lg text-gray-400 text-sm"
            >
              {day}
            </div>
          ))}

          {/* Current month days */}
          {calendarData.currentMonthDays.map((day) => {
            const dayAssignments = getAssignmentsForDay(day);
            const hasAssignments = dayAssignments.length > 0;
            const isTodayDate = isToday(day);

            return (
              <div
                key={`current-${day}`}
                onClick={() => {
                  if (onDateClick && hasAssignments) {
                    const clickedDate = new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      day
                    );
                    onDateClick(clickedDate, dayAssignments);
                  }
                }}
                className={`min-h-[80px] p-2 rounded-lg border transition ${
                  isTodayDate
                    ? 'border-blue-500 bg-blue-50'
                    : hasAssignments
                      ? 'border-gray-300 bg-white hover:bg-gray-50 cursor-pointer'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    isTodayDate ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {day}
                </div>

                {/* Assignment indicators */}
                {hasAssignments && (
                  <div className="space-y-1">
                    {dayAssignments.slice(0, 2).map((assignment, idx) => (
                      <div
                        key={idx}
                        className={`text-xs px-1 py-0.5 rounded border truncate ${getStatusColor(assignment.status)}`}
                        title={
                          assignment.event_name ||
                          assignment.task_name ||
                          'General Assignment'
                        }
                      >
                        {assignment.event_name ||
                          assignment.task_name ||
                          'General'}
                      </div>
                    ))}
                    {dayAssignments.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayAssignments.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Next month days */}
          {calendarData.nextMonthDays.map((day, idx) => (
            <div
              key={`next-${idx}`}
              className="min-h-[80px] p-2 bg-gray-50 rounded-lg text-gray-400 text-sm"
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span className="text-gray-600">Scheduled</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-600">Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
