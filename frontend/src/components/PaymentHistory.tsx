/**
 * PaymentHistory Component
 * Displays donation/payment history for a contact or account
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { Donation, PaginatedDonations } from '../types/donation';

interface PaymentHistoryProps {
  contactId?: string;
  accountId?: string;
  limit?: number;
  showViewAll?: boolean;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  contactId,
  accountId,
  limit = 5,
  showViewAll = true,
}) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!contactId && !accountId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (contactId) params.append('contact_id', contactId);
        if (accountId) params.append('account_id', accountId);
        params.append('limit', limit.toString());
        params.append('sort_by', 'donation_date');
        params.append('sort_order', 'desc');

        const response = await api.get<PaginatedDonations>(`/donations?${params.toString()}`);
        setDonations(response.data.data);
        setTotalCount(response.data.pagination.total);
        if (response.data.summary) {
          setTotalAmount(response.data.summary.total_amount);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load payment history');
        console.error('Error fetching payment history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [contactId, accountId, limit]);

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Payment History</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Payment History</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Payment History</h2>
          {totalCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {totalCount} donation{totalCount !== 1 ? 's' : ''} totaling{' '}
              <span className="font-semibold text-green-600">
                {formatCurrency(totalAmount)}
              </span>
            </p>
          )}
        </div>
        {showViewAll && contactId && (
          <Link
            to={`/donations?contact_id=${contactId}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All
          </Link>
        )}
        {showViewAll && accountId && !contactId && (
          <Link
            to={`/donations?account_id=${accountId}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All
          </Link>
        )}
      </div>

      {donations.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-gray-500">No donations yet</p>
          <Link
            to="/donations/payment"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
          >
            Make a Donation
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {donations.map((donation) => (
                <tr key={donation.donation_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(donation.donation_date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(donation.amount, donation.currency)}
                    {donation.is_recurring && (
                      <span className="ml-2 text-xs text-blue-600">(recurring)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(donation.payment_status)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {donation.payment_method?.replace('_', ' ') || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <Link
                      to={`/donations/${donation.donation_id}`}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalCount > limit && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {donations.length} of {totalCount} donations
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
