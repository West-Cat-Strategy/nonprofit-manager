import { createHash, randomBytes } from 'crypto';
import { Pool } from 'pg';
import stripeService from '@services/stripeService';
import paymentProviderService from '@services/paymentProviderService';
import { SiteManagementService } from '@services/publishing/siteManagementService';
import type {
  RecurringDonationManagementLinkResponse,
  RecurringDonationPlan,
  RecurringDonationPlanStatus,
} from '@app-types/recurringDonation';
import type { PaymentProvider } from '@app-types/payment';

type PlanRow = Record<string, unknown>;

export const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

export const PLAN_SELECT = `
  rdp.id AS recurring_plan_id,
  rdp.organization_id,
  rdp.account_id,
  rdp.contact_id,
  rdp.site_id,
  rdp.form_key,
  rdp.donor_email,
  rdp.donor_name,
  rdp.amount,
  rdp.currency,
  rdp.interval,
  rdp.campaign_name,
  rdp.designation,
  rdp.notes,
  rdp.status,
  rdp.payment_provider,
  rdp.provider_customer_id,
  rdp.provider_subscription_id,
  rdp.provider_checkout_session_id,
  rdp.provider_checkout_url,
  rdp.stripe_customer_id,
  rdp.stripe_subscription_id,
  rdp.stripe_price_id,
  rdp.stripe_product_id,
  rdp.stripe_checkout_session_id,
  rdp.checkout_completed_at,
  rdp.last_paid_at,
  rdp.next_billing_at,
  rdp.cancel_at_period_end,
  rdp.canceled_at,
  rdp.public_management_token_issued_at,
  rdp.created_by,
  rdp.modified_by,
  rdp.created_at,
  rdp.updated_at,
  a.account_name,
  NULLIF(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')), ' ') AS contact_name
`;

const asIsoString = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
};

export const mapPlanRow = (row: PlanRow | undefined | null): RecurringDonationPlan | null => {
  if (!row) return null;

  return {
    recurring_plan_id: String(row.recurring_plan_id),
    organization_id: (row.organization_id as string | null) ?? null,
    account_id: (row.account_id as string | null) ?? null,
    contact_id: (row.contact_id as string | null) ?? null,
    site_id: (row.site_id as string | null) ?? null,
    form_key: (row.form_key as string | null) ?? null,
    donor_email: String(row.donor_email || ''),
    donor_name: (row.donor_name as string | null) ?? null,
    amount:
      typeof row.amount === 'number' ? row.amount : Number.parseFloat(String(row.amount || '0')),
    currency: String(row.currency || 'USD').toUpperCase(),
    interval: 'monthly',
    campaign_name: (row.campaign_name as string | null) ?? null,
    designation: (row.designation as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: String(row.status || 'checkout_pending') as RecurringDonationPlanStatus,
    payment_provider: (row.payment_provider as PaymentProvider | null) ?? null,
    provider_customer_id: (row.provider_customer_id as string | null) ?? null,
    provider_subscription_id: (row.provider_subscription_id as string | null) ?? null,
    provider_checkout_session_id: (row.provider_checkout_session_id as string | null) ?? null,
    provider_checkout_url: (row.provider_checkout_url as string | null) ?? null,
    stripe_customer_id: (row.stripe_customer_id as string | null) ?? null,
    stripe_subscription_id: (row.stripe_subscription_id as string | null) ?? null,
    stripe_price_id: (row.stripe_price_id as string | null) ?? null,
    stripe_product_id: (row.stripe_product_id as string | null) ?? null,
    stripe_checkout_session_id: (row.stripe_checkout_session_id as string | null) ?? null,
    checkout_completed_at: asIsoString(row.checkout_completed_at),
    last_paid_at: asIsoString(row.last_paid_at),
    next_billing_at: asIsoString(row.next_billing_at),
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    canceled_at: asIsoString(row.canceled_at),
    public_management_token_issued_at: asIsoString(row.public_management_token_issued_at),
    created_by: (row.created_by as string | null) ?? null,
    modified_by: (row.modified_by as string | null) ?? null,
    created_at: asIsoString(row.created_at) || new Date(0).toISOString(),
    updated_at: asIsoString(row.updated_at) || new Date(0).toISOString(),
    account_name: (row.account_name as string | null) ?? null,
    contact_name: (row.contact_name as string | null) ?? null,
  };
};

export const buildPlanStatus = (
  status: string | undefined,
  cancelAtPeriodEnd: boolean | undefined
): RecurringDonationPlanStatus => {
  const normalized = status || 'checkout_pending';
  if (normalized === 'active' && cancelAtPeriodEnd) {
    return 'active';
  }
  return normalized as RecurringDonationPlanStatus;
};

export const getPlanByWhere = async (
  pool: Pool,
  whereClause: string,
  params: unknown[]
): Promise<RecurringDonationPlan | null> => {
  const result = await pool.query<PlanRow>(
    `
      SELECT ${PLAN_SELECT}
      FROM recurring_donation_plans rdp
      LEFT JOIN accounts a ON COALESCE(rdp.account_id, rdp.organization_id) = a.id
      LEFT JOIN contacts c ON rdp.contact_id = c.id
      WHERE ${whereClause}
      LIMIT 1
    `,
    params
  );

  return mapPlanRow(result.rows[0]);
};

export const getContactStripeCustomerId = async (
  pool: Pool,
  contactId: string | null | undefined
): Promise<string | null> => {
  if (!contactId) return null;

  const result = await pool.query<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id
     FROM contacts
     WHERE id = $1
     LIMIT 1`,
    [contactId]
  );

  return result.rows[0]?.stripe_customer_id || null;
};

export const persistContactStripeCustomerId = async (
  pool: Pool,
  contactId: string | null | undefined,
  customerId: string
): Promise<void> => {
  if (!contactId) return;

  await pool.query(
    `UPDATE contacts
     SET stripe_customer_id = COALESCE(stripe_customer_id, $1),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [customerId, contactId]
  );
};

