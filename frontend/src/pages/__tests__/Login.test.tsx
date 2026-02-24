import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as ReactRouterDom from 'react-router-dom';
import Login from '../auth/Login';
import { authService } from '../../services/authService';
import { renderWithProviders, createTestStore } from '../../test/testUtils';
import { vi } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
  },
}));

const renderLogin = () => {
  const store = createTestStore();
  renderWithProviders(<Login />, { store });
  return store;
};

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form fields', () => {
    renderLogin();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('submits credentials and navigates on success', async () => {
    const user = userEvent.setup();
    const authResponse = {
      token: 'token-123',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
    };

    const loginMock = authService.login as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    loginMock.mockResolvedValueOnce(authResponse);

    const store = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });

    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('normalizes email before submitting credentials', async () => {
    const user = userEvent.setup();
    const authResponse = {
      token: 'token-123',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
    };

    const loginMock = authService.login as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    loginMock.mockResolvedValueOnce(authResponse);

    renderLogin();

    await user.type(screen.getByLabelText(/email address/i), '  Test@Example.com  ');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });
  });

  it('shows error message on failed login', async () => {
    const user = userEvent.setup();
    const loginMock = authService.login as unknown as {
      mockRejectedValueOnce: (value: unknown) => void;
    };
    loginMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: 'Invalid credentials' } },
    });

    renderLogin();

    await user.type(screen.getByLabelText(/email address/i), 'fail@example.com');
    await user.type(screen.getByLabelText(/password/i), 'BadPassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
