/**
 * MODULE-OWNERSHIP: finance page
 *
 * Canonical donation list implementation for feature-owned finance routes.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchDonations,
  issueTaxReceipt,
  issueAnnualTaxReceipt,
  downloadTaxReceiptPdf,
} from '../state';
import type { Donation, PaymentMethod, PaymentStatus } from '../../../types/donation';
import type {
  IssueAnnualTaxReceiptRequest,
  IssueTaxReceiptRequest,
  IssueTaxReceiptResult,
  TaxReceiptDeliveryMode,
} from '../../../types/taxReceipt';
import { formatDate, formatCurrency } from '../../../utils/format';
import { triggerFileDownload } from '../../../services/fileDownload';
import { useToast } from '../../../contexts/useToast';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SecondaryButton,
  SectionCard,
  StatCard,
} from '../../../components/ui';
import {
  parseAllowedValueOrEmpty,
  parsePositiveInteger,
  safeParseStoredObject,
} from '../../../utils/persistedFilters';
import TaxReceiptModal from '../components/TaxReceiptModal';
import {
  getAnnualReceiptDisabledReason,
  getSingleReceiptDisabledReason,
} from '../utils/taxReceipts';

const DONATION_FILTERS_STORAGE_KEY = 'donations_list_filters_v1';
const PAYMENT_STATUS_VALUES = ['pending', 'completed', 'failed', 'refunded', 'cancelled'] as const;
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
const donationActionLinkClass =
  'inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] bg-[var(--app-accent)] px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm transition hover:bg-[var(--app-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2';
const fundraiserWorkflowLinks = [
  {
    title: 'Reports workspace',
    description: 'Start from the fundraiser reporting home.',
    to: '/reports',
  },
  {
    title: 'Fundraising cadence templates',
    description: 'Open prefiltered stewardship report templates.',
    to: '/reports/templates?category=fundraising&tag=fundraising-cadence',
  },
  {
    title: 'Scheduled reports',
    description: 'Review recurring fundraiser exports and delivery windows.',
    to: '/reports/scheduled',
  },
  {
    title: 'Opportunity pipeline',
    description: 'Hand off promising donors into the major gifts pipeline.',
    to: '/opportunities',
  },
  {
    title: 'Communications settings',
    description: 'Tune outreach channels before the next donor touchpoint.',
    to: '/settings/communications',
  },
] as const;

const DonationList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useToast();
  const { donations, pagination, totalAmount, averageAmount, loading, error } = useAppSelector(
    (state) => state.finance.donations
  );
  const [receiptModalDonation, setReceiptModalDonation] = useState<Donation | null>(null);
  const [receiptModalMode, setReceiptModalMode] = useState<'single' | 'annual' | null>(null);
  const [defaultDeliveryMode, setDefaultDeliveryMode] =
    useState<TaxReceiptDeliveryMode>('download');
  const [isReceiptSubmitting, setIsReceiptSubmitting] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

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
  const [currentPage, setCurrentPage] = useState(() =>
    parsePositiveInteger(searchParams.get('page'), 1)
  );
  const hasActiveFilters = Boolean(search || paymentStatus || paymentMethod);

  const loadDonations = useCallback(() => {
    return dispatch(
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

  const downloadReceipt = async (receiptId: string, fallbackFilename: string) => {
    const file = await dispatch(
      downloadTaxReceiptPdf({
        receiptId,
        fallbackFilename,
      })
    ).unwrap();

    triggerFileDownload(file);
  };

  const handleReceiptResult = async (
    result: IssueTaxReceiptResult,
    deliveryMode?: TaxReceiptDeliveryMode
  ) => {
    if (deliveryMode !== 'email') {
      await downloadReceipt(result.receipt.id, `${result.receipt.receipt_number}.pdf`);
    }

    showSuccess(
      result.receipt.kind === 'annual_summary_reprint'
        ? 'Donation summary generated.'
        : 'Tax receipt processed successfully.'
    );

    if (result.delivery.warning) {
      showError(result.delivery.warning);
    } else if (result.delivery.requested && result.delivery.sent) {
      showSuccess(`Receipt emailed to ${result.delivery.recipientEmail || 'the payee on file'}.`);
    }
  };

  const handleModalSubmit = async (
    payload:
      | { mode: 'single'; request: IssueTaxReceiptRequest }
      | { mode: 'annual'; request: IssueAnnualTaxReceiptRequest }
  ) => {
    if (!receiptModalDonation) {
      return;
    }

    setIsReceiptSubmitting(true);
    try {
      const result =
        payload.mode === 'single'
          ? await dispatch(
              issueTaxReceipt({
                donationId: receiptModalDonation.donation_id,
                request: payload.request,
              })
            ).unwrap()
          : await dispatch(issueAnnualTaxReceipt(payload.request)).unwrap();

      await handleReceiptResult(result, payload.request.deliveryMode);
      await loadDonations().unwrap();
      setReceiptModalDonation(null);
      setReceiptModalMode(null);
    } catch (submitError) {
      showError(
        submitError instanceof Error ? submitError.message : 'Failed to process tax receipt'
      );
    } finally {
      setIsReceiptSubmitting(false);
    }
  };

  const openReceiptModal = (
    donation: Donation,
    mode: 'single' | 'annual',
    deliveryMode: TaxReceiptDeliveryMode = 'download'
  ) => {
    setReceiptModalDonation(donation);
    setReceiptModalMode(mode);
    setDefaultDeliveryMode(deliveryMode);
  };

  const handleDownloadExistingReceipt = async (donation: Donation) => {
    if (!donation.official_tax_receipt_id) {
      return;
    }

    try {
      await downloadReceipt(
        donation.official_tax_receipt_id,
        `${donation.official_tax_receipt_number || 'tax-receipt'}.pdf`
      );
      showSuccess('Receipt download started.');
    } catch (downloadError) {
      showError(
        downloadError instanceof Error ? downloadError.message : 'Failed to download tax receipt'
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-[var(--loop-yellow)] text-black',
      completed: 'bg-[var(--loop-green)] text-black',
      failed: 'bg-[var(--loop-pink)] text-black',
      refunded: 'bg-[var(--loop-cyan)] text-black',
      cancelled: 'bg-app-surface-muted text-app-text',
    };
    return badges[status] || 'bg-app-surface-muted text-app-text';
  };

  const getPaymentStatusLabel = (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'N/A';
    return method.replace('_', ' ').replace(/\b\w/g, (value) => value.toUpperCase());
  };

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        <PageHeader
          title="Donations"
          description="Track donor contributions, payment status, and official receipt history."
          actions={
            <Link className={donationActionLinkClass} to="/donations/new">
              Record Donation
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Total Donations" value={formatCurrency(totalAmount)} />
          <StatCard label="Average Donation" value={formatCurrency(averageAmount)} />
          <StatCard label="Total Count" value={pagination.total} />
        </div>

        <SectionCard
          title="Fundraiser Workflow"
          subtitle="Jump from gift intake to stewardship reporting, outreach setup, and pipeline follow-through."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {fundraiserWorkflowLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-bg px-3 py-3 transition hover:border-app-accent hover:bg-app-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
              >
                <p className="text-sm font-semibold text-app-text">{link.title}</p>
                <p className="mt-1 text-xs text-app-text-muted">{link.description}</p>
              </Link>
            ))}
          </div>
        </SectionCard>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-app-text-muted">
            Quick filters:
          </span>
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
        <details
          open={filtersExpanded}
          onToggle={(event) => setFiltersExpanded(event.currentTarget.open)}
          className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-muted px-4 py-3"
        >
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-app-text-muted">
            Filter donations
          </summary>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <input
                type="text"
                placeholder="Search donations..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border rounded-md"
                aria-label="Search donations"
              />

              <select
                value={paymentStatus}
                onChange={(event) => {
                  setPaymentStatus(event.target.value as PaymentStatus | '');
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
                onChange={(event) => {
                  setPaymentMethod(event.target.value as PaymentMethod | '');
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
              <div className="flex flex-wrap gap-2">
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs border rounded-md"
                  >
                    Search: {search} ×
                  </button>
                )}
                {paymentStatus && (
                  <button
                    onClick={() => {
                      setPaymentStatus('');
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs border rounded-md"
                  >
                    Status: {paymentStatus} ×
                  </button>
                )}
                {paymentMethod && (
                  <button
                    onClick={() => {
                      setPaymentMethod('');
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs border rounded-md"
                  >
                    Type: {paymentMethod} ×
                  </button>
                )}
                <button
                  onClick={clearFilters}
                  className="px-2 py-1 text-xs font-semibold border rounded-md bg-app-surface-muted"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </details>

        {error && <ErrorState message={error} />}

        {loading ? (
          <LoadingState label="Loading donations..." />
        ) : donations.length === 0 ? (
          <EmptyState
            title="No donations match your current filters."
            description="Adjust filters or add a new donation record."
            action={
              <div className="flex flex-wrap gap-2">
                {hasActiveFilters && (
                  <SecondaryButton onClick={clearFilters}>Clear Filters</SecondaryButton>
                )}
                <Link className={donationActionLinkClass} to="/donations/new">
                  Record Donation
                </Link>
              </div>
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg bg-app-surface shadow-md">
              <div className="space-y-3 p-4 md:hidden">
                {donations.map((donation) => {
                  const singleReceiptDisabledReason = getSingleReceiptDisabledReason(donation);
                  const annualReceiptDisabledReason = getAnnualReceiptDisabledReason(donation);

                  return (
                    <div
                      key={donation.donation_id}
                      data-testid="mobile-donation-card"
                      className="rounded-[var(--ui-radius-md)] border border-app-border bg-app-bg p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-app-text-muted">
                            {donation.donation_number}
                          </p>
                          <p className="mt-1 text-base font-semibold text-app-text">
                            {donation.account_name || donation.contact_name || 'Anonymous'}
                          </p>
                          <p className="mt-1 text-sm text-app-text-muted">
                            {formatCurrency(donation.amount, donation.currency)} ·{' '}
                            {formatDate(donation.donation_date)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(
                            donation.payment_status
                          )}`}
                        >
                          {getPaymentStatusLabel(donation.payment_status)}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-app-text-muted">
                        <p>Payment: {getPaymentMethodLabel(donation.payment_method)}</p>
                        <p>
                          Receipt:{' '}
                          {donation.official_tax_receipt_number ||
                            (donation.receipt_sent ? 'Legacy sent' : 'Not issued')}
                        </p>
                      </div>

                      <details className="mt-3">
                        <summary className="cursor-pointer rounded border border-app-border px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-surface">
                          Actions
                        </summary>
                        <div className="mt-2 grid gap-2">
                          <Link
                            to={`/donations/${donation.donation_id}`}
                            className="rounded border border-app-border px-3 py-2 text-sm font-medium text-app-text"
                          >
                            View
                          </Link>
                          <Link
                            to={`/donations/${donation.donation_id}/edit`}
                            className="rounded border border-app-border px-3 py-2 text-sm font-medium text-app-text"
                          >
                            Edit
                          </Link>
                          {donation.official_tax_receipt_id ? (
                            <button
                              onClick={() => void handleDownloadExistingReceipt(donation)}
                              className="rounded border border-app-border px-3 py-2 text-sm font-medium text-app-text"
                            >
                              Download Receipt
                            </button>
                          ) : (
                            <button
                              onClick={() => openReceiptModal(donation, 'single', 'download')}
                              disabled={Boolean(singleReceiptDisabledReason)}
                              title={singleReceiptDisabledReason || 'Issue official tax receipt'}
                              className="rounded border border-app-border px-3 py-2 text-sm font-medium text-app-text disabled:cursor-not-allowed disabled:text-app-text-muted"
                            >
                              Issue Receipt
                            </button>
                          )}
                          <button
                            onClick={() => openReceiptModal(donation, 'annual', 'download')}
                            disabled={Boolean(annualReceiptDisabledReason)}
                            title={
                              annualReceiptDisabledReason ||
                              'Generate annual receipt for this donor'
                            }
                            className="rounded border border-app-border px-3 py-2 text-sm font-medium text-app-text disabled:cursor-not-allowed disabled:text-app-text-muted"
                          >
                            Annual Receipt
                          </button>
                          {donation.recurring_plan_id ? (
                            <Link
                              to={`/recurring-donations/${donation.recurring_plan_id}`}
                              className="rounded border border-app-border px-3 py-2 text-sm font-medium text-app-text"
                            >
                              View Plan
                            </Link>
                          ) : null}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
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
                  <tbody className="divide-y divide-app-border bg-app-surface">
                    {donations.map((donation) => {
                      const singleReceiptDisabledReason = getSingleReceiptDisabledReason(donation);
                      const annualReceiptDisabledReason = getAnnualReceiptDisabledReason(donation);

                      return (
                        <tr key={donation.donation_id} className="hover:bg-app-surface-muted">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-app-text">
                            {donation.donation_number}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-app-text">
                              {donation.account_name || donation.contact_name || 'Anonymous'}
                            </div>
                            {donation.campaign_name && (
                              <div className="text-xs text-app-text-muted">
                                {donation.campaign_name}
                              </div>
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
                            {donation.recurring_plan_id ? (
                              <div className="text-xs text-app-text-muted">
                                Plan status:{' '}
                                {donation.recurring_plan_status?.replace(/_/g, ' ') || 'linked'}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text">
                            {formatDate(donation.donation_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text">
                            {getPaymentMethodLabel(donation.payment_method)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                                donation.payment_status
                              )}`}
                            >
                              {getPaymentStatusLabel(donation.payment_status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {donation.official_tax_receipt_number ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-app-text">
                                  {donation.official_tax_receipt_number}
                                </div>
                                {donation.official_tax_receipt_issued_at ? (
                                  <div className="text-xs text-app-text-muted">
                                    {formatDate(donation.official_tax_receipt_issued_at)}
                                  </div>
                                ) : null}
                              </div>
                            ) : donation.receipt_sent ? (
                              <span className="text-app-accent">Legacy sent</span>
                            ) : (
                              <span className="text-app-text-subtle">Not issued</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            <div className="flex flex-wrap gap-3">
                              <Link
                                to={`/donations/${donation.donation_id}`}
                                className="text-app-accent hover:text-app-accent-text"
                              >
                                View
                              </Link>
                              <Link
                                to={`/donations/${donation.donation_id}/edit`}
                                className="text-app-accent hover:text-app-accent-text"
                              >
                                Edit
                              </Link>
                              {donation.official_tax_receipt_id ? (
                                <button
                                  onClick={() => void handleDownloadExistingReceipt(donation)}
                                  className="text-app-accent hover:text-app-accent-text"
                                >
                                  Download Receipt
                                </button>
                              ) : (
                                <button
                                  onClick={() => openReceiptModal(donation, 'single', 'download')}
                                  disabled={Boolean(singleReceiptDisabledReason)}
                                  title={
                                    singleReceiptDisabledReason || 'Issue official tax receipt'
                                  }
                                  className="text-app-accent hover:text-app-accent-text disabled:cursor-not-allowed disabled:text-app-text-muted"
                                >
                                  Issue Receipt
                                </button>
                              )}
                              <button
                                onClick={() => openReceiptModal(donation, 'annual', 'download')}
                                disabled={Boolean(annualReceiptDisabledReason)}
                                title={
                                  annualReceiptDisabledReason ||
                                  'Generate annual receipt for this donor'
                                }
                                className="text-app-accent hover:text-app-accent-text disabled:cursor-not-allowed disabled:text-app-text-muted"
                              >
                                Annual Receipt
                              </button>
                              {donation.recurring_plan_id ? (
                                <Link
                                  to={`/recurring-donations/${donation.recurring_plan_id}`}
                                  className="text-app-accent hover:text-app-accent-text"
                                >
                                  View Plan
                                </Link>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {pagination.total_pages > 1 && (
              <>
                <div className="mt-6 flex flex-col gap-3 md:hidden">
                  <div className="text-sm text-app-text-muted">
                    Page {pagination.page} of {pagination.total_pages} ({pagination.total} total
                    donations)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="flex-1 rounded-md border border-app-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((page) => Math.min(pagination.total_pages, page + 1))
                      }
                      disabled={currentPage === pagination.total_pages}
                      className="flex-1 rounded-md border border-app-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
                <div className="mt-6 hidden items-center justify-between md:flex">
                  <div className="text-sm text-app-text-muted">
                    Showing page {pagination.page} of {pagination.total_pages} ({pagination.total}{' '}
                    total donations)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="rounded-md border border-app-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-app-surface-muted"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((page) => Math.min(pagination.total_pages, page + 1))
                      }
                      disabled={currentPage === pagination.total_pages}
                      className="rounded-md border border-app-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-app-surface-muted"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <TaxReceiptModal
        isOpen={receiptModalMode !== null}
        mode={receiptModalMode ?? 'single'}
        donation={receiptModalDonation}
        onClose={() => {
          setReceiptModalDonation(null);
          setReceiptModalMode(null);
        }}
        onSubmit={handleModalSubmit}
        isSubmitting={isReceiptSubmitting}
        defaultDeliveryMode={defaultDeliveryMode}
      />
    </>
  );
};

export default DonationList;
