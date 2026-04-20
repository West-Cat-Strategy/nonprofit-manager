import { screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import ReportsHomePage from '../ReportsHomePage';
import { renderWithProviders } from '../../../../test/testUtils';

const buildAuthState = (permissions: string[]) => ({
  auth: {
    user: {
      id: 'user-1',
      email: 'reports@example.com',
      firstName: 'Reports',
      lastName: 'User',
      role: 'staff',
      permissions,
    },
    isAuthenticated: true,
    authLoading: false,
    loading: false,
  },
});

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('ReportsHomePage', () => {
  it('renders the persona workflow cards with deep links into existing reports routes', () => {
    renderWithProviders(<ReportsHomePage />, {
      preloadedState: buildAuthState([
        'report:view',
        'report:create',
        'scheduled_report:view',
        'scheduled_report:manage',
      ]),
    });

    const executiveCard = screen
      .getByRole('heading', { name: /executive \+ board pack/i })
      .closest('article');
    const adminCard = screen
      .getByRole('heading', { name: /admin reporting reliability/i })
      .closest('article');
    const fundraisingCard = screen
      .getByRole('heading', { name: /fundraising cadence/i })
      .closest('article');

    expect(executiveCard).not.toBeNull();
    expect(adminCard).not.toBeNull();
    expect(fundraisingCard).not.toBeNull();

    expect(
      within(executiveCard as HTMLElement).getByRole('link', {
        name: /board pack templates/i,
      })
    ).toHaveAttribute('href', '/reports/templates?tag=board-pack');
    expect(
      within(adminCard as HTMLElement).getByRole('link', {
        name: /scheduled reports/i,
      })
    ).toHaveAttribute('href', '/reports/scheduled');
    expect(
      within(adminCard as HTMLElement).getByRole('link', {
        name: /workflow coverage/i,
      })
    ).toHaveAttribute('href', '/reports/workflow-coverage');
    expect(
      within(fundraisingCard as HTMLElement).getByRole('link', {
        name: /fundraising templates/i,
      })
    ).toHaveAttribute(
      'href',
      '/reports/templates?category=fundraising&tag=fundraising-cadence'
    );
  });

  it('keeps management-only actions hidden when the user only has scheduled report access', () => {
    renderWithProviders(<ReportsHomePage />, {
      preloadedState: buildAuthState(['scheduled_report:view']),
    });

    expect(
      screen.getByRole('link', { name: /scheduled reports/i })
    ).toHaveAttribute('href', '/reports/scheduled');
    expect(
      screen.queryByRole('link', { name: /board pack templates/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /fundraising templates/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /workflow coverage/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /saved reports/i })).not.toBeInTheDocument();
  });
});
