import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import { vi } from 'vitest';
import type * as FinanceStateModule from '../../state';
import type { DonationDesignation } from '../../../../types/donation';
import type { RecurringDonationPlan } from '../../../../types/recurringDonation';
import RecurringDonationEditPage from '../RecurringDonationEditPage';

const navigateMock = vi.hoisted(() => vi.fn());
const unwrapUpdateMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const dispatchMock = vi.hoisted(() =>
  vi.fn((action: { type?: string }) => {
    if (action.type === 'recurringDonations/update') {
      return { unwrap: unwrapUpdateMock };
    }

    return action;
  })
);
const fetchRecurringDonationPlanByIdMock = vi.hoisted(() =>
  vi.fn((payload: unknown) => ({ type: 'recurringDonations/fetchById', payload }))
);
const updateRecurringDonationPlanMock = vi.hoisted(() =>
  vi.fn((payload: unknown) => ({ type: 'recurringDonations/update', payload }))
);
const clearSelectedRecurringDonationMock = vi.hoisted(() =>
  vi.fn(() => ({ type: 'recurringDonations/clearSelected' }))
);
const fetchDonationDesignationsMock = vi.hoisted(() =>
  vi.fn((payload: unknown) => ({ type: 'donations/fetchDesignations', payload }))
);

const createDesignation = (
  overrides: Partial<DonationDesignation> & Pick<DonationDesignation, 'designation_id' | 'name'>
): DonationDesignation => ({
  designation_id: overrides.designation_id,
  organization_id: overrides.organization_id ?? 'org-1',
  code: overrides.code ?? overrides.name.toLowerCase().replace(/\s+/g, '-'),
  name: overrides.name,
  description: overrides.description ?? null,
  restriction_type: overrides.restriction_type ?? 'unrestricted',
  is_active: overrides.is_active ?? true,
  created_at: overrides.created_at ?? '2026-05-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-05-01T00:00:00.000Z',
});

const createPlan = (overrides: Partial<RecurringDonationPlan> = {}): RecurringDonationPlan => ({
  recurring_plan_id: 'plan-1',
  organization_id: 'org-1',
  account_id: 'account-1',
  contact_id: null,
  site_id: null,
  form_key: null,
  donor_email: 'donor@example.org',
  donor_name: 'Alex Rivera',
  amount: 25,
  currency: 'CAD',
  interval: 'monthly',
  campaign_name: 'Monthly donors',
  designation_id: null,
  designation: null,
  notes: null,
  status: 'active',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  stripe_product_id: null,
  stripe_checkout_session_id: null,
  checkout_completed_at: null,
  last_paid_at: null,
  next_billing_at: null,
  cancel_at_period_end: false,
  canceled_at: null,
  public_management_token_issued_at: null,
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const createMockState = () => ({
  finance: {
    recurring: {
      selectedPlan: createPlan({
        designation_id: 'designation-current',
        designation: 'Legacy scholarship',
        designation_label: 'Legacy Scholarship',
      }),
      loading: false,
      error: null,
    },
    donations: {
      designations: [
        createDesignation({ designation_id: 'designation-active', name: 'General Fund' }),
        createDesignation({
          designation_id: 'designation-current',
          name: 'Legacy Scholarship',
          is_active: false,
        }),
        createDesignation({
          designation_id: 'designation-other-inactive',
          name: 'Dormant Capital',
          is_active: false,
        }),
      ],
      designationsLoading: false,
    },
  },
});

let currentState = createMockState();

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (value: ReturnType<typeof createMockState>) => unknown) =>
    selector(currentState),
}));

vi.mock('../../state', async (importOriginal) => {
  const actual = await importOriginal<typeof FinanceStateModule>();
  return {
    ...actual,
    clearSelectedRecurringDonation: () => clearSelectedRecurringDonationMock(),
    fetchDonationDesignations: (payload: unknown) => fetchDonationDesignationsMock(payload),
    fetchRecurringDonationPlanById: (payload: unknown) =>
      fetchRecurringDonationPlanByIdMock(payload),
    updateRecurringDonationPlan: (payload: unknown) => updateRecurringDonationPlanMock(payload),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'plan-1' }),
  };
});

describe('RecurringDonationEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentState = createMockState();
  });

  it('preserves the current inactive designation without offering unrelated inactive designations', async () => {
    render(
      <MemoryRouter>
        <RecurringDonationEditPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('option', { name: 'Legacy Scholarship (inactive)' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Dormant Capital/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateRecurringDonationPlanMock).toHaveBeenCalled();
    });

    const [{ planData }] = updateRecurringDonationPlanMock.mock.calls[0] as [
      { planData: Record<string, unknown> },
    ];
    expect(planData).not.toHaveProperty('designation_id');
    expect(planData).not.toHaveProperty('designation');
  });
});
