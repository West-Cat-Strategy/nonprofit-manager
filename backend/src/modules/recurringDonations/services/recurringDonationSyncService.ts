import { Pool } from 'pg';
import { logger } from '@config/logger';
import { publishingService } from '@services/publishing';
import { DonationService } from '@services/donationService';
import type { RecurringDonationPlan } from '@app-types/recurringDonation';
import type { PaymentProvider } from '@app-types/payment';
import {
  getPlanByWhere,
  syncPlanFromSubscription,
} from './recurringDonationHelpers';

interface CheckoutCompletedEvent {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  metadata?: Record<string, string | undefined>;
  provider?: PaymentProvider;
}

interface SubscriptionLifecycleEvent {
  id: string;
  customer?: string | null;
  metadata?: Record<string, string | undefined>;
  provider?: PaymentProvider;
}

interface InvoicePaidEvent {
  id: string;
  subscription?: string | null;
  customer?: string | null;
  amount_paid: number;
  currency: string;
  payment_intent?: string | null;
  created: number;
  status_transitions?: { paid_at?: number | null };
  provider?: PaymentProvider;
}

interface InvoicePaymentFailedEvent {
  subscription?: string | null;
  customer?: string | null;
  provider?: PaymentProvider;
}

export class RecurringDonationSyncService {
  constructor(
    private readonly pool: Pool,
    private readonly donationService: DonationService
  ) {}

  private async findPlanForCheckoutSession(
    session: CheckoutCompletedEvent
  ): Promise<RecurringDonationPlan | null> {
    const planId = session.metadata?.recurringPlanId;

    return (
      (planId ? await getPlanByWhere(this.pool, 'rdp.id = $1', [planId]) : null) ||
      (await getPlanByWhere(
        this.pool,
        'rdp.stripe_checkout_session_id = $1 OR rdp.provider_checkout_session_id = $1',
        [session.id]
      ))
    );
  }

  private async findPlanForSubscription(
    subscriptionId: string | null | undefined,
    metadata?: Record<string, string | undefined>
  ): Promise<RecurringDonationPlan | null> {
    if (!subscriptionId) {
      return null;
    }

    const planId = metadata?.recurringPlanId;

    return (
      (planId ? await getPlanByWhere(this.pool, 'rdp.id = $1', [planId]) : null) ||
      (await getPlanByWhere(
        this.pool,
        'rdp.stripe_subscription_id = $1 OR rdp.provider_subscription_id = $1',
        [subscriptionId]
      ))
    );
  }

  async handleCheckoutSessionCompleted(session: CheckoutCompletedEvent): Promise<void> {
    const plan = await this.findPlanForCheckoutSession(session);

    if (!plan) {
      logger.warn('Recurring donation checkout completed for unknown plan', {
        checkoutSessionId: session.id,
      });
      return;
    }

    let nextPlan = plan;

    if (session.subscription) {
      nextPlan = await syncPlanFromSubscription(
        this.pool,
        plan,
        session.subscription,
        session.customer || null,
        session.provider || plan.payment_provider || 'stripe'
      );
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

  async handleSubscriptionUpdated(subscription: SubscriptionLifecycleEvent): Promise<void> {
    const provider = subscription.provider || 'stripe';
    const plan = await this.findPlanForSubscription(subscription.id, subscription.metadata);
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

    await syncPlanFromSubscription(
      this.pool,
      plan,
      subscription.id,
      subscription.customer || null,
      provider
    );
  }

  async handleSubscriptionDeleted(subscription: SubscriptionLifecycleEvent): Promise<void> {
    const provider = subscription.provider || 'stripe';
    const plan = await this.findPlanForSubscription(subscription.id, subscription.metadata);
    if (!plan) return;

    await this.pool.query(
      `
        UPDATE recurring_donation_plans
        SET status = 'canceled',
            payment_provider = COALESCE($2, payment_provider),
            provider_subscription_id = COALESCE(provider_subscription_id, $3),
            provider_customer_id = COALESCE(provider_customer_id, $4),
            stripe_customer_id = CASE WHEN $2 = 'stripe' THEN COALESCE($4, stripe_customer_id) ELSE stripe_customer_id END,
            cancel_at_period_end = false,
            canceled_at = COALESCE(canceled_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [plan.recurring_plan_id, provider, subscription.id, subscription.customer || null]
    );
  }

  async handleInvoicePaid(invoice: InvoicePaidEvent): Promise<void> {
    if (!invoice.subscription) return;

    const plan = await this.findPlanForSubscription(invoice.subscription);
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
          payment_provider: plan.payment_provider || invoice.provider || 'stripe',
          provider_transaction_id: invoice.payment_intent || invoice.id,
          provider_subscription_id: invoice.subscription,
          provider_customer_id: invoice.customer || undefined,
          provider_checkout_session_id:
            plan.provider_checkout_session_id || plan.stripe_checkout_session_id || undefined,
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

    const syncedPlan = await syncPlanFromSubscription(
      this.pool,
      plan,
      invoice.subscription,
      invoice.customer || null,
      invoice.provider || plan.payment_provider || 'stripe'
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

  async handleInvoicePaymentFailed(invoice: InvoicePaymentFailedEvent): Promise<void> {
    if (!invoice.subscription) return;

    const plan = await this.findPlanForSubscription(invoice.subscription);
    if (!plan) return;

    let nextBillingAt = plan.next_billing_at;
    try {
      const synced = await syncPlanFromSubscription(
        this.pool,
        plan,
        invoice.subscription,
        invoice.customer || null,
        invoice.provider || plan.payment_provider || 'stripe'
      );
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
            payment_provider = COALESCE($2, payment_provider),
            provider_customer_id = COALESCE(provider_customer_id, $3),
            stripe_customer_id = CASE WHEN $2 = 'stripe' THEN COALESCE($3, stripe_customer_id) ELSE stripe_customer_id END,
            next_billing_at = COALESCE($4, next_billing_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        plan.recurring_plan_id,
        invoice.provider || plan.payment_provider || 'stripe',
        invoice.customer || null,
        nextBillingAt,
      ]
    );
  }
}
