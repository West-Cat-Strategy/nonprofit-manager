import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthHeroShell, FormField, PrimaryButton } from '../../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Forgot Password | Nonprofit Manager';
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch {
      // Always show success to prevent user enumeration.
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthHeroShell
      badge="Account recovery"
      title="Forgot your password?"
      description="Request a secure password-reset email."
      highlights={[
        'Reset links are time-limited for security.',
        'We always return the same response to protect account privacy.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">Password reset</p>

      {!submitted ? (
        <>
          <p className="mt-2 text-sm text-app-text">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FormField
              id="forgot-password-email"
              name="email"
              type="email"
              label="Email Address"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <PrimaryButton type="submit" disabled={loading} className="w-full justify-center">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </PrimaryButton>
          </form>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
          If an account with that email exists, we&apos;ve sent a password reset link. Please check
          your inbox and spam folder.
        </div>
      )}

      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm font-medium text-app-text hover:text-app-text-heading">
          &larr; Back to sign in
        </Link>
      </div>
    </AuthHeroShell>
  );
}
