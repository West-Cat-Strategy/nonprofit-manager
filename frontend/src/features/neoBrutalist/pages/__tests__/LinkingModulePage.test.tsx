import type * as ReactRouterDom from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkingModulePage from '../LinkingModulePage';
import { renderWithProviders } from '../../../../test/testUtils';

const { mockNavigate, mockLocation, mockGetOrganizations } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLocation: vi.fn(() => ({ pathname: '/linking' })),
  mockGetOrganizations: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation(),
  };
});

vi.mock('../../../../services/LoopApiService', () => ({
  default: {
    getOrganizations: mockGetOrganizations,
  },
}));

const mockOrganizations = [
  {
    id: 'org-1',
    name: 'River City Mutual Aid',
    type: 'partner',
    status: 'active',
    contact: 'hello@rivercitymutual.org',
  },
  {
    id: 'org-2',
    name: 'North Shore Housing Office',
    type: 'government',
    status: 'review',
    contact: 'liaison@northshore.gov',
  },
  {
    id: 'org-3',
    name: 'Harbor Light Foundation',
    type: 'grantor',
    status: 'pending',
    contact: 'programs@harborlight.ca',
  },
] as const;

describe('LinkingModulePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLocation.mockReturnValue({ pathname: '/linking' });
    mockGetOrganizations.mockResolvedValue([...mockOrganizations]);
  });

  it.each([
    ['name', 'north shore', 'North Shore Housing Office'],
    ['type', 'grantor', 'Harbor Light Foundation'],
    ['status', 'active', 'River City Mutual Aid'],
    ['contact', 'liaison@northshore.gov', 'North Shore Housing Office'],
  ])('filters visible organizations by %s', async (_field, query, expectedName) => {
    const user = userEvent.setup();

    renderWithProviders(<LinkingModulePage />, {
      route: '/linking',
    });

    await waitFor(() => {
      expect(screen.getByText('River City Mutual Aid')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('searchbox', { name: /search partnerships/i }), query);

    expect(screen.getByText(expectedName)).toBeInTheDocument();
    for (const org of mockOrganizations.filter(
      (organization) => organization.name !== expectedName
    )) {
      expect(screen.queryByText(org.name)).not.toBeInTheDocument();
    }
  });

  it('shows an empty state when organization search has no matches', async () => {
    const user = userEvent.setup();

    renderWithProviders(<LinkingModulePage />, {
      route: '/linking',
    });

    await waitFor(() => {
      expect(screen.getByText('River City Mutual Aid')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('searchbox', { name: /search partnerships/i }), 'zzzz');

    expect(screen.getByRole('heading', { name: /no partnerships found/i })).toBeInTheDocument();
    expect(screen.getByText(/try a different name, type, status, or contact/i)).toBeInTheDocument();
    expect(screen.queryByText('River City Mutual Aid')).not.toBeInTheDocument();
  });
});
