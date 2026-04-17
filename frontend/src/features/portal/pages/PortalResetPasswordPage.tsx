import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import portalApi from '../../../services/portalApi';
import { AuthHeroShell, FormField, PrimaryButton } from '../../../components/ui';

type Status = 'loading' | 'valid' | 'invalid' | 'success' | 'error';

export default function PortalResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    void (async () => {
      try {
        const response = await portalApi.get<{ valid: boolean }>(
          `/portal/auth/reset-password/${token}`
        );
        setStatus(response.data.valid ? 'valid' : 'invalid');
      } catch {
        setStatus('invalid');
      }
    })();
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await portalApi.post('/portal/auth/reset-password', {
        token,
        password,
        password_confirm: passwordConfirm,
      });
      setStatus('success');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to reset password. The link may have expired.'
      );
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <p className="mt-4 text-sm text-app-text-muted" aria-live="polite">
          Validating your portal reset link...
        </p>
      );
    }

    if (status === 'invalid') {
      return (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
            This portal password-reset link is invalid or has expired.
          </div>
          <Link
            to="/portal/forgot-password"
            className="inline-block text-sm font-medium text-app-text hover:text-app-text-heading"
          >
            Request a new reset link &rarr;
          </Link>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
            Your portal password has been reset successfully.
          </div>
          <Link
            to="/portal/login"
            className="inline-flex w-full items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm font-semibold text-app-text transition hover:bg-app-hover"
          >
            Sign in to the portal
          </Link>
        </div>
      );
    }

    return (
      <div className="mt-4">
        {error ? (
          <div className="mb-4 rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="portal-reset-password"
            type="password"
            label="New Password"
            helperText="Use at least 8 characters for stronger security."
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FormField
            id="portal-reset-password-confirm"
            type="password"
            label="Confirm Password"
            required
            autoComplete="new-password"
            minLength={8}
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
          />
          <PrimaryButton type="submit" disabled={submitting} className="w-full justify-center">
            {submitting ? 'Resetting...' : 'Reset Password'}
          </PrimaryButton>
        </form>
      </div>
    );
  };

  return (
    <AuthHeroShell
      badge="Client portal"
      title="Choose a new portal password"
      description="Set a secure password so you can get back into your client portal."
      highlights={[
        'Use at least 8 characters for stronger protection.',
        'Reset links are time-limited and only work once.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
        Password recovery
      </p>
      {renderContent()}
      <div className="mt-6 text-center text-sm text-app-text-muted">
        <Link
          to="/portal/login"
          className="font-medium text-app-text-heading hover:underline"
        >
          &larr; Back to portal sign in
        </Link>
      </div>
    </AuthHeroShell>
  );
}
