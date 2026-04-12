import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type * as ApiModule from '../../../../services/api';
import { renderWithProviders } from '../../../../test/testUtils';
import RecurringDonationCheckoutResultPage from '../RecurringDonationCheckoutResultPage';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('../../../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return {
    ...actual,
    default: {
      ...actual.default,
      get: apiGetMock,
    },
  };
});

describe('RecurringDonationCheckoutResultPage', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it('drops unsafe return targets before calling the backend and still renders safe actions', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        plan: {
          amount: 2500,
          currency: 'CAD',
          payment_provider: 'stripe',
        },
        management_url: 'https://example.com/manage',
        return_url: '/donations',
      },
    });

    renderWithProviders(<RecurringDonationCheckoutResultPage />, {
      route:
        '/recurring-donations/checkout-result?plan_id=plan-1&session_id=session-1&return_to=javascript:alert(1)',
    });

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        '/recurring-donations/checkout-result/session-1',
        { params: { plan_id: 'plan-1' } }
      );
    });

    expect(screen.getByRole('button', { name: 'Manage Monthly Donation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to Website' })).toBeInTheDocument();
  });

  it('hides the return action when the cancel redirect target is unsafe', async () => {
    renderWithProviders(<RecurringDonationCheckoutResultPage />, {
      route:
        '/recurring-donations/checkout-result?status=cancelled&plan_id=plan-1&return_to=javascript:alert(1)',
    });

    expect(
      await screen.findByText('Monthly donation checkout cancelled')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return to Website' })).not.toBeInTheDocument();
  });
});
