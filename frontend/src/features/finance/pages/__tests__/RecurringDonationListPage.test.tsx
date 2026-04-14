import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type * as FinanceStateModule from '../../state';
import RecurringDonationListPage from '../RecurringDonationListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const state = {
  finance: {
    recurring: {
      plans: [
        {
          recurring_plan_id: 'plan-1',
          organization_id: 'org-1',
          account_id: 'org-1',
          contact_id: 'contact-1',
          site_id: 'site-1',
          form_key: 'donation-form-1',
          donor_email: 'ada@example.com',
          donor_name: 'Ada Lovelace',
          amount: 25,
          currency: 'CAD',
          interval: 'monthly' as const,
          campaign_name: 'Monthly donors',
          designation: 'General fund',
          notes: null,
          status: 'active' as const,
          stripe_customer_id: 'cus_1',
          stripe_subscription_id: 'sub_1',
          stripe_price_id: 'price_1',
          stripe_product_id: 'prod_1',
          stripe_checkout_session_id: 'cs_1',
          checkout_completed_at: '2026-03-15T00:00:00.000Z',
          last_paid_at: '2026-03-15T00:00:00.000Z',
          next_billing_at: '2026-04-15T00:00:00.000Z',
          cancel_at_period_end: false,
          canceled_at: null,
          public_management_token_issued_at: null,
          created_by: 'user-1',
          modified_by: 'user-1',
          created_at: '2026-03-15T00:00:00.000Z',
          updated_at: '2026-03-15T00:00:00.000Z',
          account_name: 'Neighborhood Mutual Aid',
          contact_name: 'Ada Lovelace',
        },
      ],
      pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
      loading: false,
      error: null,
    },
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (value: typeof state) => unknown) => selector(state),
}));

vi.mock('../../state', async (importOriginal) => {
  const actual = await importOriginal<typeof FinanceStateModule>();
  return {
    ...actual,
    fetchRecurringDonationPlans: (payload: unknown) => ({
      type: 'recurringDonations/fetch',
      payload,
    }),
  };
});

describe('RecurringDonationListPage', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it('renders monthly plans and dispatches the recurring donation fetch action', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecurringDonationListPage />, {
      route: '/recurring-donations?search=ada',
    });

    expect(screen.getByRole('heading', { name: 'Recurring Donations' })).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'recurringDonations/fetch',
      payload: {
        filters: {
          search: 'ada',
          status: undefined,
        },
        pagination: {
          page: 1,
          limit: 20,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }));
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });
});
