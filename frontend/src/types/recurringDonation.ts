export type RecurringDonationPlanStatus =
  | 'checkout_pending'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'paused';

export interface RecurringDonationPlan {
  recurring_plan_id: string;
  organization_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  site_id: string | null;
  form_key: string | null;
  donor_email: string;
  donor_name: string | null;
  amount: number;
  currency: string;
  interval: 'monthly';
  campaign_name: string | null;
  designation: string | null;
  notes: string | null;
  status: RecurringDonationPlanStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  stripe_checkout_session_id: string | null;
  checkout_completed_at: string | null;
  last_paid_at: string | null;
  next_billing_at: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  public_management_token_issued_at: string | null;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
  account_name?: string | null;
  contact_name?: string | null;
}

export interface RecurringDonationPlanFilters {
  search?: string;
  status?: RecurringDonationPlanStatus;
}

export interface RecurringDonationPlanListPage {
  data: RecurringDonationPlan[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface UpdateRecurringDonationPlanDTO {
  amount?: number;
  campaign_name?: string | null;
  designation?: string | null;
  notes?: string | null;
}

export interface RecurringDonationManagementLinkResponse {
  url: string;
  issued_at: string;
}

export interface RecurringDonationCheckoutSuccessResponse {
  plan: RecurringDonationPlan;
  management_url: string;
  return_url: string;
}
