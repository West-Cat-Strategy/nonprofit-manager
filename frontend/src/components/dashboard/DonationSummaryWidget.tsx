/**
 * Donation Summary Widget
 * Overview of donation metrics
 */

import { useEffect, useState } from 'react';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';
import api from '../../services/api';

interface DonationSummaryWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

interface DonationSummaryData {
  total_donations: number;
  total_amount: number;
  average_donation: number;
  month_over_month: number;
}

const DonationSummaryWidget = ({ widget, editMode, onRemove }: DonationSummaryWidgetProps) => {
  const [data, setData] = useState<DonationSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/analytics/summary');
        if (!isMounted) return;
        const payload = response.data ?? {};
        setData({
          total_donations: payload.total_donations || 0,
          total_amount: payload.total_donation_amount || 0,
          average_donation: payload.average_donation || 0,
          month_over_month: payload.donations_month_over_month || 0,
        });
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load donation data');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove} loading={loading} error={error}>
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Donations</p>
            <p className="text-2xl font-bold text-gray-900">{data.total_donations}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg. Donation</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.average_donation)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">MoM Change</p>
            <p className={`text-2xl font-bold ${data.month_over_month >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatChange(data.month_over_month)}
            </p>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

export default DonationSummaryWidget;
