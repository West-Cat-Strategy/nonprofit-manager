import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchRecurringDonationPlans,
} from '../state';
import type { RecurringDonationPlanStatus } from '../../../types/recurringDonation';
import { formatCurrency, formatDate } from '../../../utils/format';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  StatCard,
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
    case 'checkout_pending':
    case 'paused':
      return 'bg-slate-200 text-slate-900';
    case 'canceled':
      return 'bg-slate-300 text-slate-900';
    default:
      return 'bg-slate-200 text-slate-900';
  }
};

const getStatusLabel = (status: RecurringDonationPlanStatus, cancelAtPeriodEnd: boolean): string => {
  if (cancelAtPeriodEnd && status === 'active') {
    return 'Active · ends after cycle';
  }
  return status.replace(/_/g, ' ');
};

const sanitizeStatus = (value: string | null): RecurringDonationPlanStatus | '' => {
  const allowed: RecurringDonationPlanStatus[] = [
    'checkout_pending',
    'active',
    'past_due',
    'unpaid',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'paused',
  ];

  return value && allowed.includes(value as RecurringDonationPlanStatus)
    ? (value as RecurringDonationPlanStatus)
    : '';
};

const RecurringDonationListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plans, pagination, loading, error } = useAppSelector(
    (state) => state.finance.recurring
  );

  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState<RecurringDonationPlanStatus | ''>(() =>
    sanitizeStatus(searchParams.get('status'))
  );
  const [page, setPage] = useState(() => {
    const raw = Number.parseInt(searchParams.get('page') || '1', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });

  useEffect(() => {
    dispatch(
      fetchRecurringDonationPlans({
        filters: {
          search: search || undefined,
          status: status || undefined,
        },
        pagination: {
          page,
          limit: 20,
        },
      })
    );
  }, [dispatch, page, search, status]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [page, search, setSearchParams, status]);

  const activeCount = plans.filter(
    (plan) => plan.status === 'active' && !plan.cancel_at_period_end
  ).length;
  const monthlyCommitted = plans
    .filter((plan) => plan.status !== 'canceled')
    .reduce((sum, plan) => sum + plan.amount, 0);
  const atRiskCount = plans.filter((plan) =>
    ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(plan.status)
  ).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Recurring Donations"
        description="Manage monthly donation plans, donor self-service links, and upcoming billing cycles."
        actions={
          <SecondaryButton onClick={() => navigate('/donations')}>View Donation Ledger</SecondaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Active Plans" value={activeCount} />
        <StatCard label="Monthly Committed" value={formatCurrency(monthlyCommitted)} />
        <StatCard label="Needs Attention" value={atRiskCount} />
      </div>

      <SectionCard title="Filters" subtitle="Search donors or focus on a billing status.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search donor or campaign"
            className="rounded-md border border-app-border px-4 py-2"
            aria-label="Search recurring donation plans"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(sanitizeStatus(event.target.value));
              setPage(1);
            }}
            className="rounded-md border border-app-border px-4 py-2"
            aria-label="Filter recurring donation plans by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="checkout_pending">Checkout pending</option>
            <option value="past_due">Past due</option>
            <option value="unpaid">Unpaid</option>
            <option value="incomplete">Incomplete</option>
            <option value="incomplete_expired">Incomplete expired</option>
            <option value="trialing">Trialing</option>
            <option value="paused">Paused</option>
            <option value="canceled">Canceled</option>
          </select>
          <div className="flex items-center gap-2">
            <SecondaryButton
              onClick={() => {
                setSearch('');
                setStatus('');
                setPage(1);
              }}
            >
              Clear Filters
            </SecondaryButton>
          </div>
        </div>
      </SectionCard>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() =>
            dispatch(
              fetchRecurringDonationPlans({
                filters: {
                  search: search || undefined,
                  status: status || undefined,
                },
                pagination: {
                  page,
                  limit: 20,
                },
              })
            )
          }
        />
      ) : loading ? (
        <LoadingState label="Loading recurring donation plans..." />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No recurring donation plans match these filters."
          description="Monthly plans created from public website forms will appear here after donors start checkout."
          action={
            <PrimaryButton onClick={() => navigate('/websites')}>Open Website Console</PrimaryButton>
          }
        />
      ) : (
        <SectionCard
          title="Monthly Plans"
          subtitle={`${pagination.total} total plan${pagination.total === 1 ? '' : 's'} across the current filter.`}
        >
          <div className="space-y-4">
            {plans.map((plan) => (
              <article
                key={plan.recurring_plan_id}
                className="rounded-lg border border-app-border-muted bg-app-surface-muted p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-app-text">
                        {plan.donor_name || plan.contact_name || plan.donor_email}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                          plan.status,
                          plan.cancel_at_period_end
                        )}`}
                      >
                        {getStatusLabel(plan.status, plan.cancel_at_period_end)}
                      </span>
                    </div>
                    <p className="text-sm text-app-text-muted">{plan.donor_email}</p>
                    <div className="grid grid-cols-1 gap-2 text-sm text-app-text-muted sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-app-text">Amount:</span>{' '}
                        {formatCurrency(plan.amount, plan.currency)}
                      </p>
                      <p>
                        <span className="font-medium text-app-text">Next billing:</span>{' '}
                        {plan.next_billing_at ? formatDate(plan.next_billing_at) : 'Not scheduled yet'}
                      </p>
                      <p>
                        <span className="font-medium text-app-text">Last paid:</span>{' '}
                        {plan.last_paid_at ? formatDate(plan.last_paid_at) : 'No invoice paid yet'}
                      </p>
                      <p>
                        <span className="font-medium text-app-text">Campaign:</span>{' '}
                        {plan.campaign_name || 'None'}
                      </p>
                      <p>
                        <span className="font-medium text-app-text">Designation:</span>{' '}
                        {plan.designation_label || plan.designation || 'None'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton
                      onClick={() => navigate(`/recurring-donations/${plan.recurring_plan_id}`)}
                    >
                      View
                    </SecondaryButton>
                    <PrimaryButton
                      onClick={() => navigate(`/recurring-donations/${plan.recurring_plan_id}/edit`)}
                    >
                      Edit
                    </PrimaryButton>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-app-border-muted pt-4">
            <p className="text-sm text-app-text-muted">
              Page {pagination.page} of {Math.max(pagination.total_pages, 1)}
            </p>
            <div className="flex gap-2">
              <SecondaryButton
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </SecondaryButton>
              <SecondaryButton
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </SecondaryButton>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default RecurringDonationListPage;
