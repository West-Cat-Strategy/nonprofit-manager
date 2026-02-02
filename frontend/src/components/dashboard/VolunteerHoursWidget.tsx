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
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/volunteers/summary');
        setData({
          total_hours: response.data.total_hours || 0,
          active_volunteers: response.data.active_volunteers || 0,
          hours_this_month: response.data.hours_this_month || 0,
        });
      } catch (err) {
        setError('Failed to load volunteer data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
