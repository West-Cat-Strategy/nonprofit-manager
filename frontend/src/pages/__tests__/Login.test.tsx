import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import authReducer from '../../store/slices/authSlice';
import accountsReducer from '../../store/slices/accountsSlice';
import contactsReducer from '../../store/slices/contactsSlice';
import volunteersReducer from '../../store/slices/volunteersSlice';
import { authService } from '../../services/authService';
import { vi } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
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

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      accounts: accountsReducer,
      contacts: contactsReducer,
      volunteers: volunteersReducer,
    },
  });

const renderLogin = () => {
  const store = createTestStore();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </Provider>
  );
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
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });

    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
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
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
