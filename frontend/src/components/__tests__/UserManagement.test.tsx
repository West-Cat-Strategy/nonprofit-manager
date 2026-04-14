import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
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
    renderWithProviders(<UserManagement />);

    await screen.findByText('No users found');

    await user.click(screen.getByRole('button', { name: /add user/i }));

    const dialog = await screen.findByRole('dialog', { name: /create new user/i });
    const firstNameInput = within(dialog).getByLabelText(/first name/i);
    const lastNameInput = within(dialog).getByLabelText(/last name/i);
    const emailInput = within(dialog).getByLabelText(/^email$/i);
    const passwordInput = within(dialog).getByLabelText(/^password$/i);
    const confirmPasswordInput = within(dialog).getByLabelText(/confirm password/i);

    await user.type(firstNameInput, 'Avery');
    await user.type(lastNameInput, 'Morgan');
    await user.type(emailInput, 'avery.morgan@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');

    expect(firstNameInput).toHaveValue('Avery');
    expect(lastNameInput).toHaveValue('Morgan');
    expect(emailInput).toHaveValue('avery.morgan@example.com');
    expect(passwordInput).toHaveValue('Password123');
    expect(confirmPasswordInput).toHaveValue('Password123');
  });
});
