import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortalLayout from '../PortalLayout';
import { renderWithProviders } from '../../test/testUtils';

describe('PortalLayout', () => {
  it('renders folded mobile and desktop portal navigation inside the content shell', async () => {
    const user = userEvent.setup();

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
    const mobileFold = screen.getByTestId('portal-local-navigation-mobile');
    const mobileFoldSummary = screen.getByTestId('portal-local-navigation-mobile-summary');
    await user.click(mobileFoldSummary);
    expect(within(mobileFold).getByRole('link', { name: /people/i })).toHaveAttribute(
      'href',
      '/portal/people'
    );
    expect(screen.getByText('Portal content')).toBeInTheDocument();
  });

  it('renders persistent mobile bottom navigation with high-frequency tabs', () => {
    renderWithProviders(<PortalLayout>Portal content</PortalLayout>, {
      route: '/portal/appointments',
    });

    const bottomNav = screen.getByTestId('portal-mobile-bottom-nav');
    expect(bottomNav).toBeInTheDocument();

    const dashboardLink = within(bottomNav).getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/portal');

    const appointmentsLink = within(bottomNav).getByRole('link', { name: /appointments/i });
    expect(appointmentsLink).toHaveAttribute('href', '/portal/appointments');
    expect(appointmentsLink).toHaveAttribute('aria-current', 'page');

    const messagesLink = within(bottomNav).getByRole('link', { name: /messages/i });
    expect(messagesLink).toHaveAttribute('href', '/portal/messages');

    const documentsLink = within(bottomNav).getByRole('link', { name: /documents/i });
    expect(documentsLink).toHaveAttribute('href', '/portal/documents');

    const moreBtn = within(bottomNav).getByRole('button', { name: /more/i });
    expect(moreBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens and closes the mobile overflow drawer for secondary routes', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalLayout>Portal content</PortalLayout>, {
      route: '/portal',
    });

    const bottomNav = screen.getByTestId('portal-mobile-bottom-nav');
    const moreBtn = within(bottomNav).getByRole('button', { name: /more/i });

    expect(screen.queryByTestId('portal-mobile-more-drawer')).not.toBeInTheDocument();

    await user.click(moreBtn);
    expect(screen.getByTestId('portal-mobile-more-drawer')).toBeInTheDocument();
    expect(moreBtn).toHaveAttribute('aria-expanded', 'true');

    const drawer = screen.getByTestId('portal-mobile-more-drawer');
    expect(within(drawer).getByRole('heading', { name: /more options/i })).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: /account|profile/i })).toHaveAttribute(
      'href',
      '/portal/profile'
    );
    expect(within(drawer).getByRole('button', { name: /sign out/i })).toBeInTheDocument();

    // Close via close button
    const closeBtn = within(drawer).getByRole('button', { name: /close more options/i });
    await user.click(closeBtn);
    expect(screen.queryByTestId('portal-mobile-more-drawer')).not.toBeInTheDocument();

    // Open again and close via Escape
    await user.click(moreBtn);
    expect(screen.getByTestId('portal-mobile-more-drawer')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('portal-mobile-more-drawer')).not.toBeInTheDocument();
  });
});

