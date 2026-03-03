import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as ReactRouterDom from 'react-router-dom';
import { vi } from 'vitest';
import Setup from '../auth/Setup';
import api from '../../services/api';
import { createTestStore, renderWithProviders } from '../../test/testUtils';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const renderSetup = () => {
  const store = createTestStore();
  renderWithProviders(<Setup />, { store });
  return store;
};

const fillSetupForm = async (password: string) => {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText(/first name/i), 'Setup');
  await user.type(screen.getByLabelText(/last name/i), 'Admin');
  await user.type(screen.getByLabelText(/organization name/i), 'Community Aid Network');
  await user.type(screen.getByLabelText(/email address/i), 'setup@example.com');
  await user.type(screen.getByLabelText(/^password$/i), password);
  await user.type(screen.getByLabelText(/confirm password/i), password);
  await user.click(screen.getByRole('button', { name: /create admin account/i }));
};

const mockSuccessfulSetupRequest = () => {
  const postMock = api.post as ReturnType<typeof vi.fn>;
  const getMock = api.get as ReturnType<typeof vi.fn>;

  postMock.mockResolvedValue({
    data: { success: true, data: { organizationId: 'org-1' } },
  });
  getMock.mockResolvedValue({
    data: {
      success: true,
      data: {
        id: 'user-1',
        email: 'setup@example.com',
        firstName: 'Setup',
        lastName: 'Admin',
        role: 'admin',
      },
    },
  });
};

describe('Setup password validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('submits when password includes non-whitelisted special characters', async () => {
    mockSuccessfulSetupRequest();
    renderSetup();

    await fillSetupForm('Strong1#Password');

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/setup', expect.objectContaining({
        password: 'Strong1#Password',
      }));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('submits when password has no special character', async () => {
    mockSuccessfulSetupRequest();
    renderSetup();

    await fillSetupForm('Strong1Password');

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/setup', expect.objectContaining({
        password: 'Strong1Password',
      }));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
