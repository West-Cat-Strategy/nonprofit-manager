/**
 * Reset Password Page
 * Validates the reset token and allows the user to set a new password.
 */

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

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

  // Validate token on mount
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return <p className="text-sm text-slate-600">Validating your reset link...</p>;

      case 'invalid':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              This password reset link is invalid or has expired.
            </div>
            <Link
              to="/forgot-password"
              className="inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Request a new reset link &rarr;
            </Link>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Your password has been reset successfully!
            </div>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              Sign In
            </Link>
          </div>
        );

      case 'error':
      case 'valid':
        return (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password-confirm"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  Confirm Password
                </label>
                <input
                  id="password-confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-60"
              >
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        );
    }
  };

  return (
    <div className="auth-page-light relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-100 font-body">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-0 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
        <div className="w-full rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl backdrop-blur">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>

          <h1 className="font-display mt-4 text-2xl font-semibold text-slate-900">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-slate-600">Choose a new secure password for your account.</p>

          <div className="mt-6">{renderContent()}</div>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              &larr; Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
