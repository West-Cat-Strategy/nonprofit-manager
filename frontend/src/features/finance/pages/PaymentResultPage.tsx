/**
 * MODULE-OWNERSHIP: finance page
 *
 * Canonical payment-result implementation for feature-owned finance routes.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../../../store/hooks';
import api from '../../../services/api';
import { createDonation, getPaymentIntent, setPaymentSuccess } from '../state';
import type { PaymentProvider } from '../../../types/payment';
import type { CreateDonationDTO } from '../../../types/donation';

type ResultStatus = 'loading' | 'success' | 'processing' | 'failed';

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  square: 'Square',
};

const parseDonorName = (name: string | undefined): { first_name: string; last_name: string } => {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { first_name: 'Anonymous', last_name: 'Donor' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: 'Donor' };
  }
  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts[parts.length - 1],
  };
};

const PaymentResult: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<ResultStatus>('loading');
  const [message, setMessage] = useState('');

  const persistDonationRecord = async (
    provider: PaymentProvider,
    paymentIntentId: string,
    providerIntent: {
      providerCheckoutSessionId?: string | null;
      providerSubscriptionId?: string | null;
    }
  ): Promise<void> => {
    let checkoutContext:
      | {
          provider?: PaymentProvider;
          paymentIntentId?: string;
          checkoutSessionId?: string;
          donorEmail?: string;
          donorName?: string;
          donorPhone?: string;
          amount?: number;
          currency?: string;
          campaignName?: string;
          designation?: string;
          isRecurring?: boolean;
          recurringFrequency?: string;
        }
      | null = null;

    try {
      const checkoutContextRaw = sessionStorage.getItem('payment_checkout_context');
      checkoutContext = checkoutContextRaw ? JSON.parse(checkoutContextRaw) : null;
    } catch {
      checkoutContext = null;
    }

    if (!checkoutContext?.donorEmail || !checkoutContext.amount) {
      return;
    }

    const donorSearch = await api.get('/contacts', {
      params: { search: checkoutContext.donorEmail, limit: 1, is_active: true },
    });
    const contacts = (donorSearch.data?.data || donorSearch.data?.contacts || []) as Array<{
      email?: string;
      contact_id?: string;
    }>;
    const existingContact = contacts.find(
      (contact) => (contact.email || '').toLowerCase() === checkoutContext!.donorEmail!.toLowerCase()
    );

    let contactId = existingContact?.contact_id || null;
    if (!contactId) {
      const { first_name, last_name } = parseDonorName(checkoutContext.donorName);
      const createResponse = await api.post('/contacts', {
        first_name,
        last_name,
        email: checkoutContext.donorEmail,
        phone: checkoutContext.donorPhone || undefined,
      });
      contactId = createResponse.data?.contact_id || null;
    }

    if (!contactId) {
      throw new Error('Unable to create or locate donor contact');
    }

    const donationData: CreateDonationDTO = {
      contact_id: contactId,
      amount: checkoutContext.amount / 100,
      currency: (checkoutContext.currency || 'usd').toUpperCase(),
      donation_date: new Date().toISOString(),
      payment_method: provider === 'paypal' ? 'paypal' : 'credit_card',
      payment_status: 'completed',
      transaction_id: paymentIntentId,
      payment_provider: provider,
      provider_transaction_id: paymentIntentId,
      provider_checkout_session_id: providerIntent.providerCheckoutSessionId || checkoutContext.checkoutSessionId || paymentIntentId,
      provider_subscription_id: providerIntent.providerSubscriptionId || undefined,
      campaign_name: checkoutContext.campaignName || undefined,
      designation: checkoutContext.designation || undefined,
      is_recurring: Boolean(checkoutContext.isRecurring),
      recurring_frequency: checkoutContext.isRecurring
        ? checkoutContext.recurringFrequency === 'yearly'
          ? 'annually'
          : (checkoutContext.recurringFrequency as 'monthly' | 'weekly' | 'annually') || 'monthly'
        : 'one_time',
      notes: undefined,
    };

    await dispatch(createDonation(donationData)).unwrap();
  };

  useEffect(() => {
    let checkoutContext:
      | { provider?: PaymentProvider; paymentIntentId?: string; checkoutSessionId?: string }
      | null = null;
    try {
      const checkoutContextRaw = sessionStorage.getItem('payment_checkout_context');
      checkoutContext = checkoutContextRaw
        ? (JSON.parse(checkoutContextRaw) as {
            provider?: PaymentProvider;
            paymentIntentId?: string;
            checkoutSessionId?: string;
          })
        : null;
    } catch {
      checkoutContext = null;
    }
    const provider = (searchParams.get('provider') || checkoutContext?.provider || 'stripe') as PaymentProvider;
    const paymentIntentId =
      searchParams.get('payment_intent') ||
      searchParams.get('session_id') ||
      searchParams.get('checkout_session_id') ||
      checkoutContext?.paymentIntentId ||
      checkoutContext?.checkoutSessionId;
    const redirectStatus = searchParams.get('redirect_status') || searchParams.get('status');

    if (!paymentIntentId) {
      setStatus('failed');
      setMessage('Invalid payment result. No payment information found.');
      return;
    }

    // Check the redirect status from Stripe
    if (redirectStatus === 'succeeded' || redirectStatus === 'success' || redirectStatus === 'completed') {
      setStatus('success');
      setMessage(`Your ${PROVIDER_LABELS[provider]} payment was successful!`);
      dispatch(setPaymentSuccess(true));
    } else if (redirectStatus === 'processing') {
      setStatus('processing');
      setMessage(
        `Your ${PROVIDER_LABELS[provider]} payment is being processed. You will receive a confirmation email shortly.`
      );
    } else if (redirectStatus === 'failed' || redirectStatus === 'cancelled' || redirectStatus === 'canceled') {
      setStatus('failed');
      setMessage(`Your ${PROVIDER_LABELS[provider]} payment was cancelled or not successful. Please try again.`);
    } else {
      const verifyPayment = async (): Promise<void> => {
        try {
          const intent = await (provider === 'stripe'
            ? dispatch(getPaymentIntent(paymentIntentId)).unwrap()
            : api
                .get(`/payments/intents/${paymentIntentId}`, { params: { provider } })
                .then((response) => response.data?.data || response.data));

          if (intent.status === 'succeeded') {
            if (provider !== 'stripe') {
              await persistDonationRecord(provider, paymentIntentId, {
                providerCheckoutSessionId:
                  intent.providerCheckoutSessionId || intent.id || paymentIntentId,
                providerSubscriptionId: intent.providerSubscriptionId || null,
              });
            }
            sessionStorage.removeItem('payment_checkout_context');
            setStatus('success');
            setMessage(`Your ${PROVIDER_LABELS[provider]} payment was successful!`);
            dispatch(setPaymentSuccess(true));
          } else if (intent.status === 'processing') {
            setStatus('processing');
            setMessage(`Your ${PROVIDER_LABELS[provider]} payment is being processed.`);
          } else {
            setStatus('failed');
            setMessage('Your payment could not be completed. Please try again.');
          }
        } catch {
          setStatus('failed');
          setMessage('Unable to verify payment status. Please contact support.');
        }
      };

      void verifyPayment();
    }
  }, [searchParams, dispatch]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-app-accent border-t-transparent" />
        );
      case 'success':
        return (
          <div className="w-16 h-16 bg-app-accent-soft rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-app-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        );
      case 'processing':
        return (
          <div className="w-16 h-16 bg-app-accent-soft rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-app-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-16 h-16 bg-app-accent-soft rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-app-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Payment...';
      case 'success':
        return 'Thank You!';
      case 'processing':
        return 'Payment Processing';
      case 'failed':
        return 'Payment Failed';
    }
  };

  return (
    <div className="min-h-screen bg-app-surface-muted flex items-center justify-center p-4">
      <div className="bg-app-surface rounded-lg shadow-lg p-8 max-w-md text-center">
        <div className="flex justify-center mb-6">{getStatusIcon()}</div>

        <h1 className="text-2xl font-bold text-app-text mb-2">{getTitle()}</h1>

        <p className="text-app-text-muted mb-6">{message}</p>

        {status !== 'loading' && (
          <div className="flex gap-4 justify-center">
            {status === 'failed' && (
              <button
                onClick={() => navigate('/donations/payment')}
                className="px-6 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => navigate('/donations')}
              className="px-6 py-2 border border-app-input-border text-app-text-muted rounded-lg hover:bg-app-surface-muted"
            >
              View Donations
            </button>
            {status === 'success' && (
              <button
                onClick={() => navigate('/donations/payment')}
                className="px-6 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
              >
                Donate Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
