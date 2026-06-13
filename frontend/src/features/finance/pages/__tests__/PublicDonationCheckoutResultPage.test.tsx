import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/testUtils';
import PublicDonationCheckoutResultPage from '../PublicDonationCheckoutResultPage';

describe('PublicDonationCheckoutResultPage', () => {
  it('renders successful donation redirects without staff-only actions', async () => {
    renderWithProviders(<PublicDonationCheckoutResultPage />, {
      route:
        '/donations/checkout-result?provider=paypal&redirect_status=succeeded&return_to=/donate',
    });

    expect(await screen.findByText('Donation received')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to Website' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view donations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /donate again/i })).not.toBeInTheDocument();
  });

  it('drops unsafe return targets for cancelled donation redirects', async () => {
    renderWithProviders(<PublicDonationCheckoutResultPage />, {
      route:
        '/donations/checkout-result?provider=stripe&status=cancelled&return_to=javascript:alert(1)',
    });

    expect(await screen.findByText('Donation checkout cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return to Website' })).not.toBeInTheDocument();
  });
});
