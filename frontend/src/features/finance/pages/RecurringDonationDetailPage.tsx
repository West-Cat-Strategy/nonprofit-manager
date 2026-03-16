import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  cancelRecurringDonationPlan,
  clearSelectedRecurringDonation,
  fetchRecurringDonationPlanById,
  generateRecurringDonationManagementLink,
  reactivateRecurringDonationPlan,
} from '../state';
import type { RecurringDonationPlan, RecurringDonationPlanStatus } from '../../../types/recurringDonation';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/format';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
} from '../../../components/ui';

const getStatusClasses = (status: RecurringDonationPlanStatus, cancelAtPeriodEnd: boolean): string => {
  if (cancelAtPeriodEnd && status === 'active') {
    return 'bg-amber-100 text-amber-900';
  }

  switch (status) {
    case 'active':
    case 'trialing':
      return 'bg-emerald-100 text-emerald-900';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'bg-rose-100 text-rose-900';
    case 'canceled':
      return 'bg-slate-300 text-slate-900';
    default:
      return 'bg-slate-200 text-slate-900';
  }
};

const getStatusLabel = (plan: RecurringDonationPlan): string => {
  if (plan.cancel_at_period_end && plan.status === 'active') {
    return 'Active · ends after cycle';
  }
  return plan.status.replace(/_/g, ' ');
};

const RecurringDonationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedPlan: plan, loading, error } = useAppSelector(
    (state) => state.recurringDonations
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchRecurringDonationPlanById(id));
    }

    return () => {
      dispatch(clearSelectedRecurringDonation());
    };
  }, [dispatch, id]);

  const handleManagementLink = async (mode: 'copy' | 'open') => {
    if (!id) return;

    try {
      const result = await dispatch(generateRecurringDonationManagementLink(id)).unwrap();
      if (mode === 'copy') {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(result.url);
        }
        setActionMessage('Donor self-service link copied.');
        return;
      }

      window.open(result.url, '_blank', 'noopener,noreferrer');
      setActionMessage('Opened donor self-service link in a new tab.');
    } catch (linkError) {
      setActionMessage(
        linkError instanceof Error
          ? linkError.message
          : 'Unable to generate donor self-service link.'
      );
    }
  };

  const handleCancel = async () => {
    if (!id) return;

    try {
      await dispatch(cancelRecurringDonationPlan(id)).unwrap();
      setActionMessage('Plan will cancel at the end of the current billing cycle.');
    } catch (cancelError) {
      setActionMessage(
        cancelError instanceof Error ? cancelError.message : 'Unable to cancel plan.'
      );
    }
  };

  const handleReactivate = async () => {
    if (!id) return;

    try {
      await dispatch(reactivateRecurringDonationPlan(id)).unwrap();
      setActionMessage('Plan reactivated for the next billing cycle.');
    } catch (reactivateError) {
      setActionMessage(
        reactivateError instanceof Error ? reactivateError.message : 'Unable to reactivate plan.'
      );
    }
  };

  if (loading && !plan) {
    return <div className="p-4 sm:p-6"><LoadingState label="Loading recurring donation plan..." /></div>;
  }

  if (error && !plan) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          message={error}
          onRetry={() => id && dispatch(fetchRecurringDonationPlanById(id))}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState message="Recurring donation plan not found." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={plan.donor_name || plan.contact_name || 'Recurring Donation Plan'}
        description="Review billing status, donor linkage, and staff management options."
        actions={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => navigate('/recurring-donations')}>Back</SecondaryButton>
            <PrimaryButton onClick={() => navigate(`/recurring-donations/${plan.recurring_plan_id}/edit`)}>
              Edit Plan
            </PrimaryButton>
          </div>
        }
      />

      {actionMessage ? (
        <SectionCard className="border-app-border bg-app-surface-muted">
          <p className="text-sm text-app-text">{actionMessage}</p>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Plan Status"
        actions={
          <div className="flex flex-wrap gap-2">
            {plan.cancel_at_period_end ? (
              <PrimaryButton onClick={handleReactivate}>Reactivate</PrimaryButton>
            ) : (
              <SecondaryButton onClick={handleCancel}>Cancel at Period End</SecondaryButton>
            )}
            <SecondaryButton onClick={() => handleManagementLink('copy')}>
              Copy Donor Link
            </SecondaryButton>
            <SecondaryButton onClick={() => handleManagementLink('open')}>
              Open Donor Link
            </SecondaryButton>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${getStatusClasses(
              plan.status,
              plan.cancel_at_period_end
            )}`}
          >
            {getStatusLabel(plan)}
          </span>
          <p className="text-sm text-app-text-muted">
            Monthly amount {formatCurrency(plan.amount, plan.currency)}
          </p>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Donor">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-app-text">Name</dt>
              <dd className="text-app-text-muted">{plan.donor_name || plan.contact_name || 'Unknown donor'}</dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Email</dt>
              <dd className="text-app-text-muted">{plan.donor_email}</dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Contact</dt>
              <dd className="text-app-text-muted">{plan.contact_name || plan.contact_id || 'Not linked'}</dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Account</dt>
              <dd className="text-app-text-muted">{plan.account_name || plan.account_id || 'Not linked'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Billing">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-app-text">Next billing</dt>
              <dd className="text-app-text-muted">
                {plan.next_billing_at ? formatDate(plan.next_billing_at) : 'Not scheduled yet'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Last paid</dt>
              <dd className="text-app-text-muted">
                {plan.last_paid_at ? formatDateTime(plan.last_paid_at) : 'No paid invoice yet'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Checkout completed</dt>
              <dd className="text-app-text-muted">
                {plan.checkout_completed_at
                  ? formatDateTime(plan.checkout_completed_at)
                  : 'Checkout not completed yet'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Cancel at period end</dt>
              <dd className="text-app-text-muted">{plan.cancel_at_period_end ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Designation">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-app-text">Campaign</dt>
              <dd className="text-app-text-muted">{plan.campaign_name || 'None'}</dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Designation</dt>
              <dd className="text-app-text-muted">{plan.designation || 'None'}</dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Notes</dt>
              <dd className="whitespace-pre-wrap text-app-text-muted">{plan.notes || 'None'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Stripe Linkage">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-app-text">Customer ID</dt>
              <dd className="break-all font-mono text-app-text-muted">
                {plan.stripe_customer_id || 'Not linked'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Subscription ID</dt>
              <dd className="break-all font-mono text-app-text-muted">
                {plan.stripe_subscription_id || 'Not linked'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-app-text">Checkout session</dt>
              <dd className="break-all font-mono text-app-text-muted">
                {plan.stripe_checkout_session_id || 'Not linked'}
              </dd>
            </div>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
};

export default RecurringDonationDetailPage;
