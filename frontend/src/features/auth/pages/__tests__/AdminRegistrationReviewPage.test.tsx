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

const renderReviewPage = (route = '/admin-registration-review/review.token.value') =>
  renderWithProviders(
    <Routes>
      <Route path="/admin-registration-review/:token" element={<AdminRegistrationReviewPage />} />
    </Routes>,
    { route }
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
    },
    canConfirm: true,
  };

  beforeEach(() => {
    getAdminRegistrationReviewPreviewMock.mockReset();
    confirmAdminRegistrationReviewMock.mockReset();
  });

  it('loads the preview and confirms the review action', async () => {
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
        },
      },
    });

    renderReviewPage();

    expect(await screen.findByText('Pending Person')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm approve/i }));

    await waitFor(() => {
      expect(confirmAdminRegistrationReviewMock).toHaveBeenCalledWith('review.token.value');
    });
    expect(
      await screen.findByText('Registration approved successfully.')
    ).toBeInTheDocument();
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
  });

  it('shows an already-reviewed state without a confirm button', async () => {
    getAdminRegistrationReviewPreviewMock.mockResolvedValue({
      ...previewPayload,
      canConfirm: false,
      currentReview: {
        status: 'approved',
        reviewedAt: '2026-04-16T12:15:00.000Z',
        rejectionReason: null,
      },
    });

    renderReviewPage();

    expect(
      await screen.findByText('This registration request has already been approved.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm approve/i })).not.toBeInTheDocument();
  });
});
