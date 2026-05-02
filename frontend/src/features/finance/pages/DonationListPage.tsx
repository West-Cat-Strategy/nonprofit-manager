/**
 * MODULE-OWNERSHIP: finance page
 *
 * Canonical donation list implementation for feature-owned finance routes.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import type { PaymentMethod, PaymentStatus } from '../../../types/donation';
import { formatDate, formatCurrency } from '../../../utils/format';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SecondaryButton,
  SectionCard,
  StatCard,
} from '../../../components/ui';
import TaxReceiptModal from '../components/TaxReceiptModal';
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getStatusBadge,
  useDonationListController,
} from '../hooks/useDonationListController';
import {
  getAnnualReceiptDisabledReason,
  getSingleReceiptDisabledReason,
} from '../utils/taxReceipts';

const donationActionLinkClass =
  'inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] bg-[var(--app-accent)] px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-[var(--app-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2';
const fundraiserWorkflowLinks = [
  {
    title: 'Reports workspace',
    description: 'Start from the fundraiser reporting home.',
    to: '/reports',
    Icon: ChartBarIcon,
  },
  {
    title: 'Fundraising cadence templates',
    description: 'Open prefiltered stewardship report templates.',
    to: '/reports/templates?category=fundraising&tag=fundraising-cadence',
    Icon: ClockIcon,
  },
  {
    title: 'Scheduled reports',
    description: 'Review recurring fundraiser exports and delivery windows.',
    to: '/reports/scheduled',
    Icon: ArrowDownTrayIcon,
  },
  {
    title: 'Opportunity pipeline',
    description: 'Hand off promising donors into the major gifts pipeline.',
    to: '/opportunities',
    Icon: BanknotesIcon,
  },
  {
    title: 'Communications settings',
    description: 'Tune outreach channels before the next donor touchpoint.',
    to: '/settings/communications',
    Icon: CheckCircleIcon,
  },
] as const;

const DonationList: React.FC = () => {
  const {
    donations,
    pagination,
    totalAmount,
    averageAmount,
    loading,
    error,
    receiptModalDonation,
    receiptModalMode,
    defaultDeliveryMode,
    isReceiptSubmitting,
    filtersExpanded,
    setFiltersExpanded,
    search,
    setSearch,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    currentPage,
    setCurrentPage,
    hasActiveFilters,
    clearFilters,
    applyPreset,
    handleModalSubmit,
    openReceiptModal,
    handleDownloadExistingReceipt,
    closeReceiptModal,
  } = useDonationListController();

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        <PageHeader
          title="Donations"
          description="Track donor contributions, payment status, and official receipt history."
          actions={
            <Link className={donationActionLinkClass} to="/donations/new">
              <PlusCircleIcon className="h-4 w-4" aria-hidden="true" />
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
            {fundraiserWorkflowLinks.map((link) => {
              const LinkIcon = link.Icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group block rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-bg px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-app-accent hover:bg-app-accent-soft hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                >
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-app-text">
                    <LinkIcon
                      className="h-4 w-4 text-app-accent transition-transform group-hover:scale-110"
                      aria-hidden="true"
                    />
                    {link.title}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted">{link.description}</p>
                </Link>
              );
            })}
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
                        {(donation.designation_label || donation.designation) ? (
                          <p>Designation: {donation.designation_label || donation.designation}</p>
                        ) : null}
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
                            {(donation.designation_label || donation.designation) ? (
                              <div className="text-xs text-app-text-muted">
                                {donation.designation_label || donation.designation}
                              </div>
                            ) : null}
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
        onClose={closeReceiptModal}
        onSubmit={handleModalSubmit}
        isSubmitting={isReceiptSubmitting}
        defaultDeliveryMode={defaultDeliveryMode}
      />
    </>
  );
};

export default DonationList;
