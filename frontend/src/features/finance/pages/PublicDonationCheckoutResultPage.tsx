import React from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PaymentProvider } from '../../../types/payment';
import { resolveSafeNavigationTarget } from '../../../utils/safeUrl';
import {
  ErrorState,
  LoadingState,
  PrimaryButton,
  PublicPageShell,
  SecondaryButton,
  SectionCard,
} from '../../../components/ui';

type DonationResultKind = 'success' | 'processing' | 'cancelled' | 'failed' | 'unknown';

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  square: 'Square',
};

const resolveResultKind = (status: string | null): DonationResultKind => {
  switch (status) {
    case 'succeeded':
    case 'success':
    case 'completed':
      return 'success';
    case 'processing':
      return 'processing';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'failed':
      return 'failed';
    default:
      return 'unknown';
  }
};

const resolveProviderLabel = (provider: string | null): string => {
  return PROVIDER_LABELS[provider as PaymentProvider] || 'payment provider';
};

const PublicDonationCheckoutResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const providerLabel = resolveProviderLabel(searchParams.get('provider'));
  const status =
    searchParams.get('redirect_status') ||
    searchParams.get('status') ||
    (searchParams.get('payment_intent') || searchParams.get('session_id') ? 'processing' : null);
  const resultKind = resolveResultKind(status);
  const returnTo = resolveSafeNavigationTarget(searchParams.get('return_to'));

  return (
    <PublicPageShell
      badge="Donation"
      title="Donation Checkout"
      description="Review the latest status from the payment provider."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {resultKind === 'unknown' ? (
          <ErrorState message="Donation checkout details are incomplete." />
        ) : null}

        {resultKind === 'processing' ? (
          <SectionCard
            title="Donation processing"
            subtitle={`Your ${providerLabel} payment is being processed. You will receive confirmation from the organization when it is complete.`}
          >
            <LoadingState label="Waiting for payment confirmation..." />
          </SectionCard>
        ) : null}

        {resultKind === 'success' ? (
          <SectionCard
            title="Donation received"
            subtitle={`Thank you. ${providerLabel} reported this donation checkout as successful.`}
          >
            {returnTo ? (
              <PrimaryButton onClick={() => window.location.assign(returnTo)}>
                Return to Website
              </PrimaryButton>
            ) : null}
          </SectionCard>
        ) : null}

        {resultKind === 'cancelled' ? (
          <SectionCard
            title="Donation checkout cancelled"
            subtitle="No donation payment was completed. You can return to the website and try again any time."
          >
            {returnTo ? (
              <PrimaryButton onClick={() => window.location.assign(returnTo)}>
                Return to Website
              </PrimaryButton>
            ) : null}
          </SectionCard>
        ) : null}

        {resultKind === 'failed' ? (
          <SectionCard
            title="Donation checkout failed"
            subtitle="The payment provider could not complete this donation."
          >
            {returnTo ? (
              <SecondaryButton onClick={() => window.location.assign(returnTo)}>
                Return to Website
              </SecondaryButton>
            ) : null}
          </SectionCard>
        ) : null}
      </div>
    </PublicPageShell>
  );
};

export default PublicDonationCheckoutResultPage;
