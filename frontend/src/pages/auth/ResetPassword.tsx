import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import { AuthHeroShell, FormField, PrimaryButton } from '../../components/ui';

type Status = 'loading' | 'valid' | 'invalid' | 'success' | 'error';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Reset Password | Nonprofit Manager';
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    (async () => {
      try {
        const { data } = await api.get<{ valid: boolean }>(`/auth/reset-password/${token}`);
        setStatus(data.valid ? 'valid' : 'invalid');
      } catch {
        setStatus('invalid');
      }
    })();
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password,
        password_confirm: passwordConfirm,
      });
      setStatus('success');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to reset password. The link may have expired.';
      setError(message);
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderState = () => {
    if (status === 'loading') {
      return (
        <p className="mt-4 text-sm text-app-text-muted" aria-live="polite">
          Validating your reset link...
        </p>
      );
    }

    if (status === 'invalid') {
      return (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
            This password reset link is invalid or has expired.
          </div>
          <Link to="/forgot-password" className="inline-block text-sm font-medium text-app-text hover:text-app-text-heading">
            Request a new reset link &rarr;
          </Link>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
            Your password has been reset successfully.
          </div>
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-app-text px-4 py-3 text-sm font-semibold text-white"
          >
            Sign In
          </Link>
        </div>
      );
    }

    return (
      <div className="mt-4">
        {error && (
          <div className="mb-4 rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="reset-password"
            type="password"
            label="New Password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FormField
            id="reset-password-confirm"
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
      badge="Account recovery"
      title="Reset your password"
      description="Choose a new secure password for your account."
      highlights={[
        'Use at least 8 characters for stronger security.',
        'Reset links automatically expire after a limited time window.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">Password reset</p>
      {renderState()}
      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm font-medium text-app-text hover:text-app-text-heading">
          &larr; Back to sign in
        </Link>
      </div>
    </AuthHeroShell>
  );
}
