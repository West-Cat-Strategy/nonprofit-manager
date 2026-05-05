import Stripe from 'stripe';
import type * as StripeCore from 'stripe/cjs/stripe.core.js';
import { logger } from '@config/logger';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: StripeCore.Stripe | null = null;

function getStripeClient(): StripeCore.Stripe {
  if (!stripe) {
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(stripeSecretKey);
  }
  return stripe;
}

export function isStripeConfigured(): boolean {
  return !!stripeSecretKey;
}

export async function fetchStripeBalanceTransactions(
  startDate: Date,
  endDate: Date
): Promise<StripeCore.Stripe.BalanceTransaction[]> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const stripeClient = getStripeClient();
  const transactions: StripeCore.Stripe.BalanceTransaction[] = [];

  try {
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    let startingAfter: string | undefined;

    while (true) {
      const balanceTransactions = await stripeClient.balanceTransactions.list({
        created: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      transactions.push(...balanceTransactions.data);

      if (!balanceTransactions.has_more || balanceTransactions.data.length === 0) {
        break;
      }

      startingAfter = balanceTransactions.data[balanceTransactions.data.length - 1]?.id;
      if (!startingAfter) {
        break;
      }
    }

    logger.info(`Fetched ${transactions.length} Stripe balance transactions`, {
      startDate,
      endDate,
    });

    return transactions;
  } catch (error) {
    logger.error('Error fetching Stripe balance transactions:', error);
    throw error;
  }
}
