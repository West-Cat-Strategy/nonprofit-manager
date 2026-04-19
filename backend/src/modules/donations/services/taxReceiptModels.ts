import type { DataScopeFilter } from '@app-types/dataScope';
import type { OrganizationSettingsConfig } from '@app-types/organizationSettings';
import type {
  TaxReceipt,
  TaxReceiptDeliveryMode,
  TaxReceiptKind,
  TaxReceiptPayeeType,
} from '@app-types/taxReceipt';

export const CASH_EQUIVALENT_PAYMENT_METHODS = new Set([
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
]);

export type DonationReceiptRow = {
  donation_id: string;
  donation_number: string;
  amount: string;
  currency: string;
  donation_date: string;
  payment_method: string | null;
  payment_status: string;
  account_id: string | null;
  contact_id: string | null;
  campaign_name: string | null;
  designation: string | null;
};

export type PayeeRecord = {
  payeeType: TaxReceiptPayeeType;
  payeeId: string;
  payeeName: string;
  payeeEmail: string | null;
  payeePhone: string | null;
  payeeAddress: {
    line1: string;
    line2: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
};

export type TaxReceiptRow = {
  id: string;
  organization_id: string;
  receipt_number: string;
  sequence_year: number;
  sequence_number: number;
  kind: TaxReceiptKind;
  payee_type: TaxReceiptPayeeType;
  payee_id: string;
  payee_name: string;
  payee_email: string | null;
  delivery_mode: TaxReceiptDeliveryMode;
  email_delivery_status: 'not_requested' | 'pending' | 'sent' | 'failed';
  email_sent_at: Date | null;
  email_error: string | null;
  issue_date: string;
  period_start: string | null;
  period_end: string | null;
  include_previously_receipted: boolean;
  is_official: boolean;
  total_amount: string;
  currency: string;
  created_by: string | null;
  modified_by: string | null;
  created_at: Date;
  updated_at: Date;
  pdf_content?: Buffer;
  snapshot?: ReceiptSnapshot;
};

export type ReceiptSnapshot = {
  title: string;
  issueDate: string;
  receiptNumber: string;
  periodStart: string | null;
  periodEnd: string | null;
  isOfficial: boolean;
  organization: {
    legalName: string;
    charitableRegistrationNumber: string;
    receiptingAddress: OrganizationSettingsConfig['taxReceipt']['receiptingAddress'];
    receiptIssueLocation: string;
    authorizedSignerName: string;
    authorizedSignerTitle: string;
    contactEmail: string;
    contactPhone: string;
  };
  payee: {
    type: TaxReceiptPayeeType;
    name: string;
    email: string | null;
    address: PayeeRecord['payeeAddress'];
  };
  items: Array<{
    donationId: string;
    donationNumber: string;
    donationDate: string;
    amount: string;
    currency: string;
    campaignName: string | null;
    designation: string | null;
  }>;
  totalAmount: string;
  currency: string;
  notes: string[];
};

export const toIsoDate = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const toNumericAmount = (value: string | number): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeCurrencyAmount = (value: string | number): string => {
  const parsed = toNumericAmount(value);
  if (!Number.isFinite(parsed)) {
    return '0.00';
  }
  return parsed.toFixed(2);
};

export const sumCurrencyAmounts = (values: Array<string | number>): string => {
  const total = values.reduce<number>((acc, value) => acc + toNumericAmount(value), 0);
  return total.toFixed(2);
};

export const mapReceiptRow = (row: TaxReceiptRow): TaxReceipt => ({
  id: row.id,
  organization_id: row.organization_id,
  receipt_number: row.receipt_number,
  sequence_year: row.sequence_year,
  sequence_number: row.sequence_number,
  kind: row.kind,
  payee_type: row.payee_type,
  payee_id: row.payee_id,
  payee_name: row.payee_name,
  payee_email: row.payee_email,
  delivery_mode: row.delivery_mode,
  email_delivery_status: row.email_delivery_status,
  email_sent_at: row.email_sent_at ? row.email_sent_at.toISOString() : null,
  email_error: row.email_error,
  issue_date: row.issue_date,
  period_start: row.period_start,
  period_end: row.period_end,
  include_previously_receipted: row.include_previously_receipted,
  is_official: row.is_official,
  total_amount: row.total_amount,
  currency: row.currency,
  created_by: row.created_by,
  modified_by: row.modified_by,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

export const formatAddressLines = (address: PayeeRecord['payeeAddress']): string[] => {
  const locality = [address.city, address.province, address.postalCode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  return [address.line1, address.line2, locality, address.country]
    .map((line) => line.trim())
    .filter(Boolean);
};

const buildOfficialReceiptNotes = (
  kind: TaxReceiptKind,
  includePreviouslyReceipted: boolean
): string[] => {
  if (kind === 'annual_summary_reprint') {
    return [
      'Summary copy only. This document does not create new official tax receipt coverage.',
      includePreviouslyReceipted
        ? 'This summary may include donations that were officially receipted previously.'
        : 'This summary does not modify prior official receipt coverage.',
    ];
  }

  if (kind === 'annual_official') {
    return [
      'Official annual cumulative receipt for cash donations within the selected date range.',
    ];
  }

  return ['Official donation receipt for income tax purposes.'];
};

export const getMissingOrganizationSettingsFields = (
  config: OrganizationSettingsConfig
): string[] => {
  const missing: string[] = [];
  const tax = config.taxReceipt;

  if (!tax.legalName.trim()) missing.push('taxReceipt.legalName');
  if (!tax.charitableRegistrationNumber.trim()) {
    missing.push('taxReceipt.charitableRegistrationNumber');
  }
  if (!tax.receiptingAddress.line1.trim()) missing.push('taxReceipt.receiptingAddress.line1');
  if (!tax.receiptingAddress.city.trim()) missing.push('taxReceipt.receiptingAddress.city');
  if (!tax.receiptingAddress.province.trim()) {
    missing.push('taxReceipt.receiptingAddress.province');
  }
  if (!tax.receiptingAddress.postalCode.trim()) {
    missing.push('taxReceipt.receiptingAddress.postalCode');
  }
  if (!tax.receiptingAddress.country.trim()) {
    missing.push('taxReceipt.receiptingAddress.country');
  }
  if (!tax.receiptIssueLocation.trim()) missing.push('taxReceipt.receiptIssueLocation');
  if (!tax.authorizedSignerName.trim()) missing.push('taxReceipt.authorizedSignerName');
  if (!tax.authorizedSignerTitle.trim()) missing.push('taxReceipt.authorizedSignerTitle');
  if (!tax.contactEmail.trim()) missing.push('taxReceipt.contactEmail');
  if (!tax.contactPhone.trim()) missing.push('taxReceipt.contactPhone');

  return missing;
};

export const getMissingPayeeAddressFields = (payee: PayeeRecord): string[] => {
  const missing: string[] = [];
  if (!payee.payeeAddress.line1.trim()) missing.push('line1');
  if (!payee.payeeAddress.city.trim()) missing.push('city');
  if (!payee.payeeAddress.province.trim()) missing.push('province');
  if (!payee.payeeAddress.postalCode.trim()) missing.push('postalCode');
  if (!payee.payeeAddress.country.trim()) missing.push('country');
  return missing;
};

export const buildReceiptFilename = (receipt: TaxReceipt): string => `${receipt.receipt_number}.pdf`;

export const eligiblePaymentMethod = (paymentMethod: string | null): boolean =>
  Boolean(paymentMethod && CASH_EQUIVALENT_PAYMENT_METHODS.has(paymentMethod));

export const buildScopeConditions = (
  scope: DataScopeFilter | undefined,
  alias = 'd',
  startIndex = 1
): { clause: string; values: Array<string[]>; nextIndex: number } => {
  const clauses: string[] = [];
  const values: Array<string[]> = [];
  let index = startIndex;

  if (scope?.accountIds && scope.accountIds.length > 0) {
    clauses.push(`${alias}.account_id = ANY($${index}::uuid[])`);
    values.push(scope.accountIds);
    index += 1;
  }

  if (scope?.contactIds && scope.contactIds.length > 0) {
    clauses.push(`${alias}.contact_id = ANY($${index}::uuid[])`);
    values.push(scope.contactIds);
    index += 1;
  }

  if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
    clauses.push(`${alias}.created_by = ANY($${index}::uuid[])`);
    values.push(scope.createdByUserIds);
    index += 1;
  }

  return {
    clause: clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '',
    values,
    nextIndex: index,
  };
};

export const buildReceiptSnapshot = (input: {
  receiptNumber: string;
  kind: TaxReceiptKind;
  isOfficial: boolean;
  organizationSettings: OrganizationSettingsConfig;
  payee: PayeeRecord;
  donations: DonationReceiptRow[];
  issueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  includePreviouslyReceipted: boolean;
}): ReceiptSnapshot => {
  const currency = input.donations[0]?.currency ?? input.organizationSettings.currency;
  return {
    title:
      input.kind === 'annual_summary_reprint'
        ? 'Donation Summary / Reprint'
        : 'Official Donation Receipt for Income Tax Purposes',
    issueDate: input.issueDate,
    receiptNumber: input.receiptNumber,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    isOfficial: input.isOfficial,
    organization: {
      legalName: input.organizationSettings.taxReceipt.legalName,
      charitableRegistrationNumber:
        input.organizationSettings.taxReceipt.charitableRegistrationNumber,
      receiptingAddress: input.organizationSettings.taxReceipt.receiptingAddress,
      receiptIssueLocation: input.organizationSettings.taxReceipt.receiptIssueLocation,
      authorizedSignerName: input.organizationSettings.taxReceipt.authorizedSignerName,
      authorizedSignerTitle: input.organizationSettings.taxReceipt.authorizedSignerTitle,
      contactEmail: input.organizationSettings.taxReceipt.contactEmail,
      contactPhone: input.organizationSettings.taxReceipt.contactPhone,
    },
    payee: {
      type: input.payee.payeeType,
      name: input.payee.payeeName,
      email: input.payee.payeeEmail,
      address: input.payee.payeeAddress,
    },
    items: input.donations.map((donation) => ({
      donationId: donation.donation_id,
      donationNumber: donation.donation_number,
      donationDate: donation.donation_date,
      amount: normalizeCurrencyAmount(donation.amount),
      currency: donation.currency,
      campaignName: donation.campaign_name,
      designation: donation.designation,
    })),
    totalAmount: sumCurrencyAmounts(input.donations.map((donation) => donation.amount)),
    currency,
    notes: buildOfficialReceiptNotes(input.kind, input.includePreviouslyReceipted),
  };
};
