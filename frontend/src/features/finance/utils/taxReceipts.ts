import type { Donation, PaymentMethod } from '../../../types/donation';
import type { TaxReceiptPayeeType } from '../../../types/taxReceipt';

const CASH_EQUIVALENT_PAYMENT_METHODS = new Set<PaymentMethod>([
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
]);

export interface DonationPayeeOption {
  type: TaxReceiptPayeeType;
  id: string;
  label: string;
}

export const isCashEquivalentPaymentMethod = (
  paymentMethod: PaymentMethod | null
): boolean => Boolean(paymentMethod && CASH_EQUIVALENT_PAYMENT_METHODS.has(paymentMethod));

export const getDonationPayeeOptions = (donation: Donation): DonationPayeeOption[] => {
  const options: DonationPayeeOption[] = [];

  if (donation.contact_id) {
    options.push({
      type: 'contact',
      id: donation.contact_id,
      label: donation.contact_name || 'Linked contact',
    });
  }

  if (donation.account_id) {
    options.push({
      type: 'account',
      id: donation.account_id,
      label: donation.account_name || 'Linked account',
    });
  }

  return options;
};

export const canIssueOfficialTaxReceipt = (donation: Donation): boolean =>
  donation.payment_status === 'completed' &&
  isCashEquivalentPaymentMethod(donation.payment_method) &&
  getDonationPayeeOptions(donation).length > 0;

export const getSingleReceiptDisabledReason = (donation: Donation): string | null => {
  if (donation.official_tax_receipt_id) {
    return 'An official tax receipt has already been issued.';
  }

  if (donation.payment_status !== 'completed') {
    return 'Only completed donations can receive official tax receipts.';
  }

  if (!isCashEquivalentPaymentMethod(donation.payment_method)) {
    return 'Official tax receipts are limited to cash-equivalent donations in v1.';
  }

  if (getDonationPayeeOptions(donation).length === 0) {
    return 'Link this donation to a contact or account before issuing a receipt.';
  }

  return null;
};

export const getAnnualReceiptDisabledReason = (donation: Donation): string | null => {
  if (getDonationPayeeOptions(donation).length === 0) {
    return 'Link this donation to a contact or account before generating an annual receipt.';
  }

  return null;
};

export const getCalendarYearDateRange = (
  donationDate: string
): { dateFrom: string; dateTo: string } => {
  const parsedDate = new Date(donationDate);
  const year = Number.isNaN(parsedDate.getTime())
    ? new Date().getUTCFullYear()
    : parsedDate.getUTCFullYear();

  return {
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
  };
};
