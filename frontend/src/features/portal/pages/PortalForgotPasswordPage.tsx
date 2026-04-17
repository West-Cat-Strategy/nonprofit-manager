import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import portalApi from '../../../services/portalApi';
import { AuthHeroShell, FormField, PrimaryButton } from '../../../components/ui';

export default function PortalForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await portalApi.post('/portal/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch {
      // Always show success-like state to avoid leaking account presence.
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthHeroShell
      badge="Client portal"
      title="Reset your portal password"
      description="Request a secure password-reset link for your client portal account."
      highlights={[
        'Reset links expire automatically for security.',
        'We always return the same message to protect account privacy.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
        Password recovery
      </p>

      {!submitted ? (
        <>
          <p className="mt-2 text-sm text-app-text">
            Enter the email you use to sign in to the client portal and we&apos;ll send a secure
            reset link if an account is available.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FormField
              id="portal-forgot-password-email"
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
        <div
          className="mt-4 rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text"
          role="status"
          aria-live="polite"
        >
          If an account with that email exists, we&apos;ve sent a portal password-reset link.
          Please check your inbox and spam folder.
        </div>
      )}

      <div className="mt-6 space-y-2 text-center text-sm text-app-text-muted">
        <p>Still stuck? Contact the organization that invited you to the portal for help.</p>
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
