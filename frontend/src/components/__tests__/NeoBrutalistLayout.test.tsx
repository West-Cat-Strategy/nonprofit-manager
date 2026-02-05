import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import NeoBrutalistLayout from '../neo-brutalist/NeoBrutalistLayout';
import { renderWithProviders, createTestStore } from '../../test/testUtils';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLayout = (role: string) => {
  const store = createTestStore({
    auth: {
      user: {
        id: 'u1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role,
        profilePicture: null,
      },
      token: 't',
      isAuthenticated: true,
      loading: false,
    },
  });

  renderWithProviders(
    <NeoBrutalistLayout pageTitle="TEST">
      <div>Content</div>
    </NeoBrutalistLayout>,
    { store }
  );
};

describe('NeoBrutalistLayout', () => {
  it('shows Organization Admin in menu for admins', () => {
    renderLayout('admin');
    fireEvent.click(screen.getByLabelText('Open user menu'));
    expect(screen.getByText('Organization Admin')).toBeInTheDocument();
  });

  it('hides Organization Admin in menu for non-admins', () => {
    renderLayout('user');
    fireEvent.click(screen.getByLabelText('Open user menu'));
    expect(screen.queryByText('Organization Admin')).not.toBeInTheDocument();
  });
});
