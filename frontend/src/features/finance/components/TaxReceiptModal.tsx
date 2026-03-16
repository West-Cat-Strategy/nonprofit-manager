import { useEffect, useMemo, useState } from 'react';
import type { Donation } from '../../../types/donation';
import type {
  IssueAnnualTaxReceiptRequest,
  IssueTaxReceiptRequest,
  TaxReceiptDeliveryMode,
} from '../../../types/taxReceipt';
import {
  getCalendarYearDateRange,
  getDonationPayeeOptions,
} from '../utils/taxReceipts';

type TaxReceiptModalMode = 'single' | 'annual';

interface TaxReceiptModalProps {
  isOpen: boolean;
  mode: TaxReceiptModalMode;
  donation: Donation | null;
  onClose: () => void;
  onSubmit: (payload:
    | { mode: 'single'; request: IssueTaxReceiptRequest }
    | { mode: 'annual'; request: IssueAnnualTaxReceiptRequest }) => Promise<void>;
  isSubmitting: boolean;
  defaultDeliveryMode?: TaxReceiptDeliveryMode;
}

const DELIVERY_MODE_OPTIONS: Array<{
  value: TaxReceiptDeliveryMode;
  label: string;
  description: string;
}> = [
  {
    value: 'download',
    label: 'Download PDF',
    description: 'Create the receipt and download the canonical PDF.',
  },
  {
    value: 'email',
    label: 'Email only',
    description: 'Create the receipt and send it by email without downloading it.',
  },
  {
    value: 'both',
    label: 'Email and download',
    description: 'Create the receipt, email it, and download the PDF.',
  },
];

