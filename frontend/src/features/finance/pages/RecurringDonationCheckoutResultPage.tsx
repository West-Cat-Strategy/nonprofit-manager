import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import type { RecurringDonationCheckoutSuccessResponse } from '../../../types/recurringDonation';
import type { PaymentProvider } from '../../../types/payment';
import { formatCurrency } from '../../../utils/format';
import {
  ErrorState,
  LoadingState,
  PrimaryButton,
  PublicPageShell,
  SecondaryButton,
  SectionCard,
} from '../../../components/ui';

type ResultState =
  | { kind: 'loading' }
  | { kind: 'cancelled'; returnUrl: string | null }
  | { kind: 'error'; message: string }
  | { kind: 'success'; data: RecurringDonationCheckoutSuccessResponse };

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  square: 'Square',
};

const RecurringDonationCheckoutResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<ResultState>({ kind: 'loading' });

  useEffect(() => {
    const status = searchParams.get('status');
    const planId = searchParams.get('plan_id');
    const sessionId = searchParams.get('session_id');
    const returnTo = searchParams.get('return_to');

    if (status === 'cancelled') {
      setResult({ kind: 'cancelled', returnUrl: returnTo });
      return;
    }

    if (!planId || !sessionId) {
      setResult({ kind: 'error', message: 'Monthly donation checkout details are incomplete.' });
      return;
    }

    let active = true;

    api
      .get<RecurringDonationCheckoutSuccessResponse>(
        `/recurring-donations/checkout-result/${sessionId}`,
        {
          params: {
            plan_id: planId,
            ...(returnTo ? { return_to: returnTo } : {}),
          },
        }
      )
      .then((response) => {
        if (!active) return;
        setResult({ kind: 'success', data: response.data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to confirm monthly donation checkout.',
        });
      });

    return () => {
      active = false;
    };
  }, [searchParams]);

  return (
    <PublicPageShell
      badge="Monthly Giving"
      title="Donation Checkout"
      description="Confirm your subscription status and use the donor self-service link when checkout succeeds."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {result.kind === 'loading' ? (
          <LoadingState label="Confirming your monthly donation..." />
        ) : null}

        {result.kind === 'error' ? <ErrorState message={result.message} /> : null}

        {result.kind === 'cancelled' ? (
          <SectionCard
            title="Monthly donation checkout cancelled"
            subtitle="No subscription was started. You can return to the website and try again any time."
          >
            <div className="flex flex-wrap gap-2">
              {result.returnUrl ? (
                <PrimaryButton
                  onClick={() => {
                    if (result.returnUrl) {
                      window.location.assign(result.returnUrl);
                    }
                  }}
                >
                  Return to Website
                </PrimaryButton>
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        {result.kind === 'success' ? (
          <SectionCard
            title="Monthly donation confirmed"
            subtitle="Your subscription is active and future charges will run on the saved billing schedule."
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-app-border-muted bg-app-surface-muted p-4">
                <p className="text-sm text-app-text-muted">Monthly amount</p>
                <p className="text-2xl font-semibold text-app-text">
                  {formatCurrency(result.data.plan.amount, result.data.plan.currency)}
                </p>
              </div>
              <p className="text-sm text-app-text-muted">
                Use the donor self-service link below to update payment details or manage future billing with{' '}
                {PROVIDER_LABELS[result.data.plan.payment_provider || 'stripe']}.
              </p>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton onClick={() => window.location.assign(result.data.management_url)}>
                  Manage Monthly Donation
                </PrimaryButton>
                <SecondaryButton onClick={() => window.location.assign(result.data.return_url)}>
                  Return to Website
                </SecondaryButton>
              </div>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </PublicPageShell>
  );
};

export default RecurringDonationCheckoutResultPage;
