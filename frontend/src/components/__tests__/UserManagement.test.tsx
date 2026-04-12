import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagement from '../UserManagement';
import { renderWithProviders } from '../../test/testUtils';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/users?')) {
        return Promise.resolve({ data: { users: [] } });
      }

      if (url === '/users/roles') {
        return Promise.resolve({ data: { roles: [] } });
      }

      return Promise.resolve({ data: {} });
    });
  });

  it('keeps the create user modal text fields stable while typing', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<UserManagement />);

    await screen.findByText('No users found');

    await user.click(screen.getByRole('button', { name: /add user/i }));

    const modalTitle = await screen.findByText('Create New User');
    const modalRoot = modalTitle.closest('div.relative') as HTMLElement;
    expect(modalRoot).toBeTruthy();

    const textInputs = modalRoot.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="email"]');
    const passwordInputs = modalRoot.querySelectorAll<HTMLInputElement>('input[type="password"]');

    await user.type(textInputs[0], 'Avery');
    await user.type(textInputs[1], 'Morgan');
    await user.type(textInputs[2], 'avery.morgan@example.com');
    await user.type(passwordInputs[0], 'Password123');
    await user.type(passwordInputs[1], 'Password123');

    expect(textInputs[0].value).toBe('Avery');
    expect(textInputs[1].value).toBe('Morgan');
    expect(textInputs[2].value).toBe('avery.morgan@example.com');
    expect(passwordInputs[0].value).toBe('Password123');
    expect(passwordInputs[1].value).toBe('Password123');

    expect(container).toBeTruthy();
  });
});
