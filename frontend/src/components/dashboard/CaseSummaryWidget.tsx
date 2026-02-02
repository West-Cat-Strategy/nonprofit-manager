/**
 * Case Summary Widget
 * Overview of case management metrics
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';

interface CaseSummaryWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

interface CaseData {
  total: number;
  active: number;
  urgent: number;
  closed_this_month: number;
}

const CaseSummaryWidget = ({ widget, editMode, onRemove }: CaseSummaryWidgetProps) => {
  const [data, setData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/cases?status=active');
        const urgentResponse = await api.get('/cases?priority=urgent');

        setData({
          total: response.data.total || 0,
          active: response.data.total || 0,
          urgent: urgentResponse.data.total || 0,
          closed_this_month: 0,
        });
      } catch (err) {
        setError('Failed to load case data');
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
          <div className="grid grid-cols-2 gap-4">
            <Link to="/cases?status=active" className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100">
              <p className="text-xs text-blue-600">Active Cases</p>
              <p className="text-2xl font-bold text-blue-900">{data.active}</p>
            </Link>
            <Link to="/cases?priority=urgent" className="p-3 bg-red-50 rounded-lg hover:bg-red-100">
              <p className="text-xs text-red-600">Urgent</p>
              <p className="text-2xl font-bold text-red-900">{data.urgent}</p>
            </Link>
          </div>
          <div>
            <p className="text-xs text-gray-500">Closed This Month</p>
            <p className="text-xl font-semibold text-gray-900">{data.closed_this_month}</p>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

export default CaseSummaryWidget;
