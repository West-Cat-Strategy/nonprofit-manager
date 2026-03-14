import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authService } from '../../../services/authService';
import api from '../../../services/api';
import ErrorBanner from '../../../components/ErrorBanner';
import { AuthHeroShell, FormField, PrimaryButton, SecondaryButton } from '../../../components/ui';
import { useApiError } from '../../../hooks/useApiError';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setCredentials } from '../state';
import { primeStaffSession } from '../utils/primeStaffSession';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [step, setStep] = useState<'password' | 'totp'>('password');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const { error, details, setFromError, clear } = useApiError({ notify: true });
  const { isAuthenticated, authLoading } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    document.title = 'Login | Nonprofit Manager';
    api
      .get('/auth/registration-status')
      .then((res) => {
        if (res.data?.registrationEnabled) {
          setRegistrationEnabled(true);
        }
      })
      .catch(() => {
        // Ignore registration check errors; registration link is optional.
      });
  }, []);

  const resetTotpStep = () => {
    setStep('password');
    setMfaToken(null);
    setTotpCode('');
    setPassword('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clear();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (step === 'password') {
        const response = await authService.login({ email: normalizedEmail, password });
        if ('mfaRequired' in response && response.mfaRequired) {
          setMfaToken(response.mfaToken);
          setEmail(normalizedEmail);
          setStep('totp');
          setTotpCode('');
          return;
        }

        const session = await primeStaffSession({
          user: response.user,
          organizationId: response.organizationId,
        });
        dispatch(setCredentials(session));
        navigate('/dashboard');
        return;
      }

      if (!mfaToken) {
        setFromError(new Error('Missing MFA token. Please sign in again.'), 'Missing MFA token. Please sign in again.');
        resetTotpStep();
        return;
      }

      const response = await authService.completeTotpLogin({
        email: normalizedEmail,
        mfaToken,
        code: totpCode.trim(),
      });
      const session = await primeStaffSession({
        user: response.user,
        organizationId: response.organizationId,
      });
      dispatch(setCredentials(session));
      navigate('/dashboard');
    } catch (err: unknown) {
      setFromError(err, 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    clear();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFromError(new Error('Enter your email address first.'), 'Enter your email address first.');
      return;
    }

    setPasskeyLoading(true);
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const { challengeId, options } = await authService.passkeyLoginOptions(trimmedEmail);
      const credential = await startAuthentication(options as never);
      const response = await authService.passkeyLoginVerify({
        email: trimmedEmail,
        challengeId,
        credential,
      });
      const session = await primeStaffSession({
        user: response.user,
        organizationId: response.organizationId,
      });
      dispatch(setCredentials(session));
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFromError(err, 'Passkey sign-in failed. Please try again.');
      } else {
        setFromError(err, 'Passkey sign-in failed. Please try again.');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <AuthHeroShell
      badge="Secure access"
      title="Welcome back to Nonprofit Manager."
      description="Sign in to manage donors, volunteers, events, and reporting."
      highlights={[
        'Real-time dashboards and executive summaries.',
        'Centralized workflows for outreach, cases, and communications.',
        'MFA and passkey support for secure access.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted" aria-live="polite">
        {step === 'password' ? 'Sign in' : 'Two-factor verification'}
      </p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-app-text-heading">
        {step === 'password' ? 'Continue to your dashboard' : 'Verify your identity'}
      </h2>
      <p className="mt-2 text-sm text-app-text-muted">
        {step === 'password'
          ? 'Use your account credentials to continue.'
          : 'Enter the 6-digit code from your authenticator app.'}
      </p>

      <ErrorBanner message={error} correlationId={details?.correlationId} className="mt-6" />

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField
          id="login-email"
          type="email"
          name="email"
          label="Email Address"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={step === 'totp'}
        />

        {step === 'password' ? (
          <div>
            <FormField
              id="login-password"
              type="password"
              name="password"
              label="Password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="mt-1 text-right">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-app-text-muted hover:text-app-text-heading"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        ) : (
          <FormField
            id="login-totp"
            type="text"
            name="totp"
            label="Authentication Code"
            helperText="Enter the one-time code from your authenticator app."
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value)}
          />
        )}

        <PrimaryButton type="submit" disabled={loading} className="w-full justify-center">
          {loading ? 'Signing in...' : step === 'password' ? 'Sign In' : 'Verify Code'}
        </PrimaryButton>

        {step === 'password' && (
          <SecondaryButton
            type="button"
            onClick={() => void handlePasskeyLogin()}
            disabled={passkeyLoading}
            className="w-full justify-center"
          >
            {passkeyLoading ? 'Opening passkey...' : 'Sign in with passkey'}
          </SecondaryButton>
        )}

        {step === 'totp' && (
          <SecondaryButton type="button" onClick={resetTotpStep} className="w-full justify-center">
            Back to password sign-in
          </SecondaryButton>
        )}
      </form>

      {step === 'password' && registrationEnabled && (
        <p className="mt-4 text-center text-sm text-app-text-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-app-text-heading hover:underline">
            Create one
          </Link>
        </p>
      )}
    </AuthHeroShell>
  );
}
