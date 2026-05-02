import { Pool } from 'pg';
import dbPool from '@config/database';
import { logger } from '@config/logger';
import { DonationService } from '@services/donationService';
import { SiteManagementService } from '@services/publishing/siteManagementService';
import stripeService from '@services/stripeService';
import paymentProviderService from '@services/paymentProviderService';
import { DonationDesignationService } from '@modules/donations/services/donationDesignationService';
import type {
  RecurringDonationPlan,
  RecurringDonationPlanFilters,
  RecurringDonationPlanListPage,
  UpdateRecurringDonationPlanDTO,
  RecurringDonationManagementLinkResponse,
  RecurringDonationCheckoutSuccessResponse,
} from '@app-types/recurringDonation';
import type { PaymentProvider } from '@app-types/payment';
import {
  FRONTEND_URL,
  PLAN_SELECT,
  buildPlanStatus,
  buildCheckoutUrls,
  getContactStripeCustomerId,
  getPlanByWhere,
  getReturnUrlForPlan,
  hashManagementToken,
  mapPlanRow,
  persistContactStripeCustomerId,
  rotateManagementLink,
  syncPlanFromSubscription,
} from './recurringDonationHelpers';
import { RecurringDonationSyncService } from './recurringDonationSyncService';

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
  provider?: PaymentProvider;
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

export class RecurringDonationService {
  private readonly donationService: DonationService;
  private readonly designationService: DonationDesignationService;
  private readonly siteManagement: SiteManagementService;
  private readonly syncService: RecurringDonationSyncService;

  constructor(private readonly pool: Pool) {
    this.donationService = new DonationService(pool);
    this.designationService = new DonationDesignationService(pool);
    this.siteManagement = new SiteManagementService(pool);
    this.syncService = new RecurringDonationSyncService(pool, this.donationService);
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

    const rowsResult = await this.pool.query<Record<string, unknown>>(
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
    return getPlanByWhere(this.pool, 'rdp.id = $1 AND rdp.organization_id = $2', [planId, organizationId]);
  }

  async createPublicCheckoutPlan(
    input: CreatePublicRecurringDonationPlanInput
  ): Promise<{ plan: RecurringDonationPlan; redirect_url: string; return_url: string }> {
    const provider = input.provider || paymentProviderService.getPaymentConfig().defaultProvider;
    const customerIdFromContact =
      provider === 'stripe' ? await getContactStripeCustomerId(this.pool, input.contactId) : null;
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
        await persistContactStripeCustomerId(this.pool, input.contactId, customer.id);
      }
    }

