import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import NeoBrutalistLayout from '../neo-brutalist/NeoBrutalistLayout';
import { renderWithProviders, createTestStore } from '../../test/testUtils';

const renderLayout = () => {
  const store = createTestStore({
    auth: {
      user: {
        id: 'u1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
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
  it('renders children content', () => {
    renderLayout();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('uses pageTitle as accessible label', () => {
    renderLayout();
    expect(screen.getByLabelText('TEST')).toBeInTheDocument();
  });
});
