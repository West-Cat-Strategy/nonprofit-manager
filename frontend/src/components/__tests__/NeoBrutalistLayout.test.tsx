import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import NeoBrutalistLayout from '../neo-brutalist/NeoBrutalistLayout';
import authReducer from '../../store/slices/authSlice';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLayout = (role: string) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
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
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter>
        <NeoBrutalistLayout pageTitle="TEST">
          <div>Content</div>
        </NeoBrutalistLayout>
      </MemoryRouter>
    </Provider>
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

