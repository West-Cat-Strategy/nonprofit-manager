import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import AdminRegistrationReviewPage from '../AdminRegistrationReviewPage';

const getAdminRegistrationReviewPreviewMock = vi.fn();
const confirmAdminRegistrationReviewMock = vi.fn();

vi.mock('../../../../services/authService', () => ({
  authService: {
    getAdminRegistrationReviewPreview: (...args: unknown[]) =>
      getAdminRegistrationReviewPreviewMock(...args),
    confirmAdminRegistrationReview: (...args: unknown[]) =>
      confirmAdminRegistrationReviewMock(...args),
  },
}));

const authenticatedState = {
  auth: {
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'admin',
    },
    isAuthenticated: true,
    authLoading: false,
    loading: false,
  },
};

const renderReviewPage = (
  route = '/admin-registration-review/review.token.value',
  preloadedState?: Parameters<typeof renderWithProviders>[1]['preloadedState']
) =>
  renderWithProviders(
    <Routes>
      <Route path="/admin-registration-review/:token" element={<AdminRegistrationReviewPage />} />
    </Routes>,
    { route, preloadedState }
  );

describe('AdminRegistrationReviewPage', () => {
  const previewPayload = {
    action: 'approve' as const,
    reviewer: {
      id: 'admin-1',
      email: 'admin@example.com',
      firstName: 'Ada',
      lastName: 'Admin',
      displayName: 'Ada Admin',
    },
    pendingRegistration: {
      id: 'pending-1',
      email: 'pending@example.com',
      firstName: 'Pending',
      lastName: 'Person',
      createdAt: '2026-04-16T12:00:00.000Z',
      status: 'pending' as const,
      reviewedAt: null,
      rejectionReason: null,
      hasStagedPasskeys: true,
    },
    currentReview: {
      status: 'pending' as const,
      reviewedAt: null,
      rejectionReason: null,
      reviewedBy: null,
    },
    canConfirm: true,
  };

  beforeEach(() => {
    getAdminRegistrationReviewPreviewMock.mockReset();
    confirmAdminRegistrationReviewMock.mockReset();
  });

  it('auto-confirms the review action when mode=complete is present', async () => {
    getAdminRegistrationReviewPreviewMock.mockResolvedValue(previewPayload);
    confirmAdminRegistrationReviewMock.mockResolvedValue({
      status: 'completed',
      action: 'approve',
      message: 'Registration approved successfully.',
      review: {
        ...previewPayload,
        canConfirm: false,
        currentReview: {
          status: 'approved',
          reviewedAt: '2026-04-16T12:15:00.000Z',
          rejectionReason: null,
          reviewedBy: {
            id: 'admin-1',
            email: 'admin@example.com',
            firstName: 'Ada',
            lastName: 'Admin',
            displayName: 'Ada Admin',
          },
        },
      },
    });

    renderReviewPage('/admin-registration-review/review.token.value?mode=complete');

    await waitFor(() => {
      expect(confirmAdminRegistrationReviewMock).toHaveBeenCalledWith('review.token.value');
    });
    expect(
      await screen.findByText('Registration approved successfully.')
    ).toBeInTheDocument();
  });

  it('keeps the plain route on the manual confirm flow', async () => {
    getAdminRegistrationReviewPreviewMock.mockResolvedValue(previewPayload);
    confirmAdminRegistrationReviewMock.mockResolvedValue({
      status: 'completed',
      action: 'approve',
      message: 'Registration approved successfully.',
      review: {
        ...previewPayload,
        canConfirm: false,
        currentReview: {
          status: 'approved',
          reviewedAt: '2026-04-16T12:15:00.000Z',
          rejectionReason: null,
          reviewedBy: {
            id: 'admin-1',
            email: 'admin@example.com',
            firstName: 'Ada',
            lastName: 'Admin',
            displayName: 'Ada Admin',
          },
        },
      },
    });

    renderReviewPage();

    expect(await screen.findByText('Pending Person')).toBeInTheDocument();
    expect(confirmAdminRegistrationReviewMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));

    await waitFor(() => {
      expect(confirmAdminRegistrationReviewMock).toHaveBeenCalledWith('review.token.value');
    });
  });

  it('shows an expired state for expired review links', async () => {
    getAdminRegistrationReviewPreviewMock.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'expired_review_token',
            message: 'This review link has expired.',
          },
        },
      },
    });

    renderReviewPage();

    expect(await screen.findByText('This review link has expired.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
  });

  it('shows already-reviewed attribution when another admin resolved the request', async () => {
    getAdminRegistrationReviewPreviewMock.mockResolvedValue({
      ...previewPayload,
      canConfirm: false,
      currentReview: {
        status: 'approved',
        reviewedAt: '2026-04-16T12:15:00.000Z',
        rejectionReason: null,
        reviewedBy: {
          id: 'admin-2',
          email: 'grace@example.com',
          firstName: 'Grace',
          lastName: 'Reviewer',
          displayName: 'Grace Reviewer',
        },
      },
    });

    renderReviewPage('/admin-registration-review/review.token.value', authenticatedState);

    expect(
      await screen.findByText(/already been approved by Grace Reviewer/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Grace Reviewer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Admin Approvals' })).toHaveAttribute(
      'href',
      '/settings/admin/approvals'
    );
  });
});
