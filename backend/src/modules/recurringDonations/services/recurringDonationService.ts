import { createHash, randomBytes } from 'crypto';
import { Pool } from 'pg';
import dbPool from '@config/database';
import { logger } from '@config/logger';
import { DonationService } from '@services/donationService';
import { publishingService } from '@services/publishing';
import { SiteManagementService } from '@services/publishing/siteManagementService';
import stripeService from '@services/stripeService';
<<<<<<< HEAD
import paymentProviderService from '@services/paymentProviderService';
=======
>>>>>>> origin/main
import type {
  RecurringDonationPlan,
  RecurringDonationPlanFilters,
  RecurringDonationPlanListPage,
  UpdateRecurringDonationPlanDTO,
  RecurringDonationManagementLinkResponse,
  RecurringDonationCheckoutSuccessResponse,
  RecurringDonationPlanStatus,
} from '@app-types/recurringDonation';
<<<<<<< HEAD
import type { PaymentProvider } from '@app-types/payment';
=======
>>>>>>> origin/main

type PlanRow = Record<string, unknown>;

interface CreatePublicRecurringDonationPlanInput {
  organizationId?: string | null;
  accountId?: string | null;
  contactId?: string | null;
  siteId?: string | null;
  formKey?: string | null;
  donorEmail: string;
  donorName?: string | null;
  donorPhone?: string | null;
  amount: number;
  currency: string;
<<<<<<< HEAD
  provider?: PaymentProvider;
=======
>>>>>>> origin/main
  campaignName?: string | null;
  designation?: string | null;
  notes?: string | null;
  userId: string;
  pagePath?: string | null;
  visitorId?: string | null;
  sessionId?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

const PLAN_SELECT = `
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
<<<<<<< HEAD
  rdp.payment_provider,
  rdp.provider_customer_id,
  rdp.provider_subscription_id,
  rdp.provider_checkout_session_id,
  rdp.provider_checkout_url,
=======
>>>>>>> origin/main
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

const mapPlanRow = (row: PlanRow | undefined | null): RecurringDonationPlan | null => {
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
<<<<<<< HEAD
    payment_provider: (row.payment_provider as PaymentProvider | null) ?? null,
    provider_customer_id: (row.provider_customer_id as string | null) ?? null,
    provider_subscription_id: (row.provider_subscription_id as string | null) ?? null,
    provider_checkout_session_id: (row.provider_checkout_session_id as string | null) ?? null,
    provider_checkout_url: (row.provider_checkout_url as string | null) ?? null,
=======
>>>>>>> origin/main
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

const buildPlanStatus = (
  status: string | undefined,
  cancelAtPeriodEnd: boolean | undefined
): RecurringDonationPlanStatus => {
  const normalized = status || 'checkout_pending';
  if (normalized === 'active' && cancelAtPeriodEnd) {
    return 'active';
  }
  return normalized as RecurringDonationPlanStatus;
};

export class RecurringDonationService {
  private readonly donationService: DonationService;
  private readonly siteManagement: SiteManagementService;

  constructor(private readonly pool: Pool) {
    this.donationService = new DonationService(pool);
    this.siteManagement = new SiteManagementService(pool);
  }

  private async getPlanByWhere(
    whereClause: string,
    params: unknown[]
  ): Promise<RecurringDonationPlan | null> {
    const result = await this.pool.query<PlanRow>(
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
  }

  private async getContactStripeCustomerId(contactId: string | null | undefined): Promise<string | null> {
    if (!contactId) return null;

    const result = await this.pool.query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id
       FROM contacts
       WHERE id = $1
       LIMIT 1`,
      [contactId]
    );

    return result.rows[0]?.stripe_customer_id || null;
  }

  private async persistContactStripeCustomerId(contactId: string | null | undefined, customerId: string): Promise<void> {
    if (!contactId) return;

    await this.pool.query(
      `UPDATE contacts
       SET stripe_customer_id = COALESCE(stripe_customer_id, $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [customerId, contactId]
    );
  }

  private buildCheckoutUrls(planId: string, returnUrl: string): { successUrl: string; cancelUrl: string } {
    const encodedReturn = encodeURIComponent(returnUrl);
    return {
      successUrl: `${FRONTEND_URL}/recurring-donations/checkout-result?plan_id=${encodeURIComponent(planId)}&session_id={CHECKOUT_SESSION_ID}&return_to=${encodedReturn}`,
      cancelUrl: `${FRONTEND_URL}/recurring-donations/checkout-result?status=cancelled&plan_id=${encodeURIComponent(planId)}&return_to=${encodedReturn}`,
    };
  }

  private async getReturnUrlForPlan(
    plan: RecurringDonationPlan,
    fallbackReturnUrl?: string | null
  ): Promise<string> {
    if (fallbackReturnUrl && fallbackReturnUrl.trim().length > 0) {
      return fallbackReturnUrl;
    }

    if (plan.site_id) {
      const site = await this.siteManagement.getPublicSiteById(plan.site_id);
      if (site) {
        return this.siteManagement.getSiteUrl(site);
      }
    }

    return FRONTEND_URL;
  }

  private createManagementToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  private buildManagementUrl(baseUrl: string, token: string): string {
    const normalizedBase = baseUrl.replace(/\/$/, '');
    return `${normalizedBase}/api/v2/recurring-donations/manage/${encodeURIComponent(token)}/portal`;
  }

  private async rotateManagementLink(
    planId: string,
    baseUrl: string
  ): Promise<RecurringDonationManagementLinkResponse> {
    const token = this.createManagementToken();
    const issuedAt = new Date().toISOString();

    await this.pool.query(
      `UPDATE recurring_donation_plans
       SET public_management_token_hash = $2,
           public_management_token_issued_at = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [planId, token.hash, issuedAt]
    );

    return {
      url: this.buildManagementUrl(baseUrl, token.raw),
      issued_at: issuedAt,
    };
  }

  private async syncPlanFromSubscription(
    plan: RecurringDonationPlan,
    subscriptionId: string,
<<<<<<< HEAD
    customerId?: string | null,
    providerOverride?: PaymentProvider
  ): Promise<RecurringDonationPlan> {
    const provider = providerOverride || plan.payment_provider || 'stripe';
    const subscription =
      provider === 'stripe'
        ? await stripeService.getSubscription(subscriptionId)
        : await paymentProviderService.getSubscription(subscriptionId, provider);
=======
    customerId?: string | null
  ): Promise<RecurringDonationPlan> {
    const subscription = await stripeService.getSubscription(subscriptionId);
>>>>>>> origin/main
    const status = buildPlanStatus(subscription.status, subscription.cancelAtPeriodEnd);

    const result = await this.pool.query<{ id: string }>(
      `
        UPDATE recurring_donation_plans
<<<<<<< HEAD
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
=======
        SET stripe_subscription_id = $2,
            stripe_customer_id = COALESCE($3, stripe_customer_id),
            status = $4,
            checkout_completed_at = COALESCE(checkout_completed_at, CURRENT_TIMESTAMP),
            next_billing_at = $5,
            cancel_at_period_end = $6,
            canceled_at = CASE WHEN $4 = 'canceled' THEN COALESCE(canceled_at, CURRENT_TIMESTAMP) ELSE canceled_at END,
>>>>>>> origin/main
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id
      `,
      [
        plan.recurring_plan_id,
<<<<<<< HEAD
        provider,
=======
>>>>>>> origin/main
        subscriptionId,
        customerId || null,
        status,
        subscription.currentPeriodEnd.toISOString(),
        subscription.cancelAtPeriodEnd,
      ]
    );

    return (await this.getPlanByWhere('rdp.id = $1', [result.rows[0]?.id || plan.recurring_plan_id])) as RecurringDonationPlan;
  }

  async listPlans(
    organizationId: string,
    filters: RecurringDonationPlanFilters = {},
    page = 1,
    limit = 20
  ): Promise<RecurringDonationPlanListPage> {
    const conditions = ['rdp.organization_id = $1'];
    const params: unknown[] = [organizationId];
    let paramIndex = 2;

    if (filters.search) {
      conditions.push(`(
        rdp.donor_email ILIKE $${paramIndex}
        OR rdp.donor_name ILIKE $${paramIndex}
        OR COALESCE(rdp.campaign_name, '') ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex += 1;
    }

    if (filters.status) {
      conditions.push(`rdp.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex += 1;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM recurring_donation_plans rdp
       WHERE ${whereClause}`,
      params
    );

    const rowsResult = await this.pool.query<PlanRow>(
      `
        SELECT ${PLAN_SELECT}
        FROM recurring_donation_plans rdp
        LEFT JOIN accounts a ON COALESCE(rdp.account_id, rdp.organization_id) = a.id
        LEFT JOIN contacts c ON rdp.contact_id = c.id
        WHERE ${whereClause}
        ORDER BY rdp.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, limit, offset]
    );

    const total = Number.parseInt(countResult.rows[0]?.count || '0', 10);

    return {
      data: rowsResult.rows.map((row) => mapPlanRow(row) as RecurringDonationPlan),
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getPlanById(
    organizationId: string,
    planId: string
  ): Promise<RecurringDonationPlan | null> {
    return this.getPlanByWhere('rdp.id = $1 AND rdp.organization_id = $2', [planId, organizationId]);
  }

  async createPublicCheckoutPlan(
    input: CreatePublicRecurringDonationPlanInput
  ): Promise<{ plan: RecurringDonationPlan; redirect_url: string; return_url: string }> {
<<<<<<< HEAD
    const provider = input.provider || paymentProviderService.getPaymentConfig().defaultProvider;
    const customerIdFromContact =
      provider === 'stripe' ? await this.getContactStripeCustomerId(input.contactId) : null;
    let customerId = customerIdFromContact;

    if (!customerId) {
      const customer =
        provider === 'stripe'
          ? await stripeService.createCustomer({
              email: input.donorEmail,
              name: input.donorName || undefined,
              phone: input.donorPhone || undefined,
              contactId: input.contactId || undefined,
            })
          : await paymentProviderService.createCustomer({
              email: input.donorEmail,
              name: input.donorName || undefined,
              phone: input.donorPhone || undefined,
              contactId: input.contactId || undefined,
              provider,
            });
      customerId = customer.id;
      if (provider === 'stripe') {
        await this.persistContactStripeCustomerId(input.contactId, customer.id);
      }
=======
    const customerIdFromContact = await this.getContactStripeCustomerId(input.contactId);
    let customerId = customerIdFromContact;

    if (!customerId) {
      const customer = await stripeService.createCustomer({
        email: input.donorEmail,
        name: input.donorName || undefined,
        phone: input.donorPhone || undefined,
        contactId: input.contactId || undefined,
      });
      customerId = customer.id;
      await this.persistContactStripeCustomerId(input.contactId, customer.id);
>>>>>>> origin/main
    }

    const insertResult = await this.pool.query<{ id: string }>(
      `
        INSERT INTO recurring_donation_plans (
          organization_id,
          account_id,
          contact_id,
          site_id,
          form_key,
          donor_email,
          donor_name,
          amount,
          currency,
          interval,
          campaign_name,
          designation,
          notes,
          status,
<<<<<<< HEAD
          payment_provider,
          provider_customer_id,
=======
          stripe_customer_id,
>>>>>>> origin/main
          source_page_path,
          source_visitor_id,
          source_session_id,
          source_referrer,
          source_user_agent,
          created_by,
          modified_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'monthly', $10, $11, $12, 'checkout_pending',
<<<<<<< HEAD
          $13, $14, $15, $16, $17, $18, $19, $20, $21
=======
          $13, $14, $15, $16, $17, $18, $19, $19
>>>>>>> origin/main
        )
        RETURNING id
      `,
      [
        input.organizationId || null,
        input.accountId || null,
        input.contactId || null,
        input.siteId || null,
        input.formKey || null,
        input.donorEmail,
        input.donorName || null,
        input.amount,
        input.currency.toUpperCase(),
        input.campaignName || null,
        input.designation || null,
        input.notes || null,
<<<<<<< HEAD
        provider,
=======
>>>>>>> origin/main
        customerId,
        input.pagePath || null,
        input.visitorId || null,
        input.sessionId || null,
        input.referrer || null,
        input.userAgent || null,
        input.userId,
<<<<<<< HEAD
        input.userId,
=======
>>>>>>> origin/main
      ]
    );

    const plan = (await this.getPlanByWhere('rdp.id = $1', [insertResult.rows[0]?.id])) as RecurringDonationPlan;
    const returnUrl = await this.getReturnUrlForPlan(plan);

    try {
<<<<<<< HEAD
      if (provider === 'stripe') {
        const price = await stripeService.createMonthlyPrice({
          amount: Math.round(input.amount * 100),
          currency: input.currency,
          productName: `Monthly Donation${input.donorName ? ` - ${input.donorName}` : ''}`,
          metadata: {
            recurringPlanId: plan.recurring_plan_id,
            contactId: input.contactId || '',
            siteId: input.siteId || '',
          },
        });

        const urls = this.buildCheckoutUrls(plan.recurring_plan_id, returnUrl);
        const session = await stripeService.createCheckoutSession({
          customerId,
          priceId: price.id,
          successUrl: urls.successUrl,
          cancelUrl: urls.cancelUrl,
          metadata: {
            recurringPlanId: plan.recurring_plan_id,
            siteId: input.siteId || '',
            formKey: input.formKey || '',
            pagePath: input.pagePath || '',
            visitorId: input.visitorId || '',
            sessionId: input.sessionId || '',
            referrer: input.referrer || '',
            userAgent: input.userAgent || '',
          },
        });

        const updatedResult = await this.pool.query<{ id: string }>(
          `
            UPDATE recurring_donation_plans
            SET stripe_price_id = $2,
                stripe_product_id = $3,
                stripe_checkout_session_id = $4,
                provider_subscription_id = COALESCE(provider_subscription_id, $4),
                provider_checkout_session_id = COALESCE(provider_checkout_session_id, $4),
                provider_checkout_url = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id
          `,
          [plan.recurring_plan_id, price.id, price.productId, session.id, session.url]
        );

        return {
          plan: (await this.getPlanByWhere('rdp.id = $1', [updatedResult.rows[0]?.id || plan.recurring_plan_id])) as RecurringDonationPlan,
          redirect_url: session.url,
          return_url: returnUrl,
        };
      }

      const configuredPlanId =
        provider === 'paypal'
          ? process.env.PAYPAL_PLAN_ID || null
          : process.env.SQUARE_SUBSCRIPTION_PLAN_VARIATION_ID || null;
      if (!configuredPlanId) {
        throw new Error(`Missing configured recurring plan for ${provider}`);
      }

      const session = await paymentProviderService.createCheckoutSession({
        provider,
        customerId,
        priceId: configuredPlanId,
        successUrl: `${FRONTEND_URL}/recurring-donations/checkout-result?provider=${provider}&plan_id=${encodeURIComponent(plan.recurring_plan_id)}&return_to=${encodeURIComponent(returnUrl)}`,
        cancelUrl: `${FRONTEND_URL}/recurring-donations/checkout-result?provider=${provider}&status=cancelled&plan_id=${encodeURIComponent(plan.recurring_plan_id)}&return_to=${encodeURIComponent(returnUrl)}`,
=======
      const price = await stripeService.createMonthlyPrice({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        productName: `Monthly Donation${input.donorName ? ` - ${input.donorName}` : ''}`,
        metadata: {
          recurringPlanId: plan.recurring_plan_id,
          contactId: input.contactId || '',
          siteId: input.siteId || '',
        },
      });

      const urls = this.buildCheckoutUrls(plan.recurring_plan_id, returnUrl);
      const session = await stripeService.createCheckoutSession({
        customerId,
        priceId: price.id,
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl,
>>>>>>> origin/main
        metadata: {
          recurringPlanId: plan.recurring_plan_id,
          siteId: input.siteId || '',
          formKey: input.formKey || '',
          pagePath: input.pagePath || '',
          visitorId: input.visitorId || '',
          sessionId: input.sessionId || '',
          referrer: input.referrer || '',
          userAgent: input.userAgent || '',
        },
      });

      const updatedResult = await this.pool.query<{ id: string }>(
        `
          UPDATE recurring_donation_plans
<<<<<<< HEAD
          SET payment_provider = $2,
              provider_customer_id = COALESCE($3, provider_customer_id),
              provider_subscription_id = COALESCE($4, provider_subscription_id),
              provider_checkout_session_id = COALESCE($5, provider_checkout_session_id),
              provider_checkout_url = COALESCE($6, provider_checkout_url),
=======
          SET stripe_price_id = $2,
              stripe_product_id = $3,
              stripe_checkout_session_id = $4,
>>>>>>> origin/main
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id
        `,
<<<<<<< HEAD
        [
          plan.recurring_plan_id,
          provider,
          customerId,
          session.subscriptionId || session.id,
          session.id,
          session.url,
        ]
=======
        [plan.recurring_plan_id, price.id, price.productId, session.id]
>>>>>>> origin/main
      );

      return {
        plan: (await this.getPlanByWhere('rdp.id = $1', [updatedResult.rows[0]?.id || plan.recurring_plan_id])) as RecurringDonationPlan,
        redirect_url: session.url,
        return_url: returnUrl,
      };
    } catch (error) {
      logger.error('Failed to create public recurring donation checkout plan', {
        error,
        planId: plan.recurring_plan_id,
      });
      await this.pool.query('DELETE FROM recurring_donation_plans WHERE id = $1', [
        plan.recurring_plan_id,
      ]);
      throw error;
    }
  }

  async resolveCheckoutSuccess(
    planId: string,
    sessionId: string,
    publicBaseUrl: string,
    fallbackReturnUrl?: string | null
  ): Promise<RecurringDonationCheckoutSuccessResponse> {
    const plan = await this.getPlanByWhere('rdp.id = $1', [planId]);
    if (!plan) {
      throw new Error('Recurring donation plan not found');
    }

<<<<<<< HEAD
    const provider = plan.payment_provider || 'stripe';
    const session =
      provider === 'stripe'
        ? await stripeService.getCheckoutSession(sessionId)
        : await paymentProviderService.getCheckoutSession(sessionId, provider);
    const linkedSessionId = provider === 'stripe' ? plan.stripe_checkout_session_id : plan.provider_checkout_session_id;
    if (linkedSessionId && linkedSessionId !== session.id) {
=======
    const session = await stripeService.getCheckoutSession(sessionId);
    if (plan.stripe_checkout_session_id && plan.stripe_checkout_session_id !== session.id) {
>>>>>>> origin/main
      throw new Error('Checkout session does not match the requested recurring donation plan');
    }

    let nextPlan = plan;

    if (session.subscriptionId) {
      nextPlan = await this.syncPlanFromSubscription(plan, session.subscriptionId, session.customerId);
    } else if (session.status !== 'complete') {
      throw new Error('Recurring donation checkout is not complete yet');
    }

    const management = await this.rotateManagementLink(nextPlan.recurring_plan_id, publicBaseUrl);
    const resolvedPlan = await this.getPlanByWhere('rdp.id = $1', [nextPlan.recurring_plan_id]);

    return {
      plan: resolvedPlan || nextPlan,
      management_url: management.url,
      return_url: await this.getReturnUrlForPlan(nextPlan, fallbackReturnUrl),
    };
  }

  async generateManagementLink(
    organizationId: string,
    planId: string,
    publicBaseUrl: string
  ): Promise<RecurringDonationManagementLinkResponse> {
    const plan = await this.getPlanById(organizationId, planId);
    if (!plan) {
      throw new Error('Recurring donation plan not found');
    }

    return this.rotateManagementLink(plan.recurring_plan_id, publicBaseUrl);
  }

  async getPortalSessionUrl(token: string): Promise<string> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const plan = await this.getPlanByWhere('rdp.public_management_token_hash = $1', [tokenHash]);

    if (!plan) {
      throw new Error('Recurring donation management link is invalid');
    }

<<<<<<< HEAD
    const provider = plan.payment_provider || 'stripe';
    const customerId = plan.provider_customer_id || plan.stripe_customer_id;

    if (!customerId) {
      throw new Error('Recurring donation plan is not connected to a customer');
    }

    const returnUrl = await this.getReturnUrlForPlan(plan);
    const session =
      provider === 'stripe'
        ? await stripeService.createBillingPortalSession(customerId, returnUrl)
        : await paymentProviderService.createBillingPortalSession(customerId, returnUrl, provider);
=======
    if (!plan.stripe_customer_id) {
      throw new Error('Recurring donation plan is not connected to a Stripe customer');
    }

    const returnUrl = await this.getReturnUrlForPlan(plan);
    const session = await stripeService.createBillingPortalSession(
      plan.stripe_customer_id,
      returnUrl
    );
>>>>>>> origin/main

    return session.url;
  }

  async updatePlan(
    organizationId: string,
    planId: string,
    userId: string,
    data: UpdateRecurringDonationPlanDTO
  ): Promise<RecurringDonationPlan | null> {
    const current = await this.getPlanById(organizationId, planId);
    if (!current) {
      return null;
    }

<<<<<<< HEAD
    if (current.payment_provider && current.payment_provider !== 'stripe' && typeof data.amount === 'number' && data.amount !== current.amount) {
      throw new Error('Amount changes are only supported for Stripe recurring plans in this release');
    }

=======
>>>>>>> origin/main
    let nextAmount = current.amount;
    let stripePriceId = current.stripe_price_id;
    let stripeProductId = current.stripe_product_id;
    let nextBillingAt = current.next_billing_at;
    const nextCampaignName =
      data.campaign_name === undefined ? current.campaign_name : data.campaign_name;
    const nextDesignation =
      data.designation === undefined ? current.designation : data.designation;
    const nextNotes = data.notes === undefined ? current.notes : data.notes;

    if (typeof data.amount === 'number' && data.amount > 0 && data.amount !== current.amount) {
      if (!current.stripe_subscription_id) {
        throw new Error('Recurring donation plan is not yet connected to a Stripe subscription');
      }

      const price = await stripeService.createMonthlyPrice({
        amount: Math.round(data.amount * 100),
        currency: current.currency,
        productId: current.stripe_product_id || undefined,
        productName: `Monthly Donation${current.donor_name ? ` - ${current.donor_name}` : ''}`,
        metadata: {
          recurringPlanId: current.recurring_plan_id,
        },
      });

      const subscription = await stripeService.updateSubscriptionPrice(
        current.stripe_subscription_id,
        price.id
      );

      nextAmount = data.amount;
      stripePriceId = price.id;
      stripeProductId = price.productId;
      nextBillingAt = subscription.currentPeriodEnd.toISOString();
    }

    const result = await this.pool.query<{ id: string }>(
      `
        UPDATE recurring_donation_plans
        SET amount = $3,
            campaign_name = $4,
            designation = $5,
            notes = $6,
            stripe_price_id = COALESCE($7, stripe_price_id),
            stripe_product_id = COALESCE($8, stripe_product_id),
            next_billing_at = COALESCE($9, next_billing_at),
            modified_by = $10,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND organization_id = $2
        RETURNING id
      `,
      [
        planId,
        organizationId,
        nextAmount,
        nextCampaignName,
        nextDesignation,
        nextNotes,
        stripePriceId,
        stripeProductId,
        nextBillingAt,
        userId,
      ]
    );

    return this.getPlanByWhere('rdp.id = $1', [result.rows[0]?.id || planId]);
  }

  async cancelPlan(
    organizationId: string,
    planId: string,
    userId: string
  ): Promise<RecurringDonationPlan | null> {
    const current = await this.getPlanById(organizationId, planId);
    if (!current) {
      return null;
    }

    if (!current.stripe_subscription_id) {
      throw new Error('Recurring donation plan is not yet connected to a Stripe subscription');
    }

    const subscription = await stripeService.setSubscriptionCancelAtPeriodEnd(
      current.stripe_subscription_id,
      true
    );

    const result = await this.pool.query<{ id: string }>(
      `
        UPDATE recurring_donation_plans
        SET status = $3,
            cancel_at_period_end = true,
            canceled_at = CURRENT_TIMESTAMP,
            next_billing_at = $4,
            modified_by = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND organization_id = $2
        RETURNING id
      `,
      [
        planId,
        organizationId,
        buildPlanStatus(subscription.status, true),
        subscription.currentPeriodEnd.toISOString(),
        userId,
      ]
    );

    return this.getPlanByWhere('rdp.id = $1', [result.rows[0]?.id || planId]);
  }

  async reactivatePlan(
    organizationId: string,
    planId: string,
    userId: string
  ): Promise<RecurringDonationPlan | null> {
    const current = await this.getPlanById(organizationId, planId);
    if (!current) {
      return null;
    }

    if (!current.stripe_subscription_id) {
      throw new Error('Recurring donation plan is not yet connected to a Stripe subscription');
    }

    const subscription = await stripeService.setSubscriptionCancelAtPeriodEnd(
      current.stripe_subscription_id,
      false
    );

    const result = await this.pool.query<{ id: string }>(
      `
        UPDATE recurring_donation_plans
        SET status = $3,
            cancel_at_period_end = false,
            canceled_at = NULL,
            next_billing_at = $4,
            modified_by = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND organization_id = $2
        RETURNING id
      `,
      [
        planId,
        organizationId,
        buildPlanStatus(subscription.status, false),
        subscription.currentPeriodEnd.toISOString(),
        userId,
      ]
    );

    return this.getPlanByWhere('rdp.id = $1', [result.rows[0]?.id || planId]);
  }

  async handleCheckoutSessionCompleted(
    session: {
      id: string;
      customer?: string | null;
      subscription?: string | null;
      metadata?: Record<string, string | undefined>;
<<<<<<< HEAD
      provider?: PaymentProvider;
=======
>>>>>>> origin/main
    }
  ): Promise<void> {
    const planId = session.metadata?.recurringPlanId;
    const plan =
      (planId ? await this.getPlanByWhere('rdp.id = $1', [planId]) : null) ||
<<<<<<< HEAD
      (await this.getPlanByWhere(
        'rdp.stripe_checkout_session_id = $1 OR rdp.provider_checkout_session_id = $1',
        [session.id]
      ));
=======
      (await this.getPlanByWhere('rdp.stripe_checkout_session_id = $1', [session.id]));
>>>>>>> origin/main

    if (!plan) {
      logger.warn('Recurring donation checkout completed for unknown plan', {
        checkoutSessionId: session.id,
      });
      return;
    }

    let nextPlan = plan;

    if (session.subscription) {
<<<<<<< HEAD
      nextPlan = await this.syncPlanFromSubscription(
        plan,
        session.subscription,
        session.customer || null,
        session.provider || plan.payment_provider || 'stripe'
      );
=======
      nextPlan = await this.syncPlanFromSubscription(plan, session.subscription, session.customer || null);
>>>>>>> origin/main
    }

    if (session.metadata?.siteId) {
      try {
        await publishingService.recordAnalyticsEvent(session.metadata.siteId, 'donation', {
          pagePath: session.metadata.pagePath || '/',
          visitorId: session.metadata.visitorId || undefined,
          sessionId: session.metadata.sessionId || undefined,
          userAgent: session.metadata.userAgent || undefined,
          referrer: session.metadata.referrer || undefined,
          eventData: {
            formKey: session.metadata.formKey || null,
            formType: 'donation-form',
            sourceEntityType: 'recurring_donation_plan',
            sourceEntityId: nextPlan.recurring_plan_id,
          },
        });
      } catch (error) {
        logger.warn('Failed to record recurring donation conversion event', {
          error,
          planId: nextPlan.recurring_plan_id,
          siteId: session.metadata.siteId,
        });
      }
    }
  }

  async handleSubscriptionUpdated(subscription: {
    id: string;
    customer?: string | null;
    metadata?: Record<string, string | undefined>;
<<<<<<< HEAD
    provider?: PaymentProvider;
  }): Promise<void> {
    const provider = subscription.provider || 'stripe';
=======
  }): Promise<void> {
>>>>>>> origin/main
    const plan =
      (subscription.metadata?.recurringPlanId
        ? await this.getPlanByWhere('rdp.id = $1', [subscription.metadata.recurringPlanId])
        : null) ||
<<<<<<< HEAD
      (await this.getPlanByWhere(
        'rdp.stripe_subscription_id = $1 OR rdp.provider_subscription_id = $1',
        [subscription.id]
      ));
    if (!plan) return;

    if (provider !== 'stripe') {
      await this.pool.query(
        `
          UPDATE recurring_donation_plans
          SET payment_provider = COALESCE($2, payment_provider),
              provider_subscription_id = COALESCE(provider_subscription_id, $3),
              provider_customer_id = COALESCE(provider_customer_id, $4),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [plan.recurring_plan_id, provider, subscription.id, subscription.customer || null]
      );
    }

    await this.syncPlanFromSubscription(
      plan,
      subscription.id,
      subscription.customer || null,
      provider
    );
=======
      (await this.getPlanByWhere('rdp.stripe_subscription_id = $1', [subscription.id]));
    if (!plan) return;

    await this.syncPlanFromSubscription(plan, subscription.id, subscription.customer || null);
>>>>>>> origin/main
  }

  async handleSubscriptionDeleted(subscription: {
    id: string;
    customer?: string | null;
    metadata?: Record<string, string | undefined>;
<<<<<<< HEAD
    provider?: PaymentProvider;
  }): Promise<void> {
    const provider = subscription.provider || 'stripe';
=======
  }): Promise<void> {
>>>>>>> origin/main
    const plan =
      (subscription.metadata?.recurringPlanId
        ? await this.getPlanByWhere('rdp.id = $1', [subscription.metadata.recurringPlanId])
        : null) ||
<<<<<<< HEAD
      (await this.getPlanByWhere(
        'rdp.stripe_subscription_id = $1 OR rdp.provider_subscription_id = $1',
        [subscription.id]
      ));
=======
      (await this.getPlanByWhere('rdp.stripe_subscription_id = $1', [subscription.id]));
>>>>>>> origin/main
    if (!plan) return;

    await this.pool.query(
      `
        UPDATE recurring_donation_plans
        SET status = 'canceled',
<<<<<<< HEAD
            payment_provider = COALESCE($2, payment_provider),
            provider_subscription_id = COALESCE(provider_subscription_id, $3),
            provider_customer_id = COALESCE(provider_customer_id, $4),
            stripe_customer_id = CASE WHEN $2 = 'stripe' THEN COALESCE($4, stripe_customer_id) ELSE stripe_customer_id END,
=======
            stripe_customer_id = COALESCE($2, stripe_customer_id),
>>>>>>> origin/main
            cancel_at_period_end = false,
            canceled_at = COALESCE(canceled_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
<<<<<<< HEAD
      [plan.recurring_plan_id, provider, subscription.id, subscription.customer || null]
=======
      [plan.recurring_plan_id, subscription.customer || null]
>>>>>>> origin/main
    );
  }

  async handleInvoicePaid(invoice: {
    id: string;
    subscription?: string | null;
    customer?: string | null;
    amount_paid: number;
    currency: string;
    payment_intent?: string | null;
    created: number;
    status_transitions?: { paid_at?: number | null };
<<<<<<< HEAD
    provider?: PaymentProvider;
  }): Promise<void> {
    if (!invoice.subscription) return;

    const plan = await this.getPlanByWhere(
      'rdp.stripe_subscription_id = $1 OR rdp.provider_subscription_id = $1',
      [invoice.subscription]
    );
=======
  }): Promise<void> {
    if (!invoice.subscription) return;

    const plan = await this.getPlanByWhere('rdp.stripe_subscription_id = $1', [invoice.subscription]);
>>>>>>> origin/main
    if (!plan) {
      logger.warn('Recurring donation invoice paid for unknown subscription', {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
      });
      return;
    }

    const existingDonation = await this.pool.query<{ id: string }>(
      `SELECT id FROM donations WHERE stripe_invoice_id = $1 LIMIT 1`,
      [invoice.id]
    );

    const paidAtUnix = invoice.status_transitions?.paid_at || invoice.created;
    const paidAtIso = new Date(paidAtUnix * 1000).toISOString();

    if (existingDonation.rows.length === 0) {
      const actorId = plan.modified_by || plan.created_by;
      if (!actorId) {
        throw new Error('Recurring donation plan is missing an actor for donation creation');
      }

      await this.donationService.createDonation(
        {
          account_id: plan.account_id || plan.organization_id || undefined,
          contact_id: plan.contact_id || undefined,
          recurring_plan_id: plan.recurring_plan_id,
          amount: Number((invoice.amount_paid / 100).toFixed(2)),
          currency: invoice.currency.toUpperCase(),
          donation_date: paidAtIso,
          payment_method: 'credit_card',
          payment_status: 'completed',
          transaction_id: invoice.payment_intent || undefined,
<<<<<<< HEAD
          payment_provider: plan.payment_provider || invoice.provider || 'stripe',
          provider_transaction_id: invoice.payment_intent || invoice.id,
          provider_subscription_id: invoice.subscription,
          provider_customer_id: invoice.customer || undefined,
          provider_checkout_session_id: plan.provider_checkout_session_id || plan.stripe_checkout_session_id || undefined,
=======
>>>>>>> origin/main
          stripe_subscription_id: invoice.subscription,
          stripe_invoice_id: invoice.id,
          campaign_name: plan.campaign_name || undefined,
          designation: plan.designation || undefined,
          is_recurring: true,
          recurring_frequency: 'monthly',
          notes: plan.notes || undefined,
        },
        actorId
      );
    }

    const syncedPlan = await this.syncPlanFromSubscription(
      plan,
      invoice.subscription,
<<<<<<< HEAD
      invoice.customer || null,
      invoice.provider || plan.payment_provider || 'stripe'
=======
      invoice.customer || null
>>>>>>> origin/main
    );

    await this.pool.query(
      `
        UPDATE recurring_donation_plans
        SET last_paid_at = $2,
            status = 'active',
            next_billing_at = COALESCE($3, next_billing_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [plan.recurring_plan_id, paidAtIso, syncedPlan.next_billing_at]
    );
  }

  async handleInvoicePaymentFailed(invoice: {
    subscription?: string | null;
    customer?: string | null;
<<<<<<< HEAD
    provider?: PaymentProvider;
  }): Promise<void> {
    if (!invoice.subscription) return;

    const plan = await this.getPlanByWhere(
      'rdp.stripe_subscription_id = $1 OR rdp.provider_subscription_id = $1',
      [invoice.subscription]
    );
=======
  }): Promise<void> {
    if (!invoice.subscription) return;

    const plan = await this.getPlanByWhere('rdp.stripe_subscription_id = $1', [invoice.subscription]);
>>>>>>> origin/main
    if (!plan) return;

    let nextBillingAt = plan.next_billing_at;
    try {
<<<<<<< HEAD
      const synced = await this.syncPlanFromSubscription(
        plan,
        invoice.subscription,
        invoice.customer || null,
        invoice.provider || plan.payment_provider || 'stripe'
      );
=======
      const synced = await this.syncPlanFromSubscription(plan, invoice.subscription, invoice.customer || null);
>>>>>>> origin/main
      nextBillingAt = synced.next_billing_at;
    } catch (error) {
      logger.warn('Failed to sync recurring donation after payment failure', {
        error,
        planId: plan.recurring_plan_id,
      });
    }

    await this.pool.query(
      `
        UPDATE recurring_donation_plans
        SET status = 'past_due',
<<<<<<< HEAD
            payment_provider = COALESCE($2, payment_provider),
            provider_customer_id = COALESCE(provider_customer_id, $3),
            stripe_customer_id = CASE WHEN $2 = 'stripe' THEN COALESCE($3, stripe_customer_id) ELSE stripe_customer_id END,
            next_billing_at = COALESCE($4, next_billing_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [plan.recurring_plan_id, invoice.provider || plan.payment_provider || 'stripe', invoice.customer || null, nextBillingAt]
=======
            stripe_customer_id = COALESCE($2, stripe_customer_id),
            next_billing_at = COALESCE($3, next_billing_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [plan.recurring_plan_id, invoice.customer || null, nextBillingAt]
>>>>>>> origin/main
    );
  }
}

export const recurringDonationService = new RecurringDonationService(dbPool);
export default recurringDonationService;
