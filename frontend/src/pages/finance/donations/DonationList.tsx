/**
 * DonationList Component
 * Displays paginated list of donations with filters and summary
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchDonations } from '../../../store/slices/donationsSlice';
import type { PaymentMethod, PaymentStatus } from '../../../types/donation';
import { formatDate, formatCurrency } from '../../../utils/format';

const DonationList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { donations, pagination, totalAmount, averageAmount, loading, error } = useAppSelector(
    (state) => state.donations
  );

  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadDonations = useCallback(() => {
    dispatch(
      fetchDonations({
        filters: {
          search: search || undefined,
          payment_status: paymentStatus || undefined,
          payment_method: paymentMethod || undefined,
        },
        pagination: {
          page: currentPage,
          limit: 20,
          sort_by: 'donation_date',
          sort_order: 'desc',
        },
      })
    );
  }, [dispatch, search, paymentStatus, paymentMethod, currentPage]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'N/A';
    return method.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Donations</h1>
        <button
          onClick={() => navigate('/donations/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Record Donation
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Donations</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Average Donation</h3>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(averageAmount)}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Count</h3>
          <p className="text-3xl font-bold text-purple-600">{pagination.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search donations..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-md"
          aria-label="Search donations"
        />

        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value as PaymentStatus | '');
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-md"
          aria-label="Filter by payment status"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value as PaymentMethod | '');
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-md"
          aria-label="Filter by payment method"
        >
          <option value="">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="check">Check</option>
          <option value="credit_card">Credit Card</option>
          <option value="debit_card">Debit Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="paypal">PayPal</option>
          <option value="stock">Stock</option>
          <option value="in_kind">In-Kind</option>
          <option value="other">Other</option>
        </select>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      {loading ? (
        <div className="text-center py-12">Loading donations...</div>
      ) : donations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No donations found. Record your first donation to get started.
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Donation #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Donor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {donations.map((donation) => (
                  <tr key={donation.donation_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {donation.donation_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {donation.account_name || donation.contact_name || 'Anonymous'}
                      </div>
                      {donation.campaign_name && (
                        <div className="text-xs text-gray-500">{donation.campaign_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(donation.amount, donation.currency)}
                      </div>
                      {donation.is_recurring && (
                        <div className="text-xs text-blue-600">
                          Recurring ({donation.recurring_frequency})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(donation.donation_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodLabel(donation.payment_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(donation.payment_status)}`}
                      >
                        {donation.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {donation.receipt_sent ? (
                        <span className="text-green-600">✓ Sent</span>
                      ) : (
                        <span className="text-gray-400">Not Sent</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/donations/${donation.donation_id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/donations/${donation.donation_id}/edit`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} total
                donations)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={currentPage === pagination.total_pages}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DonationList;
