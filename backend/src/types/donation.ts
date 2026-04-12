/**
 * Donation Type Definitions
 * Aligned with Microsoft Common Data Model (CDM) Donation entity
 */

export type PaymentMethod = 
  | 'cash'
  | 'check'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'paypal'
  | 'stock'
  | 'in_kind'
  | 'other';

export type PaymentStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type RecurringFrequency = 
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'one_time';

export interface Donation {
  donation_id: string;
  donation_number: string;
  account_id: string | null;
  contact_id: string | null;
  recurring_plan_id?: string | null;
  payment_provider?: 'stripe' | 'paypal' | 'square' | null;
  amount: number;
  currency: string;
  donation_date: string;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  transaction_id: string | null;
  provider_transaction_id?: string | null;
  provider_checkout_session_id?: string | null;
  provider_subscription_id?: string | null;
  provider_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_invoice_id?: string | null;
  campaign_name: string | null;
  designation: string | null;
  is_recurring: boolean;
  recurring_frequency: RecurringFrequency | null;
  recurring_plan_status?: string | null;
  notes: string | null;
  receipt_sent: boolean;
  receipt_sent_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  modified_by: string;
  
  // Joined fields
  account_name?: string;
  contact_name?: string;
  official_tax_receipt_id?: string | null;
  official_tax_receipt_number?: string | null;
  official_tax_receipt_kind?: 'single_official' | 'annual_official' | null;
  official_tax_receipt_issued_at?: string | null;
}

export interface CreateDonationDTO {
  account_id?: string;
  contact_id?: string;
  recurring_plan_id?: string;
  payment_provider?: 'stripe' | 'paypal' | 'square';
  amount: number;
  currency?: string;
  donation_date: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  transaction_id?: string;
  provider_transaction_id?: string;
  provider_checkout_session_id?: string;
  provider_subscription_id?: string;
  provider_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_invoice_id?: string;
  campaign_name?: string;
  designation?: string;
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency;
  notes?: string;
}

export interface UpdateDonationDTO {
  account_id?: string;
  contact_id?: string;
  recurring_plan_id?: string | null;
  payment_provider?: 'stripe' | 'paypal' | 'square' | null;
  amount?: number;
  currency?: string;
  donation_date?: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  transaction_id?: string;
  provider_transaction_id?: string | null;
  provider_checkout_session_id?: string | null;
  provider_subscription_id?: string | null;
  provider_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_invoice_id?: string | null;
  campaign_name?: string;
  designation?: string;
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency;
  notes?: string;
  receipt_sent?: boolean;
  receipt_sent_date?: string;
}

export interface DonationFilters {
  search?: string;
  account_id?: string;
  contact_id?: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  campaign_name?: string;
  is_recurring?: boolean;
  min_amount?: number;
  max_amount?: number;
  start_date?: string;
  end_date?: string;
}

export type { PaginationParams } from './pagination';

export interface PaginatedDonations {
  data: Donation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  summary?: {
    total_amount: number;
    count: number;
    average_amount: number;
  };
}

export interface DonationSummary {
  total_amount: number;
  total_count: number;
  average_donation: number;
  by_payment_method: Record<string, { count: number; amount: number }>;
  by_campaign: Record<string, { count: number; amount: number }>;
  recurring_count: number;
  recurring_amount: number;
}