export default function TaxReceiptModal({
  isOpen,
  mode,
  donation,
  onClose,
  onSubmit,
  isSubmitting,
  defaultDeliveryMode = 'download',
}: TaxReceiptModalProps) {
  const payeeOptions = useMemo(
    () => (donation ? getDonationPayeeOptions(donation) : []),
    [donation]
  );
  const [selectedPayeeType, setSelectedPayeeType] = useState<'contact' | 'account' | ''>('');
  const [deliveryMode, setDeliveryMode] =
    useState<TaxReceiptDeliveryMode>(defaultDeliveryMode);
  const [email, setEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeAlreadyReceipted, setIncludeAlreadyReceipted] = useState(false);

  useEffect(() => {
    if (!isOpen || !donation) {
      return;
    }

    const payeeType =
      payeeOptions.length === 1 ? payeeOptions[0].type : payeeOptions[0]?.type ?? '';
    const range = getCalendarYearDateRange(donation.donation_date);

    setSelectedPayeeType(payeeType);
    setDeliveryMode(defaultDeliveryMode);
    setEmail('');
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setIncludeAlreadyReceipted(false);
  }, [defaultDeliveryMode, donation, isOpen, payeeOptions]);

  if (!isOpen || !donation) {
    return null;
  }

  const selectedPayee =
    payeeOptions.find((option) => option.type === selectedPayeeType) ?? payeeOptions[0] ?? null;
  const showEmailOverride = deliveryMode === 'email' || deliveryMode === 'both';
  const modalTitle =
    mode === 'annual'
      ? 'Generate Annual Tax Receipt'
      : donation.official_tax_receipt_number && defaultDeliveryMode === 'email'
        ? 'Email Official Tax Receipt'
        : donation.official_tax_receipt_number
          ? 'Reuse Official Tax Receipt'
          : 'Issue Official Tax Receipt';

  const handleSubmit = async () => {
    if (mode === 'annual') {
      if (!selectedPayee) {
        return;
      }

      const annualPayee = selectedPayee;
      await onSubmit({
        mode: 'annual',
        request: {
          payeeType: annualPayee.type,
          payeeId: annualPayee.id,
          dateFrom,
          dateTo,
          includeAlreadyReceipted,
          deliveryMode,
          email: email.trim() || undefined,
        },
      });
      return;
    }

    await onSubmit({
      mode: 'single',
      request: {
        payeeType: payeeOptions.length > 1 ? selectedPayeeType || undefined : undefined,
        deliveryMode,
        email: email.trim() || undefined,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div
        className="w-full max-w-2xl rounded-xl border border-app-border bg-app-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tax-receipt-modal-title"
      >
        <div className="border-b border-app-border px-6 py-4">
          <h2 id="tax-receipt-modal-title" className="text-xl font-semibold text-app-text-heading">
            {modalTitle}
          </h2>
          <p className="mt-1 text-sm text-app-text-muted">
            {mode === 'annual'
              ? 'Generate a cumulative receipt for the selected payee and date range.'
              : 'Create or reuse the canonical official receipt for this donation.'}
          </p>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="rounded-lg border border-app-border bg-app-surface-muted p-4">
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-app-text">
                {donation.donation_number} · {donation.currency} {donation.amount}
              </span>
              <span className="text-app-text-muted">
                {donation.account_name || donation.contact_name || 'Linked donor'}
              </span>
              {donation.official_tax_receipt_number ? (
                <span className="text-app-text-muted">
                  Existing official receipt: {donation.official_tax_receipt_number}
                </span>
              ) : null}
            </div>
          </div>

          {payeeOptions.length > 1 ? (
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-2">
                Legal Payee
              </label>
              <select
                value={selectedPayeeType}
                onChange={(event) =>
                  setSelectedPayeeType(event.target.value as 'contact' | 'account')
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-app-accent"
                title="Select legal payee"
              >
                {payeeOptions.map((option) => (
                  <option key={option.type} value={option.type}>
                    {option.type === 'contact' ? 'Contact' : 'Account'} · {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : selectedPayee ? (
            <div className="rounded-lg border border-app-border bg-app-surface p-4 text-sm text-app-text">
              <span className="font-semibold">Legal payee:</span> {selectedPayee.label}
            </div>
          ) : null}

          {mode === 'annual' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="annual-date-from"
                  className="block text-sm font-medium text-app-text-label mb-2"
                >
                  Date From
                </label>
                <input
                  id="annual-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="annual-date-to"
                  className="block text-sm font-medium text-app-text-label mb-2"
                >
                  Date To
                </label>
                <input
                  id="annual-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>
              <label className="md:col-span-2 flex items-start gap-3 rounded-lg border border-app-border bg-app-surface-muted p-4 text-sm text-app-text">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={includeAlreadyReceipted}
                  onChange={(event) => setIncludeAlreadyReceipted(event.target.checked)}
                />
                <span>
                  Include donations that were already officially receipted. This creates a summary
                  reprint instead of new official coverage.
                </span>
              </label>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-app-text-label mb-2">
              Delivery Mode
            </label>
            <div className="grid gap-3">
              {DELIVERY_MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    deliveryMode === option.value
                      ? 'border-app-accent bg-app-accent-soft'
                      : 'border-app-border bg-app-surface'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="tax-receipt-delivery-mode"
                      value={option.value}
                      checked={deliveryMode === option.value}
                      onChange={() => setDeliveryMode(option.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-semibold text-app-text">{option.label}</div>
                      <div className="text-app-text-muted">{option.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {showEmailOverride ? (
            <div>
              <label
                htmlFor="tax-receipt-email"
                className="block text-sm font-medium text-app-text-label mb-2"
              >
                Email Override
              </label>
              <input
                id="tax-receipt-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Leave blank to use the payee email on file"
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-app-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-app-input-border px-4 py-2 text-sm font-medium text-app-text-muted hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={
              isSubmitting ||
              !selectedPayee ||
              (mode === 'annual' && (!dateFrom || !dateTo))
            }
            className="rounded-lg bg-app-accent px-4 py-2 text-sm font-semibold text-white hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Processing...'
              : mode === 'annual'
                ? 'Generate Receipt'
                : donation.official_tax_receipt_number
                  ? 'Continue'
                  : 'Issue Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
