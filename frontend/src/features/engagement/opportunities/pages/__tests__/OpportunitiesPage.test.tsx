import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OpportunitiesPage from '../OpportunitiesPage';
import { renderWithProviders } from '../../../../../test/testUtils';

const dispatchMock = vi.fn();
const fundraiserWorkflowLinks = [
  ['/reports', /reports workspace/i],
  [
    '/reports/templates?category=fundraising&tag=fundraising-cadence',
    /fundraising cadence templates/i,
  ],
  ['/reports/scheduled', /scheduled reports/i],
  ['/opportunities', /opportunity pipeline/i],
  ['/settings/communications', /communications settings/i],
] as const;
const state = {
  opportunities: {
    opportunities: [],
    stages: [],
    summary: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
    loading: false,
    error: null,
  },
};

vi.mock('../../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (value: typeof state) => unknown) => selector(state),
}));

describe('OpportunitiesPage', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it('renders fundraiser workflow panel links', () => {
    renderWithProviders(<OpportunitiesPage />, { route: '/opportunities' });

    expect(screen.getByRole('heading', { name: /fundraiser workflow/i })).toBeInTheDocument();
    fundraiserWorkflowLinks.forEach(([href, name]) => {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    });
  });

  it('uses high-contrast workflow cards with visible focus styling', () => {
    renderWithProviders(<OpportunitiesPage />, { route: '/opportunities' });

    const reportsLink = screen.getByRole('link', { name: /reports workspace/i });
    const reportsDescription = screen.getByText(
      /open the fundraiser reporting home for shared context/i
    );

    expect(reportsLink.className).toContain('bg-[#0f172a]');
    expect(reportsLink.className).toContain('focus-visible:ring-4');
    expect(reportsLink.className).toContain('text-white');
    expect(reportsDescription.className).toContain('text-slate-200');
  });
});
