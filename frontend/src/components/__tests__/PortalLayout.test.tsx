import { screen, within } from '@testing-library/react';
import PortalLayout from '../PortalLayout';
import { renderWithProviders } from '../../test/testUtils';

describe('PortalLayout', () => {
  it('renders desktop portal navigation inside the content shell', () => {
    renderWithProviders(<PortalLayout>Portal content</PortalLayout>, {
      route: '/portal/people',
    });

    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute(
      'href',
      '#main-content'
    );
    const portalNav = screen.getByRole('navigation', { name: /browse portal/i });
    expect(portalNav).toBeInTheDocument();
    expect(within(portalNav).getByRole('link', { name: /profile/i })).toHaveAttribute(
      'href',
      '/portal/profile'
    );
    expect(within(portalNav).getByRole('link', { name: /people/i })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getAllByRole('link', { name: /account settings/i })[0]).toHaveAttribute(
      'href',
      '/portal/profile'
    );
    expect(screen.getByText('Portal content')).toBeInTheDocument();
  });
});
