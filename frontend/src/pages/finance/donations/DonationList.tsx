/**
 * DonationList Component
 * Displays paginated list of donations with filters and summary
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchDonations } from '../../../store/slices/donationsSlice';
import type { PaymentMethod, PaymentStatus } from '../../../types/donation';
import { formatDate, formatCurrency } from '../../../utils/format';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatCard,
} from '../../../components/ui';
import {
  parseAllowedValueOrEmpty,
  parsePositiveInteger,
  safeParseStoredObject,
} from '../../../utils/persistedFilters';

const DONATION_FILTERS_STORAGE_KEY = 'donations_list_filters_v1';
const PAYMENT_STATUS_VALUES = [
  'pending',
  'completed',
  'failed',
  'refunded',
  'cancelled',
] as const;
const PAYMENT_METHOD_VALUES = [
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
  'stock',
  'in_kind',
  'other',
] as const;

const DonationList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { donations, pagination, totalAmount, averageAmount, loading, error } = useAppSelector(
    (state) => state.donations
  );

  const [search, setSearch] = useState(() => {
    const fromUrl = searchParams.get('search') || '';
    if (fromUrl) return fromUrl;
    const saved = safeParseStoredObject<Record<string, unknown>>(
      localStorage.getItem(DONATION_FILTERS_STORAGE_KEY)
    );
    return typeof saved?.search === 'string' ? saved.search : '';
  });
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>(() => {
    const fromUrl = parseAllowedValueOrEmpty(searchParams.get('status'), PAYMENT_STATUS_VALUES);
    if (fromUrl) return fromUrl;
    const saved = safeParseStoredObject<Record<string, unknown>>(
      localStorage.getItem(DONATION_FILTERS_STORAGE_KEY)
    );
    return parseAllowedValueOrEmpty(saved?.paymentStatus, PAYMENT_STATUS_VALUES);
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(() => {
    const fromUrl = parseAllowedValueOrEmpty(searchParams.get('type'), PAYMENT_METHOD_VALUES);
    if (fromUrl) return fromUrl;
    const saved = safeParseStoredObject<Record<string, unknown>>(
      localStorage.getItem(DONATION_FILTERS_STORAGE_KEY)
    );
    return parseAllowedValueOrEmpty(saved?.paymentMethod, PAYMENT_METHOD_VALUES);
  });
  const [currentPage, setCurrentPage] = useState(() => parsePositiveInteger(searchParams.get('page'), 1));
  const hasActiveFilters = Boolean(search || paymentStatus || paymentMethod);

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

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (paymentStatus) params.set('status', paymentStatus);
    if (paymentMethod) params.set('type', paymentMethod);
    if (currentPage > 1) params.set('page', String(currentPage));
    setSearchParams(params, { replace: true });
    localStorage.setItem(
      DONATION_FILTERS_STORAGE_KEY,
      JSON.stringify({ search, paymentStatus, paymentMethod })
    );
  }, [search, paymentStatus, paymentMethod, currentPage, setSearchParams]);

  const clearFilters = () => {
    setSearch('');
    setPaymentStatus('');
    setPaymentMethod('');
    setCurrentPage(1);
    localStorage.removeItem(DONATION_FILTERS_STORAGE_KEY);
  };

  const applyPreset = (preset: 'completed' | 'pending' | 'card') => {
    if (preset === 'completed') {
      setSearch('');
      setPaymentStatus('completed');
      setPaymentMethod('');
      setCurrentPage(1);
      return;
    }

    if (preset === 'pending') {
      setSearch('');
      setPaymentStatus('pending');
      setPaymentMethod('');
      setCurrentPage(1);
      return;
    }

    setSearch('');
    setPaymentStatus('');
    setPaymentMethod('credit_card');
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-app-accent-soft text-app-accent-text',
      completed: 'bg-app-accent-soft text-app-accent-text',
      failed: 'bg-app-accent-soft text-app-accent-text',
      refunded: 'bg-app-accent-soft text-app-accent-text',
      cancelled: 'bg-app-surface-muted text-app-text',
    };
    return badges[status] || 'bg-app-surface-muted text-app-text';
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'N/A';
    return method.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Donations"
        description="Track donor contributions, payment status, and receipt history."
        actions={
          <PrimaryButton onClick={() => navigate('/donations/new')}>Record Donation</PrimaryButton>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Donations" value={formatCurrency(totalAmount)} />
        <StatCard label="Average Donation" value={formatCurrency(averageAmount)} />
        <StatCard label="Total Count" value={pagination.total} />
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase text-app-text-muted">Quick filters:</span>
        <button
          type="button"
          onClick={() => applyPreset('completed')}
          className="px-2 py-1 text-xs font-semibold border rounded-md bg-app-accent-soft text-app-accent-text"
        >
          Completed
        </button>
        <button
          type="button"
          onClick={() => applyPreset('pending')}
          className="px-2 py-1 text-xs font-semibold border rounded-md bg-app-accent-soft text-app-accent-text"
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => applyPreset('card')}
          className="px-2 py-1 text-xs font-semibold border rounded-md bg-app-accent-soft text-app-accent-text"
        >
          Credit Card
        </button>
      </div>
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
      {hasActiveFilters && (
        <div className="mb-6 flex flex-wrap gap-2">
          {search && <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="px-2 py-1 text-xs border rounded-md">Search: {search} ×</button>}
          {paymentStatus && <button onClick={() => { setPaymentStatus(''); setCurrentPage(1); }} className="px-2 py-1 text-xs border rounded-md">Status: {paymentStatus} ×</button>}
          {paymentMethod && <button onClick={() => { setPaymentMethod(''); setCurrentPage(1); }} className="px-2 py-1 text-xs border rounded-md">Type: {paymentMethod} ×</button>}
          <button onClick={clearFilters} className="px-2 py-1 text-xs font-semibold border rounded-md bg-app-surface-muted">
            Clear all
          </button>
        </div>
      )}

      {error && <ErrorState message={error} />}

      {loading ? (
        <LoadingState label="Loading donations..." />
      ) : donations.length === 0 ? (
        <EmptyState
          title="No donations match your current filters."
          description="Adjust filters or add a new donation record."
          action={
            <div className="flex flex-wrap gap-2">
              {hasActiveFilters && <SecondaryButton onClick={clearFilters}>Clear Filters</SecondaryButton>}
              <PrimaryButton onClick={() => navigate('/donations/new')}>Record Donation</PrimaryButton>
            </div>
          }
        />
      ) : (
        <>
          <div className="bg-app-surface shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-app-border">
              <thead className="bg-app-surface-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                    Donation #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                    Donor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-app-surface divide-y divide-app-border">
                {donations.map((donation) => (
                  <tr key={donation.donation_id} className="hover:bg-app-surface-muted">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-app-text">
                      {donation.donation_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-app-text">
                        {donation.account_name || donation.contact_name || 'Anonymous'}
                      </div>
                      {donation.campaign_name && (
                        <div className="text-xs text-app-text-muted">{donation.campaign_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-app-text">
                        {formatCurrency(donation.amount, donation.currency)}
                      </div>
                      {donation.is_recurring && (
                        <div className="text-xs text-app-accent">
                          Recurring ({donation.recurring_frequency})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text">
                      {formatDate(donation.donation_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text">
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
                        <span className="text-app-accent">✓ Sent</span>
                      ) : (
                        <span className="text-app-text-subtle">Not Sent</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/donations/${donation.donation_id}`)}
                        className="text-app-accent hover:text-app-accent-text mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/donations/${donation.donation_id}/edit`)}
                        className="text-app-accent hover:text-app-accent-text"
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
              <div className="text-sm text-app-text-muted">
                Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} total
                donations)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-app-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-app-surface-muted"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={currentPage === pagination.total_pages}
                  className="px-4 py-2 border border-app-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-app-surface-muted"
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
