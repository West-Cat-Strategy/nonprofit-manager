import type { ChangeEventHandler, KeyboardEventHandler, ReactNode } from 'react';
import type * as ReactRouterDom from 'react-router-dom';
import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import NeoBrutalistDashboard from '../neo-brutalist/NeoBrutalistDashboard';
import api from '../../services/api';
import { renderWithProviders, createTestStore } from '../../test/testUtils';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/api');

vi.mock('../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({
    pageTitle,
    children,
  }: {
    pageTitle: string;
    children: ReactNode;
  }) => (
    <main>
      <h1>{pageTitle}</h1>
      {children}
    </main>
  ),
}));

vi.mock('../../components/neo-brutalist/BrutalInput', () => ({
  default: ({
    value,
    onChange,
    placeholder,
    type,
    className,
    'aria-label': ariaLabel,
    onKeyDown,
  }: {
    value: string;
    onChange: ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    type?: string;
    className?: string;
    'aria-label'?: string;
    onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  }) => (
    <input
      aria-label={ariaLabel}
      className={className}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  ),
}));

describe('NeoBrutalistDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch analytics/task summaries on initial render', () => {
    const store = createTestStore({
      auth: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'admin',
        },
        isAuthenticated: true,
        authLoading: false,
        loading: false,
      },
    });

    renderWithProviders(<NeoBrutalistDashboard />, { store, route: '/dashboard' });

    expect(screen.getByRole('heading', { name: 'WORKBENCH OVERVIEW' })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
