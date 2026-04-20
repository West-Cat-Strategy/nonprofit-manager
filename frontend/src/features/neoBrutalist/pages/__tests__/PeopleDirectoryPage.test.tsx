import type * as ReactRouterDom from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PeopleDirectoryPage from '../PeopleDirectoryPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { mockNavigate, mockLocation, mockApiGet } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLocation: vi.fn(() => ({ pathname: '/demo/people' })),
  mockApiGet: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation(),
  };
});

vi.mock('../../../../services/api', () => ({
  default: {
    get: mockApiGet,
  },
}));

describe('PeopleDirectoryPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockApiGet.mockReset();
    mockLocation.mockReturnValue({ pathname: '/demo/people' });
  });

  it('renders deterministic demo people without calling the live contacts API', () => {
    renderWithProviders(<PeopleDirectoryPage />, {
      route: '/demo/people',
    });

    expect(screen.getByRole('heading', { name: 'Avery Stone' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jordan Lee' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sam Nguyen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Riley Chen' })).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('adds visible focus hooks to the people CTA and filter tabs', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PeopleDirectoryPage />, {
      route: '/demo/people',
    });

    const openPeopleButton = screen.getByRole('button', { name: /open people/i });
    const allPeopleTab = screen.getByRole('button', { name: /all people/i });
    const volunteersTab = screen.getByRole('button', { name: /volunteers/i });

    expect(openPeopleButton.className).toContain('focus-visible:ring-4');
    expect(openPeopleButton.className).toContain('bg-[var(--loop-cyan)]');
    expect(allPeopleTab.className).toContain('focus-visible:ring-4');
    expect(allPeopleTab).toHaveAttribute('aria-pressed', 'true');

    await user.click(volunteersTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /volunteers/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    expect(screen.queryByRole('heading', { name: 'Avery Stone' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sam Nguyen' })).toBeInTheDocument();
  });

  it('routes the Open People CTA to the contacts workspace', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PeopleDirectoryPage />, {
      route: '/demo/people',
    });

    await user.click(screen.getByRole('button', { name: /open people/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/contacts');
  });
});
