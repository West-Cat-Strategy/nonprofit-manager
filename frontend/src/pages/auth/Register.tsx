import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { useApiError } from '../../hooks/useApiError';
import ErrorBanner from '../../components/ErrorBanner';
import axios from 'axios';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const { error, details, setFromError, clear } = useApiError({ notify: true });
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.title = 'Register | Nonprofit Manager';
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clear();

    if (password !== confirmPassword) {
      setFromError(new Error('Passwords do not match'), 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        email,
        password,
        password_confirm: confirmPassword,
        firstName,
        lastName,
        first_name: firstName,
        last_name: lastName,
      });

      // Check if this required approval (HTTP 202)
      if ('pendingApproval' in response && (response as { pendingApproval?: boolean }).pendingApproval) {
        setPendingApproval(true);
        return;
      }

      // Direct registration — auto login
      if ('user' in response && response.user) {
        dispatch(setCredentials({ user: response.user }));
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        // 202 from axios might come back as success, but let's also handle
        // the case where the server returns 202 with pendingApproval
        if (err.response?.status === 202 || err.response?.data?.pendingApproval) {
          setPendingApproval(true);
          return;
        }
        setFromError(err, 'Registration failed. Please try again.');
      } else {
        setFromError(err, 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Pending approval confirmation
  // -------------------------------------------------------------------------
  if (pendingApproval) {
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
        <div className="relative mx-auto flex min-h-screen max-w-lg items-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl backdrop-blur text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-6">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              Registration Submitted
            </h2>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Your registration request has been submitted and is awaiting admin approval.
              You will receive an email once your account has been approved.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Registration form
  // -------------------------------------------------------------------------
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
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_1.05fr]">
          {/* Left pane */}
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
              Create Account
            </span>
            <h1 className="font-display mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
              Get started with Nonprofit Manager.
            </h1>
            <p className="mt-4 text-base text-slate-700 sm:text-lg">
              Register for an account to access donor management, volunteer tracking, event
              coordination, and more. Your account will be reviewed by an administrator.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-700">
              {[
                'Manage donors, volunteers, and events in one place.',
                'Collaborate with your team on outreach and programs.',
                'Generate reports and track organizational impact.',
              ].map((copy) => (
                <div key={copy} className="flex items-start gap-3 rounded-xl bg-white/70 p-3 shadow-sm">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600">
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

          {/* Form card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Register
                </p>
                <h2 className="font-display mt-2 text-2xl font-semibold text-slate-900">
                  Create your account
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
            </div>

            <ErrorBanner message={error} correlationId={details?.correlationId} className="mt-6" />

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
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
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-60"
              >
                {loading ? 'Submitting...' : 'Create Account'}
              </button>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-slate-900 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