export const buildCheckoutUrls = (
  planId: string,
  returnUrl: string
): { successUrl: string; cancelUrl: string } => {
  const encodedReturn = encodeURIComponent(returnUrl);
  return {
    successUrl: `${FRONTEND_URL}/recurring-donations/checkout-result?plan_id=${encodeURIComponent(planId)}&session_id={CHECKOUT_SESSION_ID}&return_to=${encodedReturn}`,
    cancelUrl: `${FRONTEND_URL}/recurring-donations/checkout-result?status=cancelled&plan_id=${encodeURIComponent(planId)}&return_to=${encodedReturn}`,
  };
};

export const getReturnUrlForPlan = async (
  siteManagement: SiteManagementService,
  plan: RecurringDonationPlan,
  fallbackReturnUrl?: string | null
): Promise<string> => {
  if (fallbackReturnUrl && fallbackReturnUrl.trim().length > 0) {
    return fallbackReturnUrl;
  }

  if (plan.site_id) {
    const site = await siteManagement.getPublicSiteById(plan.site_id);
    if (site) {
      return siteManagement.getSiteUrl(site);
    }
  }

  return FRONTEND_URL;
};

export const createManagementToken = (): { raw: string; hash: string } => {
  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
};

export const hashManagementToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const buildManagementUrl = (baseUrl: string, token: string): string => {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}/api/v2/recurring-donations/manage/${encodeURIComponent(token)}/portal`;
};

export const rotateManagementLink = async (
  pool: Pool,
  planId: string,
  baseUrl: string
): Promise<RecurringDonationManagementLinkResponse> => {
  const token = createManagementToken();
  const issuedAt = new Date().toISOString();

  await pool.query(
    `UPDATE recurring_donation_plans
     SET public_management_token_hash = $2,
         public_management_token_issued_at = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [planId, token.hash, issuedAt]
  );

  return {
    url: buildManagementUrl(baseUrl, token.raw),
    issued_at: issuedAt,
  };
};

export const syncPlanFromSubscription = async (
  pool: Pool,
  plan: RecurringDonationPlan,
  subscriptionId: string,
  customerId?: string | null,
  providerOverride?: PaymentProvider
): Promise<RecurringDonationPlan> => {
  const provider = providerOverride || plan.payment_provider || 'stripe';
  const subscription =
    provider === 'stripe'
      ? await stripeService.getSubscription(subscriptionId)
      : await paymentProviderService.getSubscription(subscriptionId, provider);
  const status = buildPlanStatus(subscription.status, subscription.cancelAtPeriodEnd);

  const result = await pool.query<{ id: string }>(
    `
      UPDATE recurring_donation_plans
      SET payment_provider = COALESCE($2, payment_provider),
          provider_subscription_id = COALESCE($3, provider_subscription_id),
          provider_customer_id = COALESCE($4, provider_customer_id),
          stripe_subscription_id = CASE WHEN $2 = 'stripe' THEN COALESCE($3, stripe_subscription_id) ELSE stripe_subscription_id END,
          stripe_customer_id = CASE WHEN $2 = 'stripe' THEN COALESCE($4, stripe_customer_id) ELSE stripe_customer_id END,
          status = $5,
          checkout_completed_at = COALESCE(checkout_completed_at, CURRENT_TIMESTAMP),
          next_billing_at = $6,
          cancel_at_period_end = $7,
          canceled_at = CASE WHEN $5 = 'canceled' THEN COALESCE(canceled_at, CURRENT_TIMESTAMP) ELSE canceled_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `,
    [
      plan.recurring_plan_id,
      provider,
      subscriptionId,
      customerId || null,
      status,
      subscription.currentPeriodEnd.toISOString(),
      subscription.cancelAtPeriodEnd,
    ]
  );

  return (await getPlanByWhere(pool, 'rdp.id = $1', [result.rows[0]?.id || plan.recurring_plan_id])) as RecurringDonationPlan;
};
