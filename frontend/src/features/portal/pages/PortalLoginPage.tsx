import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { portalLogin } from '../../portalAuth/state';
import { AuthHeroShell, FormField, PrimaryButton } from '../../../components/ui';

export default function PortalLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.portalAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(portalLogin({ email, password })).unwrap();
      navigate('/portal');
    } catch {
      // handled by state
    }
  };

  return (
    <AuthHeroShell
      badge="Client portal"
      title="Client Portal Login"
      description="Access case updates, shared documents, appointments, and messages."
      highlights={[
        'Secure session-based sign in.',
        'Private view of only staff-shared records.',
        'Messaging and appointments in one workspace.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">Sign in</p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-app-text-heading">
        Continue to your client portal
      </h2>
      <p className="mt-2 text-sm text-app-text-muted">
        Use the email and password from your approved invitation.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text" role="alert" aria-live="polite">
          {error}
          <p className="mt-1 text-xs text-app-text-muted">
            If your invitation has expired, contact your organization to request a new invite.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField
          type="email"
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
        />
        <FormField
          type="password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
        />
        <PrimaryButton type="submit" disabled={loading} className="w-full justify-center">
          {loading ? 'Signing in...' : 'Sign In'}
        </PrimaryButton>
      </form>

      <p className="mt-4 text-sm text-app-text-muted">
        New here?{' '}
        <Link to="/portal/signup" className="font-medium text-app-text-heading hover:underline">
          Request access
        </Link>
      </p>
    </AuthHeroShell>
  );
}
