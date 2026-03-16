export type TaxReceiptKind =
  | 'single_official'
  | 'annual_official'
  | 'annual_summary_reprint';

export type TaxReceiptPayeeType = 'contact' | 'account';

export type TaxReceiptDeliveryMode = 'download' | 'email' | 'both';

export type TaxReceiptEmailDeliveryStatus =
  | 'not_requested'
  | 'pending'
  | 'sent'
  | 'failed';

export interface TaxReceiptDeliverySummary {
  requested: boolean;
  sent: boolean;
  warning?: string;
  status: TaxReceiptEmailDeliveryStatus;
  recipientEmail?: string | null;
}

export interface TaxReceipt {
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
  email_delivery_status: TaxReceiptEmailDeliveryStatus;
  email_sent_at: string | null;
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
  created_at: string;
  updated_at: string;
}

export interface IssueTaxReceiptRequest {
  payeeType?: TaxReceiptPayeeType;
  deliveryMode?: TaxReceiptDeliveryMode;
  email?: string;
}

export interface IssueAnnualTaxReceiptRequest {
  payeeType: TaxReceiptPayeeType;
  payeeId: string;
  dateFrom: string;
  dateTo: string;
  includeAlreadyReceipted?: boolean;
  deliveryMode?: TaxReceiptDeliveryMode;
  email?: string;
}

export interface IssueTaxReceiptResult {
  receipt: TaxReceipt;
  coveredDonationIds: string[];
  delivery: TaxReceiptDeliverySummary;
  reusedExistingReceipt: boolean;
}
