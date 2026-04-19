/**
 * Accept Invitation Page
 * Allows users to complete their registration after receiving an invitation link
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '../../../store/hooks';
import { setCredentials } from '../../auth/state';
import api from '../../../services/api';
import { useApiError } from '../../../hooks/useApiError';
import ErrorBanner from '../../../components/ErrorBanner';
import { validatePassword } from '../../../utils/validation';
import { AuthHeroShell, FormField, PrimaryButton } from '../../../components/ui';
import { primeStaffSession } from '../../auth/utils/primeStaffSession';

interface InvitationInfo {
  email: string;
  role: string;
  message: string | null;
  invitedBy: string;
  expiresAt: string;
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const {
    error: validationError,
    details: validationDetails,
    setFromError: setValidationFromError,
    clear: clearValidationError,
  } = useApiError({ notify: true });
  const {
    error: formError,
    details: formDetails,
    setFromError: setFormFromError,
    clear: clearFormError,
  } = useApiError({ notify: true });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validate the invitation token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationFromError(
          new Error('Invalid invitation link'),
          'Invalid invitation link'
        );
        setIsValidating(false);
        return;
      }

      try {
        const response = await api.get(`/invitations/validate/${token}`);
        if (response.data.valid) {
          setInvitation(response.data.invitation);
          clearValidationError();
        } else {
          const message = response.data.error || 'Invalid invitation';
          setValidationFromError(new Error(message), message);
        }
      } catch (error) {
        setValidationFromError(error, 'Failed to validate invitation');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token, clearValidationError, setValidationFromError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFormError();

    // Validate form
    if (!firstName.trim()) {
      setFormFromError(new Error('First name is required'), 'First name is required');
      return;
    }
    if (!lastName.trim()) {
      setFormFromError(new Error('Last name is required'), 'Last name is required');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setFormFromError(new Error(passwordError), passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFormFromError(new Error('Passwords do not match'), 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post(`/invitations/accept/${token}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      });

      const session = await primeStaffSession({
        user: response.data.user,
        organizationId:
          typeof response.data?.organizationId === 'string' ? response.data.organizationId : null,
      });
      dispatch(setCredentials(session));

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormFromError(error, 'Failed to create account');
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <AuthHeroShell
        badge="Invitation"
        title="Accept Invitation"
        description="We are validating your invitation token."
      >
        <div className="py-6 text-sm text-app-text-muted" aria-live="polite">
          Validating invitation...
        </div>
      </AuthHeroShell>
    );
  }

  // Error state
  if (validationError) {
    return (
      <AuthHeroShell
        badge="Invitation"
        title="Invalid Invitation"
        description="This invitation is no longer valid."
      >
        <ErrorBanner
          message={validationError}
          correlationId={validationDetails?.correlationId}
          className="mt-4"
        />
        <Link
          to="/login"
          className="mt-5 inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover"
        >
          Go to Login
        </Link>
      </AuthHeroShell>
    );
  }

  // Registration form
  return (
    <AuthHeroShell
      badge="Invitation"
      title="Complete Your Registration"
      description={`You're joining as ${invitation?.role ?? 'a team member'}.`}
      highlights={[
        'Invitation-only signup keeps role access controlled.',
        'Your account is activated immediately after setup.',
      ]}
    >
      {invitation?.message && (
        <div className="mb-4 rounded-lg border border-app-border bg-app-accent-soft px-4 py-3">
          <p className="text-sm italic text-app-accent-text">&quot;{invitation.message}&quot;</p>
          <p className="mt-1 text-xs text-app-text-muted">- {invitation.invitedBy}</p>
        </div>
      )}

      <ErrorBanner message={formError} correlationId={formDetails?.correlationId} className="mb-4" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField type="email" label="Email Address" value={invitation?.email || ''} disabled />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="accept-inv-first-name"
            type="text"
            label="First Name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            autoComplete="given-name"
          />
          <FormField
            id="accept-inv-last-name"
            type="text"
            label="Last Name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
            autoComplete="family-name"
          />
        </div>
        <FormField
          id="accept-inv-password"
          type="password"
          label="Password"
          helperText="Must be 8+ characters with uppercase, lowercase, and number."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="new-password"
        />
        <FormField
          id="accept-inv-password-confirm"
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          autoComplete="new-password"
        />
        <PrimaryButton type="submit" disabled={isSubmitting} className="w-full justify-center">
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-sm text-app-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-app-text-heading hover:underline">
          Sign in
        </Link>
      </p>
    </AuthHeroShell>
  );
}
