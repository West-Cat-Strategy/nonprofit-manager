/**
 * MODULE-OWNERSHIP: finance page
 *
 * Canonical donation detail implementation for feature-owned finance routes.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchDonationById,
  issueTaxReceipt,
  issueAnnualTaxReceipt,
  downloadTaxReceiptPdf,
  clearSelectedDonation,
} from '../state';
import { formatDateTime, formatCurrency } from '../../../utils/format';
import { triggerFileDownload } from '../../../services/fileDownload';
import { useToast } from '../../../contexts/useToast';
import TaxReceiptModal from '../components/TaxReceiptModal';
import type {
  IssueAnnualTaxReceiptRequest,
  IssueTaxReceiptRequest,
  IssueTaxReceiptResult,
  TaxReceiptDeliveryMode,
} from '../../../types/taxReceipt';
import {
  getAnnualReceiptDisabledReason,
  getSingleReceiptDisabledReason,
} from '../utils/taxReceipts';

const formatProviderLabel = (provider?: string | null): string =>
  provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Stripe';

const DonationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useToast();
  const { selectedDonation: donation, loading } = useAppSelector(
    (state) => state.finance.donations
  );
  const [receiptModalMode, setReceiptModalMode] = useState<'single' | 'annual' | null>(null);
  const [defaultDeliveryMode, setDefaultDeliveryMode] =
    useState<TaxReceiptDeliveryMode>('download');
  const [isReceiptSubmitting, setIsReceiptSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchDonationById(id));
    }

    return () => {
      dispatch(clearSelectedDonation());
    };
  }, [id, dispatch]);

  const refreshDonation = async () => {
    if (!id) {
      return;
    }

    await dispatch(fetchDonationById(id)).unwrap();
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

    const actionLabel =
      result.receipt.kind === 'annual_summary_reprint'
        ? 'Donation summary'
        : result.reusedExistingReceipt
          ? 'Official tax receipt'
          : 'Tax receipt';

    showSuccess(
      deliveryMode === 'email' ? `${actionLabel} processed.` : `${actionLabel} ready for download.`
    );

    if (result.delivery.warning) {
      showError(result.delivery.warning);
    } else if (result.delivery.requested && result.delivery.sent) {
      showSuccess(`Receipt emailed to ${result.delivery.recipientEmail || 'the payee on file'}.`);
    }
  };

  const handleReceiptSubmit = async (
    payload:
      | { mode: 'single'; request: IssueTaxReceiptRequest }
      | { mode: 'annual'; request: IssueAnnualTaxReceiptRequest }
  ) => {
    if (!id) {
      return;
    }

    setIsReceiptSubmitting(true);
    try {
      const result =
        payload.mode === 'single'
          ? await dispatch(
              issueTaxReceipt({
                donationId: id,
                request: payload.request,
              })
            ).unwrap()
          : await dispatch(issueAnnualTaxReceipt(payload.request)).unwrap();

      await handleReceiptResult(result, payload.request.deliveryMode);
      await refreshDonation();
      setReceiptModalMode(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to process tax receipt');
    } finally {
      setIsReceiptSubmitting(false);
    }
  };

  const handleDownloadExistingReceipt = async () => {
    if (!donation?.official_tax_receipt_id) {
      return;
    }

    try {
      await downloadReceipt(
        donation.official_tax_receipt_id,
        `${donation.official_tax_receipt_number || 'tax-receipt'}.pdf`
      );
      showSuccess('Receipt download started.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to download tax receipt');
    }
  };

  const openSingleReceiptModal = (nextDeliveryMode: TaxReceiptDeliveryMode = 'download') => {
    setDefaultDeliveryMode(nextDeliveryMode);
    setReceiptModalMode('single');
  };

  const openAnnualReceiptModal = () => {
    setDefaultDeliveryMode('download');
    setReceiptModalMode('annual');
  };

  if (loading || !donation) {
    return <div className="p-6 text-center">Loading donation details...</div>;
  }

  const singleReceiptDisabledReason = getSingleReceiptDisabledReason(donation);
  const annualReceiptDisabledReason = getAnnualReceiptDisabledReason(donation);

  return (
    <>
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{donation.donation_number}</h1>
            <div className="flex gap-2">
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  donation.payment_status === 'completed'
                    ? 'bg-app-accent-soft text-app-accent-text'
                    : donation.payment_status === 'pending'
                      ? 'bg-app-accent-soft text-app-accent-text'
                      : 'bg-app-accent-soft text-app-accent-text'
                }`}
              >
                {donation.payment_status}
              </span>
              {donation.is_recurring && (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-app-accent-soft text-app-accent-text">
                  Recurring
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {donation.official_tax_receipt_id ? (
              <>
                <button
                  onClick={() => void handleDownloadExistingReceipt()}
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-md hover:bg-app-accent-hover"
                >
                  Download Receipt
                </button>
                <button
                  onClick={() => openSingleReceiptModal('email')}
                  className="px-4 py-2 border rounded-md hover:bg-app-surface-muted"
                >
                  Email Receipt
                </button>
              </>
            ) : (
              <button
                onClick={() => openSingleReceiptModal('download')}
                disabled={Boolean(singleReceiptDisabledReason)}
                title={singleReceiptDisabledReason || 'Issue official tax receipt'}
                className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-md hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Issue Tax Receipt
              </button>
            )}
            <button
              onClick={openAnnualReceiptModal}
              disabled={Boolean(annualReceiptDisabledReason)}
              title={annualReceiptDisabledReason || 'Generate annual receipt'}
              className="px-4 py-2 border rounded-md hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Annual Receipt
            </button>
            <button
              onClick={() => navigate(`/donations/${id}/edit`)}
              className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-md hover:bg-app-accent-hover"
            >
              Edit
            </button>
            <button
              onClick={() => navigate('/donations')}
              className="px-4 py-2 border rounded-md hover:bg-app-surface-muted"
            >
              Back
            </button>
          </div>
        </div>

        <div className="bg-app-surface shadow-md rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Donation Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Amount</dt>
                  <dd className="text-2xl font-bold text-app-accent">
                    {formatCurrency(donation.amount, donation.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Donation Date</dt>
                  <dd className="text-sm text-app-text">
                    {formatDateTime(donation.donation_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Payment Method</dt>
                  <dd className="text-sm text-app-text">
                    {donation.payment_method
                      ?.replace('_', ' ')
                      .replace(/\b\w/g, (value) => value.toUpperCase()) || 'N/A'}
                  </dd>
                </div>
                {donation.transaction_id && (
                  <div>
                    <dt className="text-sm font-medium text-app-text-muted">Transaction ID</dt>
                    <dd className="text-sm text-app-text font-mono">{donation.transaction_id}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Payment Provider</dt>
                  <dd className="text-sm text-app-text">
                    {formatProviderLabel(donation.payment_provider)}
                  </dd>
                </div>
                {donation.provider_transaction_id && (
                  <div>
                    <dt className="text-sm font-medium text-app-text-muted">
                      Provider Transaction ID
                    </dt>
                    <dd className="text-sm text-app-text font-mono">
                      {donation.provider_transaction_id}
                    </dd>
                  </div>
                )}
                {donation.provider_checkout_session_id && (
                  <div>
                    <dt className="text-sm font-medium text-app-text-muted">
                      Provider Checkout Session
                    </dt>
                    <dd className="text-sm text-app-text font-mono">
                      {donation.provider_checkout_session_id}
                    </dd>
                  </div>
                )}
                {donation.provider_subscription_id && (
                  <div>
                    <dt className="text-sm font-medium text-app-text-muted">
                      Provider Subscription ID
                    </dt>
                    <dd className="text-sm text-app-text font-mono">
                      {donation.provider_subscription_id}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Donor Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Donor</dt>
                  <dd className="text-sm text-app-text">
                    {donation.account_name || donation.contact_name || 'Anonymous'}
                  </dd>
                </div>
                {donation.campaign_name && (
                  <div>
                    <dt className="text-sm font-medium text-app-text-muted">Campaign</dt>
                    <dd className="text-sm text-app-text">{donation.campaign_name}</dd>
                  </div>
                )}
                {donation.designation && (
                  <div>
                    <dt className="text-sm font-medium text-app-text-muted">Designation</dt>
                    <dd className="text-sm text-app-text">{donation.designation}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {donation.is_recurring && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Recurring Donation</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Frequency</dt>
                  <dd className="text-sm text-app-text capitalize">
                    {donation.recurring_frequency?.replace('_', ' ')}
                  </dd>
                </div>
                {donation.recurring_plan_id ? (
                  <>
                    <div>
                      <dt className="text-sm font-medium text-app-text-muted">Plan Status</dt>
                      <dd className="text-sm text-app-text capitalize">
                        {donation.recurring_plan_status?.replace(/_/g, ' ') || 'linked'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-app-text-muted">Recurring Plan</dt>
                      <dd className="text-sm text-app-text">
                        <button
                          onClick={() =>
                            navigate(`/recurring-donations/${donation.recurring_plan_id}`)
                          }
                          className="text-app-accent hover:text-app-accent-hover"
                        >
                          Open monthly plan
                        </button>
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </div>
          )}

          {donation.notes && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <p className="text-app-text-muted whitespace-pre-wrap">{donation.notes}</p>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Receipt Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-app-text-muted">Legacy Receipt Flag</dt>
                <dd className="text-sm">
                  {donation.receipt_sent ? (
                    <span className="text-app-accent font-semibold">Marked as sent</span>
                  ) : (
                    <span className="text-app-text-subtle">Not marked</span>
                  )}
                </dd>
              </div>
              {donation.receipt_sent_date && (
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">
                    Legacy Receipt Sent Date
                  </dt>
                  <dd className="text-sm text-app-text">
                    {formatDateTime(donation.receipt_sent_date)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-app-text-muted">Official Tax Receipt</dt>
                <dd className="text-sm text-app-text">
                  {donation.official_tax_receipt_number ? (
                    <span className="font-semibold">{donation.official_tax_receipt_number}</span>
                  ) : (
                    'Not issued yet'
                  )}
                </dd>
              </div>
              {donation.official_tax_receipt_kind && (
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Receipt Type</dt>
                  <dd className="text-sm text-app-text">
                    {donation.official_tax_receipt_kind.replace(/_/g, ' ')}
                  </dd>
                </div>
              )}
              {donation.official_tax_receipt_issued_at && (
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Issued At</dt>
                  <dd className="text-sm text-app-text">
                    {formatDateTime(donation.official_tax_receipt_issued_at)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Record details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-app-text-muted">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {formatDateTime(donation.created_at) || 'Unavailable'}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{' '}
                {formatDateTime(donation.updated_at) || 'Unavailable'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <TaxReceiptModal
        isOpen={receiptModalMode !== null}
        mode={receiptModalMode ?? 'single'}
        donation={donation}
        onClose={() => setReceiptModalMode(null)}
        onSubmit={handleReceiptSubmit}
        isSubmitting={isReceiptSubmitting}
        defaultDeliveryMode={defaultDeliveryMode}
      />
    </>
  );
};

export default DonationDetail;
