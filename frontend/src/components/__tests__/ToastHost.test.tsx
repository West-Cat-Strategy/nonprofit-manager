import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ToastHost from '../ToastHost';
import { renderWithProviders } from '../../test/testUtils';

vi.mock('../../contexts/useToast', () => ({
  useToast: () => ({
    toasts: [
      {
        id: 'toast-1',
        variant: 'info',
        message: 'Dock-safe toast',
        correlationId: 'corr-123',
      },
    ],
    removeToast: vi.fn(),
  }),
}));

describe('ToastHost', () => {
  it('uses the Team Messenger offset CSS variable for bottom positioning', () => {
    const { container } = renderWithProviders(<ToastHost />);

<<<<<<< HEAD
    expect(screen.getByRole('status', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText('Dock-safe toast')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss notification/i })).toBeInTheDocument();
=======
    expect(screen.getByText('Dock-safe toast')).toBeInTheDocument();
>>>>>>> origin/main
    expect(container.firstChild).toHaveStyle({
      bottom: 'calc(1rem + var(--team-messenger-toast-offset, 0px))',
    });
  });
});
