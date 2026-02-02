/**
 * EventCalendar Component
 * Calendar view for events with monthly navigation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEvents } from '../store/slices/eventsSlice';
import type { Event, EventType } from '../types/event';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  isToday,
} from 'date-fns';

interface EventCalendarProps {
  onEventClick?: (event: Event) => void;
}

export const EventCalendar: React.FC<EventCalendarProps> = ({ onEventClick }) => {
  const dispatch = useAppDispatch();
  const { events, loading } = useAppSelector((state) => state.events);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch events when month changes
  useEffect(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    dispatch(
      fetchEvents({
        filters: {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
        },
      })
    );
  }, [currentMonth, dispatch]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};

    events.forEach((event) => {
      const dateKey = format(parseISO(event.start_date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const getEventTypeColor = (type: EventType): string => {
    switch (type) {
      case 'fundraiser':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'volunteer':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'community':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'training':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'meeting':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'social':
        return 'bg-pink-100 text-pink-800 hover:bg-pink-200';
      case 'other':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getEventsForDate = (date: Date): Event[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToday}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={handlePreviousMonth}
            className="p-2 text-gray-600 hover:text-gray-900"
            aria-label="Previous month"
          >
            <svg
              className="w-5 h-5"
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
            onClick={handleNextMonth}
            className="p-2 text-gray-600 hover:text-gray-900"
            aria-label="Next month"
          >
            <svg
              className="w-5 h-5"
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

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day names */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="py-2 text-xs font-semibold text-center text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={index}
                className={`min-h-24 p-2 border rounded-lg cursor-pointer transition-colors ${
                  !isCurrentMonth
                    ? 'bg-gray-50 text-gray-400'
                    : 'bg-white hover:bg-gray-50'
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => handleDateClick(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      isDayToday
                        ? 'flex items-center justify-center w-6 h-6 text-white bg-blue-600 rounded-full'
                        : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event indicators */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.event_id}
                      className={`px-2 py-1 text-xs font-medium rounded truncate cursor-pointer ${getEventTypeColor(
                        event.event_type
                      )}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      title={event.event_name}
                    >
                      {format(parseISO(event.start_date), 'HH:mm')}{' '}
                      {event.event_name}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-center text-gray-500">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      )}

      {/* Legend */}
      <div className="px-6 py-4 border-t bg-gray-50">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 mr-1 bg-green-100 rounded"></div>
            <span className="text-gray-600">Fundraiser</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 mr-1 bg-blue-100 rounded"></div>
            <span className="text-gray-600">Volunteer</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 mr-1 bg-purple-100 rounded"></div>
            <span className="text-gray-600">Community</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 mr-1 bg-yellow-100 rounded"></div>
            <span className="text-gray-600">Training</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 mr-1 bg-orange-100 rounded"></div>
            <span className="text-gray-600">Workshop</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 mr-1 bg-indigo-100 rounded"></div>
            <span className="text-gray-600">Conference</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCalendar;
