import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ErrorBanner from '../../../components/ErrorBanner';
import { AuthHeroShell, FormField, PrimaryButton } from '../../../components/ui';
import { useApiError } from '../../../hooks/useApiError';
import { authService } from '../../../services/authService';
import type { RegisterData } from '../../../services/authService';
import { useAppDispatch } from '../../../store/hooks';
import { setCredentials } from '../state';
import { primeStaffSession } from '../utils/primeStaffSession';

type PendingPasskeyState = 'idle' | 'loading' | 'complete';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [passkeySetupAllowed, setPasskeySetupAllowed] = useState(false);
  const [hasStagedPasskeys, setHasStagedPasskeys] = useState(false);
  const [pendingPasskeyState, setPendingPasskeyState] = useState<PendingPasskeyState>('idle');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const { error, details, setFromError, clear } = useApiError({ notify: true });
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.title = 'Register | Nonprofit Manager';
  }, []);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clear();
    setPasskeyError(null);
    setHasStagedPasskeys(false);
    setPendingPasskeyState('idle');
    setRegistrationToken(null);
    setPasskeySetupAllowed(false);

    if (password !== confirmPassword) {
      setFromError(new Error('Passwords do not match'), 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterData = {
        email,
        password,
        passwordConfirm: confirmPassword,
        firstName,
        lastName,
      };
      const response = await authService.register(payload);

      if (response.pendingApproval) {
        setRegistrationToken(response.registrationToken ?? null);
        setPasskeySetupAllowed(Boolean(response.passkeySetupAllowed && response.registrationToken));
        setHasStagedPasskeys(Boolean(response.hasStagedPasskeys));
        setPendingApproval(true);
        return;
      }

      if (response.user) {
        const session = await primeStaffSession({
          user: response.user,
          organizationId: response.organizationId,
        });
        dispatch(setCredentials(session));
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 202 || err.response?.data?.pendingApproval) {
          setRegistrationToken((err.response?.data as { registrationToken?: string | null } | undefined)?.registrationToken ?? null);
          setPasskeySetupAllowed(
            Boolean(
              (err.response?.data as { passkeySetupAllowed?: boolean } | undefined)?.passkeySetupAllowed &&
                (err.response?.data as { registrationToken?: string | null } | undefined)?.registrationToken
            )
          );
          setHasStagedPasskeys(
            Boolean((err.response?.data as { hasStagedPasskeys?: boolean } | undefined)?.hasStagedPasskeys)
          );
          setPendingApproval(true);
          return;
        }

        const data = err.response?.data as {
          error?: string;
          details?: { body?: Record<string, string[]> };
          correlationId?: string;
        } | undefined;

        if (data?.details?.body) {
          const messages = Object.entries(data.details.body)
            .flatMap(([field, errors]) => errors.map((item) => `${field.replace(/_/g, ' ')}: ${item}`))
            .join('. ');
          setFromError(err, messages || 'Registration failed. Please try again.');
        } else {
          setFromError(err, 'Registration failed. Please try again.');
        }
      } else {
        setFromError(err, 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePendingPasskeySetup = async () => {
    clear();
    setPasskeyError(null);

    if (!registrationToken) {
      setPasskeyError('Missing registration token. Please submit the form again.');
      return;
    }

    setPendingPasskeyState('loading');

    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const { challengeId, options } = await authService.pendingPasskeyRegistrationOptions({
        registrationToken,
        email: normalizedEmail,
      });
      const credential = await startRegistration(options as never);
      const response = await authService.pendingPasskeyRegistrationVerify({
        registrationToken,
        challengeId,
        credential,
        name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
      });
      setHasStagedPasskeys(Boolean(response.hasStagedPasskeys ?? true));
      setPendingPasskeyState('complete');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setPasskeyError('Passkey setup failed. You can still finish later after approval.');
      } else {
        setPasskeyError('Passkey setup failed. You can still finish later after approval.');
      }
    } finally {
      setPendingPasskeyState('idle');
    }
  };

  const pendingPasskeyCopy = hasStagedPasskeys
    ? 'A passkey has been staged for this request. It will become available after an administrator approves your account.'
    : 'Optional: add a passkey now so it is ready once your account is approved.';

  if (pendingApproval) {
    return (
      <AuthHeroShell
        badge="Registration submitted"
        title="Registration Submitted"
        description="Your account request is waiting for administrator approval."
        highlights={[
          'You will receive an email once your account has been approved.',
          'Use the same email address to sign in after approval.',
        ]}
      >
        <div className="space-y-4">
          <p className="text-sm text-app-text">
            Your registration request has been submitted and is awaiting admin approval.
          </p>
          {hasStagedPasskeys && !passkeySetupAllowed && (
            <div className="rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-text-muted">
              A passkey has already been staged for this request and will activate after approval.
            </div>
          )}
          {passkeySetupAllowed && (
            <div className="rounded-2xl border border-app-border bg-app-surface p-4">
              <p className="text-sm font-semibold text-app-text-heading">Optional passkey setup</p>
              <p className="mt-1 text-sm text-app-text-muted">{pendingPasskeyCopy}</p>
              {passkeyError && (
                <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passkeyError}
                </p>
              )}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handlePendingPasskeySetup()}
                  disabled={pendingPasskeyState === 'loading' || hasStagedPasskeys}
                  className="inline-flex items-center justify-center rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] transition hover:bg-app-accent-hover disabled:opacity-50"
                >
                  {pendingPasskeyState === 'loading'
                    ? 'Opening passkey setup...'
                    : hasStagedPasskeys
                      ? 'Passkey staged'
                      : 'Set up passkey'}
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover"
                >
                  Continue to login
                </Link>
              </div>
            </div>
          )}
          {!passkeySetupAllowed && (
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover"
            >
              Back to Login
            </Link>
          )}
        </div>
      </AuthHeroShell>
    );
  }

  return (
    <AuthHeroShell
      badge="Create account"
      title="Get started with Nonprofit Manager."
      description="Register for an account to access donor management, volunteer tracking, and reporting."
      highlights={[
        'Manage donors, volunteers, and events in one place.',
        'Collaborate with your team on outreach and programs.',
        'Generate reports and track organizational impact.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">Register</p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-app-text-heading">
        Create your account
      </h2>
      <p className="mt-2 text-sm text-app-text-muted">
        Your account will be reviewed by an administrator before activation.
      </p>

      <ErrorBanner message={error} correlationId={details?.correlationId} className="mt-6" />

      <form 
        onSubmit={handleSubmit} 
        className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
        aria-label="Registration form"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="register-first-name"
            type="text"
            name="firstName"
            label="First Name"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
          <FormField
            id="register-last-name"
            type="text"
            name="lastName"
            label="Last Name"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>

        <FormField
          id="register-email"
          type="email"
          name="email"
          label="Email Address"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <FormField
          id="register-password"
          type="password"
          name="password"
          label="Password"
          helperText="Min 8 characters, with uppercase, lowercase, and one number."
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <FormField
          id="register-confirm-password"
          type="password"
          name="confirmPassword"
          label="Confirm Password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        <PrimaryButton type="submit" disabled={loading} className="w-full justify-center">
          {loading ? 'Submitting...' : 'Create Account'}
        </PrimaryButton>
      </form>

      <p className="mt-4 text-center text-sm text-app-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-app-text-heading hover:underline">
          Sign in
        </Link>
      </p>
    </AuthHeroShell>
  );
}
