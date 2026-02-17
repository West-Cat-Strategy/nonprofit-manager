/**
 * Event Attendance Widget
 * Overview of events and attendance
 */

import { useEffect, useState } from 'react';
import WidgetContainer from './WidgetContainer';
import api from '../../services/api';
import type { DashboardWidget } from '../../types/dashboard';

interface EventAttendanceSummary {
  upcoming_events: number;
  total_this_month: number;
  avg_attendance: number;
}

interface EventAttendanceWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

const EventAttendanceWidget = ({ widget, editMode, onRemove }: EventAttendanceWidgetProps) => {
  const [summary, setSummary] = useState<EventAttendanceSummary>({
    upcoming_events: 0,
    total_this_month: 0,
    avg_attendance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSummary = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/events/summary');
        if (!isMounted) return;
        setSummary({
          upcoming_events: response.data?.upcoming_events ?? 0,
          total_this_month: response.data?.total_this_month ?? 0,
          avg_attendance: response.data?.avg_attendance ?? 0,
        });
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load event summary');
        setSummary({ upcoming_events: 0, total_this_month: 0, avg_attendance: 0 });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

  const upcomingValue = isLoading ? '--' : formatNumber(summary.upcoming_events);
  const totalThisMonthValue = isLoading ? '--' : formatNumber(summary.total_this_month);
  const avgAttendanceValue = isLoading
    ? '--'
    : formatNumber(Math.round(summary.avg_attendance));

  return (
    <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-app-text-muted">Upcoming Events</p>
          <p className="text-3xl font-bold text-app-text">{upcomingValue}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-app-text-muted">Total This Month</p>
            <p className="text-xl font-semibold text-app-text">{totalThisMonthValue}</p>
          </div>
          <div>
            <p className="text-xs text-app-text-muted">Avg. Attendance</p>
            <p className="text-xl font-semibold text-app-text">{avgAttendanceValue}</p>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-600">Unable to load event summary</p>
        )}
      </div>
    </WidgetContainer>
  );
};

export default EventAttendanceWidget;
