import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AuthHeroShell, PrimaryButton } from '../../../components/ui';
import {
  authService,
  type AdminRegistrationReviewPreview,
} from '../../../services/authService';
import { useAppSelector } from '../../../store/hooks';

type ReviewState =
  | 'loading'
  | 'ready'
  | 'success'
  | 'already-reviewed'
  | 'expired'
  | 'invalid'
  | 'error';

const formatName = (preview: AdminRegistrationReviewPreview | null): string => {
  if (!preview) {
    return 'Registration review';
  }

  const { firstName, lastName, email } = preview.pendingRegistration;
  return [firstName, lastName].filter(Boolean).join(' ') || email;
};

const getActionLabel = (action: AdminRegistrationReviewPreview['action']): string =>
  action === 'approve' ? 'Approve request' : 'Reject request';

const getActionProgressLabel = (action: AdminRegistrationReviewPreview['action']): string =>
  action === 'approve' ? 'Approving request...' : 'Rejecting request...';

const getReviewStatusLabel = (
  status: AdminRegistrationReviewPreview['currentReview']['status']
): string => {
  if (status === 'approved') {
    return 'Approved';
  }

  if (status === 'rejected') {
    return 'Rejected';
  }

  return 'Awaiting review';
};

const getErrorCode = (error: unknown): string | undefined =>
  (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;

const getErrorMessage = (error: unknown): string | undefined =>
  (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;

const formatDateTime = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString();
};

const getAlreadyReviewedMessage = (preview: AdminRegistrationReviewPreview): string => {
  const outcome = preview.currentReview.status === 'approved' ? 'approved' : 'rejected';
  const resolvedReviewer = preview.currentReview.reviewedBy?.displayName;
  const reviewedAt = formatDateTime(preview.currentReview.reviewedAt);

  const base = resolvedReviewer
    ? `This registration request has already been ${outcome} by ${resolvedReviewer}.`
    : `This registration request has already been ${outcome}.`;

  return reviewedAt ? `${base} Reviewed ${reviewedAt}.` : base;
};

export default function AdminRegistrationReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [state, setState] = useState<ReviewState>('loading');
  const [preview, setPreview] = useState<AdminRegistrationReviewPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const autoCompleteMode = searchParams.get('mode') === 'complete';

  useEffect(() => {
    document.title = 'Registration Review | Nonprofit Manager';
  }, []);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      setMessage('This review link is invalid.');
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      setState('loading');
      setMessage(null);

      try {
        const nextPreview = await authService.getAdminRegistrationReviewPreview(token);
        if (cancelled) {
          return;
        }

        setPreview(nextPreview);

        if (autoCompleteMode && nextPreview.canConfirm) {
          setConfirming(true);
          try {
            const result = await authService.confirmAdminRegistrationReview(token);
            if (cancelled) {
              return;
            }

            setPreview(result.review);
            setMessage(
              result.status === 'already_reviewed'
                ? getAlreadyReviewedMessage(result.review)
                : result.message
            );
            setState(result.status === 'completed' ? 'success' : 'already-reviewed');
            return;
          } catch (error) {
            if (cancelled) {
              return;
            }

            const code = getErrorCode(error);
            const fallbackMessage = getErrorMessage(error);

            if (code === 'expired_review_token') {
              setState('expired');
              setMessage(fallbackMessage || 'This review link has expired.');
              return;
            }

            if (
              code === 'invalid_review_token' ||
              code === 'pending_registration_not_found' ||
              code === 'reviewer_unavailable'
            ) {
              setState('invalid');
              setMessage(fallbackMessage || 'This review link is no longer valid.');
              return;
            }

            setState('ready');
            setMessage(
              fallbackMessage || 'Unable to complete automatically. You can confirm manually below.'
            );
            return;
          } finally {
            if (!cancelled) {
              setConfirming(false);
            }
          }
        }

        if (nextPreview.canConfirm) {
          setState('ready');
          setMessage(null);
          return;
        }

        setState('already-reviewed');
        setMessage(getAlreadyReviewedMessage(nextPreview));
      } catch (error) {
        if (cancelled) {
          return;
        }

        const code = getErrorCode(error);
        const fallbackMessage = getErrorMessage(error);

        if (code === 'expired_review_token') {
          setState('expired');
          setMessage(fallbackMessage || 'This review link has expired.');
          return;
        }

        if (
          code === 'invalid_review_token' ||
          code === 'pending_registration_not_found' ||
          code === 'reviewer_unavailable'
        ) {
          setState('invalid');
          setMessage(fallbackMessage || 'This review link is no longer valid.');
          return;
        }

        setState('error');
        setMessage(fallbackMessage || 'Unable to load this registration review right now.');
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [autoCompleteMode, token]);

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !preview) {
      return;
    }

    setConfirming(true);
    try {
      const result = await authService.confirmAdminRegistrationReview(token);
      setPreview(result.review);
      setMessage(
        result.status === 'already_reviewed'
          ? getAlreadyReviewedMessage(result.review)
          : result.message
      );
      setState(result.status === 'completed' ? 'success' : 'already-reviewed');
    } catch (error) {
      const code = getErrorCode(error);
      const fallbackMessage = getErrorMessage(error);

      if (code === 'expired_review_token') {
        setState('expired');
        setMessage(fallbackMessage || 'This review link has expired.');
      } else if (
        code === 'invalid_review_token' ||
        code === 'pending_registration_not_found' ||
        code === 'reviewer_unavailable'
      ) {
        setState('invalid');
        setMessage(fallbackMessage || 'This review link is no longer valid.');
      } else {
        setState('error');
        setMessage(fallbackMessage || 'Unable to confirm this review right now.');
      }
    } finally {
      setConfirming(false);
    }
  };

  const displayName = useMemo(() => formatName(preview), [preview]);
  const requestedAt = formatDateTime(preview?.pendingRegistration.createdAt);
  const reviewedAt = formatDateTime(preview?.currentReview.reviewedAt);
  const statusBannerClass =
    state === 'success'
      ? 'border-app-border bg-app-accent-soft text-app-accent-text'
      : 'border-app-border bg-app-surface text-app-text';
  const workspaceCta = isAuthenticated
    ? {
        to: '/settings/admin/approvals',
        label: 'Open Admin Approvals',
        helper: null,
      }
    : {
        to: '/login',
        label: 'Sign In',
        helper: 'Approvals live in the admin workspace after you sign in.',
      };

  const renderWorkspaceCta = () => (
    <div className="space-y-2">
      <Link
        to={workspaceCta.to}
        className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm font-semibold text-app-text transition hover:bg-app-hover"
      >
        {workspaceCta.label}
      </Link>
      {workspaceCta.helper ? (
        <p className="text-sm text-app-text-muted">{workspaceCta.helper}</p>
      ) : null}
    </div>
  );

  const renderBody = () => {
    if (state === 'loading') {
      return (
        <p className="mt-4 text-sm text-app-text-muted" aria-live="polite">
          {confirming && preview ? getActionProgressLabel(preview.action) : 'Loading registration review...'}
        </p>
      );
    }

    if (state === 'invalid' || state === 'expired' || state === 'error') {
      return (
        <div className="mt-4 space-y-4">
          <div className={`rounded-lg border px-4 py-3 text-sm ${statusBannerClass}`}>
            {message}
          </div>
          {renderWorkspaceCta()}
        </div>
      );
    }

    if (!preview) {
      return null;
    }

    return (
      <div className="mt-4 space-y-5">
        {message ? (
          <div className={`rounded-lg border px-4 py-3 text-sm ${statusBannerClass}`}>{message}</div>
        ) : null}

        <div className="rounded-2xl border border-app-border bg-app-surface px-5 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
                Pending registration
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-app-text-heading">{displayName}</h2>
              <p className="mt-1 text-sm text-app-text-muted">{preview.pendingRegistration.email}</p>
            </div>
            <span className="rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-app-text-heading">
              {getActionLabel(preview.action)}
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                Requested
              </dt>
              <dd className="mt-1 text-sm text-app-text">{requestedAt}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                Link recipient
              </dt>
              <dd className="mt-1 text-sm text-app-text">{preview.reviewer.displayName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                Final status
              </dt>
              <dd className="mt-1 text-sm text-app-text">
                {getReviewStatusLabel(preview.currentReview.status)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                Passkeys
              </dt>
              <dd className="mt-1 text-sm text-app-text">
                {preview.pendingRegistration.hasStagedPasskeys
                  ? 'Applicant staged a passkey'
                  : 'No staged passkey'}
              </dd>
            </div>
            {preview.currentReview.reviewedBy ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Actual reviewer
                </dt>
                <dd className="mt-1 text-sm text-app-text">
                  {preview.currentReview.reviewedBy.displayName}
                </dd>
              </div>
            ) : null}
            {reviewedAt ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Reviewed at
                </dt>
                <dd className="mt-1 text-sm text-app-text">{reviewedAt}</dd>
              </div>
            ) : null}
            {preview.currentReview.rejectionReason ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Rejection reason
                </dt>
                <dd className="mt-1 text-sm text-app-text">
                  {preview.currentReview.rejectionReason}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {state === 'ready' ? (
          <form onSubmit={handleConfirm} className="space-y-3">
            <PrimaryButton type="submit" disabled={confirming} className="w-full justify-center">
              {confirming ? getActionProgressLabel(preview.action) : `Confirm ${preview.action}`}
            </PrimaryButton>
            <p className="text-sm text-app-text-muted">
              This will {preview.action === 'approve' ? 'approve' : 'reject'} the request
              immediately.
            </p>
          </form>
        ) : (
          renderWorkspaceCta()
        )}
      </div>
    );
  };

  return (
    <AuthHeroShell
      badge="Registration review"
      title={
        preview
          ? `${getActionLabel(preview.action)} for ${displayName}`
          : 'Review a pending registration'
      }
      description="Confirm this admin decision from a secure email review link."
      highlights={[
        'Each review link is specific to one admin recipient.',
        'Links expire automatically after 7 days.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
        Admin review
      </p>
      {renderBody()}
    </AuthHeroShell>
  );
}
