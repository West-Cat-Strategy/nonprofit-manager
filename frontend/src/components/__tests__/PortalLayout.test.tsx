import { screen } from '@testing-library/react';
import PortalLayout from '../PortalLayout';
import { renderWithProviders } from '../../test/testUtils';

describe('PortalLayout', () => {
  it('hides the browse portal block in the portal header', () => {
    renderWithProviders(<PortalLayout>Portal content</PortalLayout>, {
      route: '/portal/people',
    });

<<<<<<< HEAD
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute(
      'href',
      '#main-content'
    );
=======
>>>>>>> origin/main
    expect(screen.queryByRole('navigation', { name: /browse portal/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /account settings/i })[0]).toHaveAttribute(
      'href',
      '/portal/profile'
    );
    expect(screen.getByText('Portal content')).toBeInTheDocument();
  });
});
