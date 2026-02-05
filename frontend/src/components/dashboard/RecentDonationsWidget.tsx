/**
 * Recent Donations Widget
 * List of recent donations
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';
import { formatDate, formatCurrency } from '../../utils/format';

interface RecentDonationsWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

interface Donation {
  id: string;
  amount: number;
  date: string;
  donor_name: string;
  status: string;
}

const RecentDonationsWidget = ({ widget, editMode, onRemove }: RecentDonationsWidgetProps) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        setLoading(true);
        const response = await api.get('/donations?limit=5&sort=created_at:desc');
        setDonations(response.data.donations || []);
      } catch {
        setError('Failed to load donations');
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, []);

  return (
    <WidgetContainer widget={widget} editMode={editMode} onRemove={onRemove} loading={loading} error={error}>
      <div className="space-y-3">
        {donations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No recent donations</p>
        ) : (
          donations.map((donation) => (
            <Link
              key={donation.id}
              to={`/donations/${donation.id}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">{donation.donor_name}</p>
                <p className="text-xs text-gray-500">{formatDate(donation.date)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(donation.amount)}</p>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    donation.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {donation.status}
                </span>
              </div>
            </Link>
          ))
        )}
        <Link
          to="/donations"
          className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
        >
          View All Donations →
        </Link>
      </div>
    </WidgetContainer>
  );
};

export default RecentDonationsWidget;
