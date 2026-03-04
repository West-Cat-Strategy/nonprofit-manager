import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import portalApi from '../../../services/portalApi';
import { useApiError } from '../../../hooks/useApiError';
import ErrorBanner from '../../../components/ErrorBanner';
import { useAppDispatch } from '../../../store/hooks';
import { portalLogin } from '../../../store/slices/portalAuthSlice';
import { AuthHeroShell, FormField, PrimaryButton } from '../../../components/ui';

interface InvitationInfo {
  email: string;
  contactId: string | null;
  expiresAt: string;
}

export default function PortalAcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const { error, details, setFromError, clear } = useApiError({ notify: true });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
  });

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const response = await portalApi.get(`/portal/auth/invitations/validate/${token}`);
        setInvitation(response.data.invitation);
        clear();
      } catch (err) {
        setFromError(err, 'Invitation is invalid or expired');
      }
    };
    if (token) {
      loadInvite();
    }
  }, [token, clear, setFromError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await portalApi.post(`/portal/auth/invitations/accept/${token}`, formData);
      if (!invitation?.email) {
        setFromError(new Error('Invitation details are missing'), 'Invitation details are missing');
        return;
      }
      await dispatch(portalLogin({ email: invitation.email, password: formData.password })).unwrap();
      navigate('/portal');
    } catch (err) {
      setFromError(err, 'Failed to accept invitation');
    }
  };

  return (
    <AuthHeroShell
      badge="Client portal"
      title="Accept Portal Invitation"
      description="Finish account setup and start using your portal immediately."
      highlights={[
        'Invitation tokens enforce secure account creation.',
        'Your login maps to staff-approved contact visibility.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">Invitation</p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-app-text-heading">
        Activate your portal account
      </h2>
      <p className="mt-2 text-sm text-app-text-muted">
        Set your name and password to complete onboarding.
      </p>

      <ErrorBanner message={error} correlationId={details?.correlationId} className="mt-4" />

      {!invitation && !error && (
        <p className="mt-6 text-sm text-app-text-muted" aria-live="polite">
          Validating invitation...
        </p>
      )}

      {invitation && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField label="Email" type="email" value={invitation.email} disabled />
          <FormField
            id="portal-invite-first-name"
            label="First Name"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            autoComplete="given-name"
          />
          <FormField
            id="portal-invite-last-name"
            label="Last Name"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            autoComplete="family-name"
          />
          <FormField
            id="portal-invite-password"
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength={8}
            required
            autoComplete="new-password"
          />
          <PrimaryButton type="submit" className="w-full justify-center">
            Activate Portal Account
          </PrimaryButton>
        </form>
      )}

      {error && (
        <p className="mt-4 text-sm text-app-text-muted">
          Need a fresh link?{' '}
          <Link to="/portal/login" className="font-medium text-app-text-heading hover:underline">
            Return to portal login
          </Link>
        </p>
      )}
    </AuthHeroShell>
  );
}
