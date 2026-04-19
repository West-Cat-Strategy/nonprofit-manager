import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import portalApi from '../../../services/portalApi';
import { useApiError } from '../../../hooks/useApiError';
import ErrorBanner from '../../../components/ErrorBanner';
import { useAppDispatch } from '../../../store/hooks';
import { portalLogin } from '../../portalAuth/state';
import { AuthHeroShell, FormField, PrimaryButton } from '../../../components/ui';
import { focusElement, focusFirstInvalidField } from '../../portal/utils/formFocus';

interface InvitationInfo {
  email: string;
  contactId: string | null;
  expiresAt: string;
}

const isLikelyInvitationToken = (value: string | undefined): boolean =>
  Boolean(value && value.length >= 20 && /^[A-Za-z0-9._-]+$/.test(value));

export default function PortalAcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [validationDeferred, setValidationDeferred] = useState(false);
  const { error, details, setFromError, clear } = useApiError({ notify: true });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
  });
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const response = await portalApi.get(`/portal/auth/invitations/validate/${token}`);
        setInvitation(response.data.invitation);
        setValidationDeferred(false);
        clear();
      } catch (err) {
        setFromError(err, 'Invitation is invalid or expired');
      }
    };
    if (token) {
      if (!isLikelyInvitationToken(token)) {
        setValidationDeferred(true);
        setInvitation(null);
        clear();
        return;
      }

      loadInvite();
    }
  }, [token, clear, setFromError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'password') {
      setConfirmPasswordError(null);
    }
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    setConfirmPasswordError(null);

    if (!form.checkValidity()) {
      focusFirstInvalidField(form);
      return;
    }

    if (formData.password.length < 8) {
      focusElement(document.getElementById('portal-invite-password') as HTMLElement | null);
      return;
    }

    if (formData.password !== passwordConfirm) {
      setConfirmPasswordError('Passwords do not match.');
      focusElement(
        document.getElementById('portal-invite-password-confirm') as HTMLElement | null
      );
      return;
    }

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

      {validationDeferred && !error && (
        <div className="mt-6 rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
          This invitation link looks like a placeholder or preview token, so we are skipping
          validation until you open the real email link.
          <div className="mt-3">
            <Link to="/portal/login" className="font-medium text-app-text-heading hover:underline">
              Return to portal sign in
            </Link>
          </div>
        </div>
      )}

      {!invitation && !error && !validationDeferred && (
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
            helperText="Use at least 8 characters. You can reset it later if you lose access."
            value={formData.password}
            onChange={handleChange}
            minLength={8}
            required
            autoComplete="new-password"
          />
          <FormField
            id="portal-invite-password-confirm"
            label="Confirm Password"
            type="password"
            helperText="Re-enter your password so you know the account is ready to use right away."
            error={confirmPasswordError ?? undefined}
            value={passwordConfirm}
            onChange={(event) => {
              setPasswordConfirm(event.target.value);
              setConfirmPasswordError(null);
            }}
            minLength={8}
            required
            autoComplete="new-password"
          />
          <PrimaryButton type="submit" className="w-full justify-center">
            Activate Portal Account
          </PrimaryButton>
        </form>
      )}

      {validationDeferred && !error && !invitation && (
        <p className="mt-4 text-sm text-app-text-muted">
          We&apos;re waiting for a real invitation link before loading account details.
        </p>
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