    const resolvedDesignation = await this.designationService.resolveDesignationInput({
      organizationId: input.organizationId || null,
      userId: input.userId,
      designationName: input.designation,
    });

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
          designation_id,
          designation,
          notes,
          status,
          payment_provider,
          provider_customer_id,
          source_page_path,
          source_visitor_id,
          source_session_id,
          source_referrer,
          source_user_agent,
          created_by,
          modified_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'monthly', $10, $11, $12, $13, 'checkout_pending',
          $14, $15, $16, $17, $18, $19, $20, $21, $22
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
        resolvedDesignation.designation_id,
        resolvedDesignation.designation,
        input.notes || null,
        provider,
        customerId,
        input.pagePath || null,
        input.visitorId || null,
        input.sessionId || null,
        input.referrer || null,
        input.userAgent || null,
        input.userId,
        input.userId,
      ]
    );

    const plan = (await getPlanByWhere(this.pool, 'rdp.id = $1', [insertResult.rows[0]?.id])) as RecurringDonationPlan;
    const returnUrl = await getReturnUrlForPlan(this.siteManagement, plan);

    try {
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

        const urls = buildCheckoutUrls(plan.recurring_plan_id, returnUrl);
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
          plan: (await getPlanByWhere(this.pool, 'rdp.id = $1', [updatedResult.rows[0]?.id || plan.recurring_plan_id])) as RecurringDonationPlan,
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
          SET payment_provider = $2,
              provider_customer_id = COALESCE($3, provider_customer_id),
              provider_subscription_id = COALESCE($4, provider_subscription_id),
              provider_checkout_session_id = COALESCE($5, provider_checkout_session_id),
              provider_checkout_url = COALESCE($6, provider_checkout_url),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id
        `,
        [
          plan.recurring_plan_id,
          provider,
          customerId,
          session.subscriptionId || session.id,
          session.id,
          session.url,
        ]
      );

      return {
        plan: (await getPlanByWhere(this.pool, 'rdp.id = $1', [updatedResult.rows[0]?.id || plan.recurring_plan_id])) as RecurringDonationPlan,
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
    const plan = await getPlanByWhere(this.pool, 'rdp.id = $1', [planId]);
    if (!plan) {
      throw new Error('Recurring donation plan not found');
    }

    const provider = plan.payment_provider || 'stripe';
    const session =
      provider === 'stripe'
        ? await stripeService.getCheckoutSession(sessionId)
        : await paymentProviderService.getCheckoutSession(sessionId, provider);
    const linkedSessionId = provider === 'stripe' ? plan.stripe_checkout_session_id : plan.provider_checkout_session_id;
    if (linkedSessionId && linkedSessionId !== session.id) {
      throw new Error('Checkout session does not match the requested recurring donation plan');
    }

    let nextPlan = plan;

    if (session.subscriptionId) {
      nextPlan = await syncPlanFromSubscription(
        this.pool,
        plan,
        session.subscriptionId,
        session.customerId
      );
    } else if (session.status !== 'complete') {
      throw new Error('Recurring donation checkout is not complete yet');
    }

    const management = await rotateManagementLink(this.pool, nextPlan.recurring_plan_id, publicBaseUrl);
    const resolvedPlan = await getPlanByWhere(this.pool, 'rdp.id = $1', [nextPlan.recurring_plan_id]);

    return {
      plan: resolvedPlan || nextPlan,
      management_url: management.url,
      return_url: await getReturnUrlForPlan(this.siteManagement, nextPlan, fallbackReturnUrl),
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

    return rotateManagementLink(this.pool, plan.recurring_plan_id, publicBaseUrl);
  }

  async getPortalSessionUrl(token: string): Promise<string> {
    const tokenHash = hashManagementToken(token);
    const plan = await getPlanByWhere(this.pool, 'rdp.public_management_token_hash = $1', [tokenHash]);

    if (!plan) {
      throw new Error('Recurring donation management link is invalid');
    }

    const provider = plan.payment_provider || 'stripe';
    const customerId = plan.provider_customer_id || plan.stripe_customer_id;

    if (!customerId) {
      throw new Error('Recurring donation plan is not connected to a customer');
    }

    const returnUrl = await getReturnUrlForPlan(this.siteManagement, plan);
    const session =
      provider === 'stripe'
        ? await stripeService.createBillingPortalSession(customerId, returnUrl)
        : await paymentProviderService.createBillingPortalSession(customerId, returnUrl, provider);

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

    if (current.payment_provider && current.payment_provider !== 'stripe' && typeof data.amount === 'number' && data.amount !== current.amount) {
      throw new Error('Amount changes are only supported for Stripe recurring plans in this release');
    }

    let nextAmount = current.amount;
    let stripePriceId = current.stripe_price_id;
    let stripeProductId = current.stripe_product_id;
    let nextBillingAt = current.next_billing_at;
    const nextCampaignName =
      data.campaign_name === undefined ? current.campaign_name : data.campaign_name;
    let nextDesignationId =
      data.designation_id === undefined ? current.designation_id : data.designation_id;
    let nextDesignation =
      data.designation === undefined ? current.designation : data.designation;
    const nextNotes = data.notes === undefined ? current.notes : data.notes;

    if (
      Object.prototype.hasOwnProperty.call(data, 'designation_id') ||
      Object.prototype.hasOwnProperty.call(data, 'designation')
    ) {
      const resolvedDesignation = await this.designationService.resolveDesignationInput({
        organizationId,
        userId,
        designationId: data.designation_id,
        designationName: data.designation,
        allowInactiveDesignationId: current.designation_id,
      });
      nextDesignationId = resolvedDesignation.designation_id;
      nextDesignation = resolvedDesignation.designation;
    }

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
            designation_id = $5,
            designation = $6,
            notes = $7,
            stripe_price_id = COALESCE($8, stripe_price_id),
            stripe_product_id = COALESCE($9, stripe_product_id),
            next_billing_at = COALESCE($10, next_billing_at),
            modified_by = $11,
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
        nextDesignationId,
        nextDesignation,
        nextNotes,
        stripePriceId,
        stripeProductId,
        nextBillingAt,
        userId,
      ]
    );

    return getPlanByWhere(this.pool, 'rdp.id = $1', [result.rows[0]?.id || planId]);
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

    return getPlanByWhere(this.pool, 'rdp.id = $1', [result.rows[0]?.id || planId]);
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

    return getPlanByWhere(this.pool, 'rdp.id = $1', [result.rows[0]?.id || planId]);
  }

  async handleCheckoutSessionCompleted(
    session: {
      id: string;
      customer?: string | null;
      subscription?: string | null;
      metadata?: Record<string, string | undefined>;
      provider?: PaymentProvider;
    }
  ): Promise<void> {
    await this.syncService.handleCheckoutSessionCompleted(session);
  }

  async handleSubscriptionUpdated(subscription: {
    id: string;
    customer?: string | null;
    metadata?: Record<string, string | undefined>;
    provider?: PaymentProvider;
  }): Promise<void> {
    await this.syncService.handleSubscriptionUpdated(subscription);
  }

  async handleSubscriptionDeleted(subscription: {
    id: string;
    customer?: string | null;
    metadata?: Record<string, string | undefined>;
    provider?: PaymentProvider;
  }): Promise<void> {
    await this.syncService.handleSubscriptionDeleted(subscription);
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
    provider?: PaymentProvider;
  }): Promise<void> {
    await this.syncService.handleInvoicePaid(invoice);
  }

  async handleInvoicePaymentFailed(invoice: {
    subscription?: string | null;
    customer?: string | null;
    provider?: PaymentProvider;
  }): Promise<void> {
    await this.syncService.handleInvoicePaymentFailed(invoice);
  }
}

export const recurringDonationService = new RecurringDonationService(dbPool);
export default recurringDonationService;
