import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PaymentResultPage from '../PaymentResultPage';

const dispatchMock = vi.fn();

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
}));

describe('PaymentResultPage', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    sessionStorage.clear();
  });

  it('clears the checkout context as soon as the result page loads', async () => {
    sessionStorage.setItem(
      'payment_checkout_context',
      JSON.stringify({
        provider: 'paypal',
        paymentIntentId: 'pi_123',
        checkoutSessionId: 'cs_123',
        donorEmail: 'ada@example.com',
        donorName: 'Ada Lovelace',
        donorPhone: '555-0123',
        amount: 2500,
        currency: 'cad',
        campaignName: 'Spring giving',
        designation: 'General fund',
        isRecurring: true,
        recurringFrequency: 'monthly',
      })
    );

    renderWithProviders(<PaymentResultPage />, {
      route: '/donations/payment-result?provider=paypal&payment_intent=pi_123&redirect_status=succeeded',
    });

    expect(await screen.findByRole('heading', { name: 'Thank You!' })).toBeInTheDocument();
    await waitFor(() => {
      expect(sessionStorage.getItem('payment_checkout_context')).toBeNull();
    });
  });
});
