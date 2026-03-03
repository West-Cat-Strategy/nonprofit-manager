import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { useApiError } from '../../hooks/useApiError';
import ErrorBanner from '../../components/ErrorBanner';
import api from '../../services/api';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [step, setStep] = useState<'password' | 'totp'>('password');
  const { error, details, setFromError, clear } = useApiError({ notify: true });
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redirect to dashboard if already authenticated
  const { isAuthenticated, authLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    document.title = 'Login | Nonprofit Manager';
    // Check if registration is enabled
    api.get('/auth/registration-status')
      .then((res) => {
        if (res.data?.registrationEnabled) {
          setRegistrationEnabled(true);
        }
      })
      .catch(() => {
        // ignore — registration button simply won't show
      });
  }, []);

  const persistOrganizationId = (organizationId?: string | null) => {
    if (organizationId) {
      localStorage.setItem('organizationId', organizationId);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
        persistOrganizationId(response.organizationId);
        dispatch(setCredentials({ user: response.user }));
        navigate('/dashboard');
        return;
      }

      if (!mfaToken) {
        setFromError(new Error('Missing MFA token. Please sign in again.'), 'Missing MFA token. Please sign in again.');
        setStep('password');
        return;
      }

      const response = await authService.completeTotpLogin({
        email: normalizedEmail,
        mfaToken,
        code: totpCode.trim(),
      });
      persistOrganizationId(response.organizationId);
      dispatch(setCredentials({ user: response.user }));
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFromError(err, 'Login failed. Please try again.');
      } else {
        setFromError(err, 'Login failed. Please try again.');
      }
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
      persistOrganizationId(response.organizationId);
      dispatch(setCredentials({ user: response.user }));
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
    <div className="auth-page-light relative min-h-screen overflow-hidden bg-gradient-to-br from-app-bg via-white to-app-accent-soft font-body">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-0 h-72 w-72 rounded-full bg-app-accent-soft/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-app-accent-soft/50 blur-3xl"
      />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-app-border bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-app-text">
              Secure access
            </span>
            <h1 className="font-display mt-4 text-4xl font-semibold text-app-text-heading sm:text-5xl">
              Welcome back to Nonprofit Manager.
            </h1>
            <p className="mt-4 text-base text-app-text sm:text-lg">
              Sign in to manage donors, volunteers, events, and reporting. Use passkeys or MFA for
              a faster and safer login experience.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-app-text">
              {[
                'Real-time dashboards and executive summaries.',
                'Centralize outreach, cases, and communications.',
                'SOC2-ready security practices for nonprofit teams.',
              ].map((copy) => (
                <div key={copy} className="flex items-start gap-3 rounded-xl bg-white/70 p-3 shadow-sm">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 011.415-1.42l2.792 2.792 6.792-6.792a1 1 0 011.416 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span>{copy}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-app-border/80 bg-white/90 p-8 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
                  {step === 'password' ? 'Sign in' : 'Two-factor'}
                </p>
                <h2 className="font-display mt-2 text-2xl font-semibold text-app-text-heading">
                  {step === 'password' ? 'Continue to your dashboard' : 'Verify your identity'}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-text text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm6 8a6 6 0 10-12 0h12z"
                  />
                </svg>
              </div>
            </div>

            <ErrorBanner message={error} correlationId={details?.correlationId} className="mt-6" />

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-app-text">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={step === 'totp'}
                  className="mt-2 block w-full rounded-xl border border-app-border bg-white px-4 py-2.5 text-sm text-app-text-heading shadow-sm transition focus:border-app-text focus:outline-none focus:ring-4 focus:ring-app-accent disabled:bg-app-surface"
                />
              </div>

              {step === 'password' ? (
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-app-text">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-app-text-muted hover:text-app-text-heading transition"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 block w-full rounded-xl border border-app-border bg-white px-4 py-2.5 text-sm text-app-text-heading shadow-sm transition focus:border-app-text focus:outline-none focus:ring-4 focus:ring-app-accent"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="totp" className="text-xs font-semibold uppercase tracking-wide text-app-text">
                    Authentication Code
                  </label>
                  <input
                    id="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="mt-2 block w-full rounded-xl border border-app-border bg-white px-4 py-2.5 text-sm text-app-text-heading shadow-sm transition focus:border-app-text focus:outline-none focus:ring-4 focus:ring-app-accent"
                  />
                  <p className="mt-2 text-xs text-app-text-muted">
                    Enter the 6-digit code from your authenticator app.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-app-text px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-app-text focus:outline-none focus:ring-4 focus:ring-app-accent disabled:opacity-60"
              >
                {loading ? 'Signing in...' : step === 'password' ? 'Sign In' : 'Verify Code'}
              </button>

              {step === 'password' && (
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-app-border bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm transition hover:-translate-y-0.5 hover:border-app-border hover:bg-app-surface focus:outline-none focus:ring-4 focus:ring-app-accent disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm6 8a6 6 0 10-12 0h12z"
                    />
                  </svg>
                  {passkeyLoading ? 'Opening passkey...' : 'Sign in with passkey'}
                </button>
              )}

              {step === 'totp' && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('password');
                    setMfaToken(null);
                    setTotpCode('');
                    setPassword('');
                  }}
                  className="flex w-full items-center justify-center rounded-xl border border-app-border bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm transition hover:-translate-y-0.5 hover:border-app-border hover:bg-app-surface focus:outline-none focus:ring-4 focus:ring-app-accent"
                >
                  Back to password sign-in
                </button>
              )}

              {step === 'password' && registrationEnabled && (
                <p className="text-center text-sm text-app-text-muted pt-2">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-app-text-heading hover:underline"
                  >
                    Create one
                  </Link>
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
