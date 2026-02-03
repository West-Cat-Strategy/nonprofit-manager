/**
 * Volunteer Hours Widget
 * Summary of volunteer hours
 */

import { useEffect, useState } from 'react';
import api from '../../services/api';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface VolunteerHoursWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

interface VolunteerData {
  total_hours: number;
  active_volunteers: number;
  hours_this_month: number;
}

const VolunteerHoursWidget = ({ widget, editMode, onRemove }: VolunteerHoursWidgetProps) => {
  const [data, setData] = useState<VolunteerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/volunteers/summary');
        if (!isMounted) return;
        const payload = response.data ?? {};
        setData({
          total_hours: payload.total_hours || 0,
          active_volunteers: payload.active_volunteers || 0,
          hours_this_month: payload.hours_this_month || 0,
        });
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load volunteer data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove} loading={loading} error={error}>
      {data && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Total Hours</p>
            <p className="text-3xl font-bold text-gray-900">{data.total_hours.toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Active Volunteers</p>
              <p className="text-xl font-semibold text-gray-900">{data.active_volunteers}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">This Month</p>
              <p className="text-xl font-semibold text-gray-900">{data.hours_this_month}</p>
            </div>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

export default VolunteerHoursWidget;
