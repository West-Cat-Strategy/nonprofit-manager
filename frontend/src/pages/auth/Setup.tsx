/**
 * Setup Page
 * First-time setup page for creating the initial admin user
 */

import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ErrorBanner from '../../components/ErrorBanner';
import { useApiError } from '../../hooks/useApiError';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';

interface SetupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<SetupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const { details, setFromError, clear } = useApiError({ notify: true });
  const [loading, setLoading] = useState(false);
  const trimmedEmail = formData.email.trim();
  const passwordRules = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[@$!%*?&]/.test(formData.password),
  };
  const passwordsMatch =
    formData.password.length > 0 &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;
  const emailValid = /\S+@\S+\.\S+/.test(trimmedEmail);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
      clear();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.email) {
      newErrors.push('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.push('Email is invalid');
    }

    if (!formData.firstName.trim()) {
      newErrors.push('First name is required');
    }

    if (!formData.lastName.trim()) {
      newErrors.push('Last name is required');
    }

    if (!formData.organizationName.trim()) {
      newErrors.push('Organization name is required');
    }

    if (!formData.password) {
      newErrors.push('Password is required');
    } else if (formData.password.length < 8) {
      newErrors.push('Password must be at least 8 characters');
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
        formData.password
      )
    ) {
      newErrors.push(
        'Password must contain uppercase, lowercase, number, and special character'
      );
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.push('Passwords do not match');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/setup', {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        organizationName: formData.organizationName.trim(),
      });

      if (response.data.organizationId) {
        localStorage.setItem('organizationId', response.data.organizationId);
      }

      // Hydrate Redux auth state so route protection works.
      const me = await api.get('/auth/me');
      dispatch(setCredentials({ user: me.data }));

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      if (isAxiosError(error) && Array.isArray(error.response?.data?.details)) {
        const details = error.response?.data?.details as unknown[];
        setErrors(
          details.map((detail) => {
            if (typeof detail === 'string') return detail;
            if (detail && typeof detail === 'object' && 'msg' in detail) {
              const msg = (detail as { msg?: unknown }).msg;
              return typeof msg === 'string' ? msg : String(detail);
            }
            return String(detail);
          })
        );
      } else {
        setFromError(error, 'An error occurred during setup. Please try again.');
        setErrors(['An error occurred during setup. Please try again.']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-sky-100 font-body">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl"
      />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              First-time setup
            </span>
            <h1 className="font-display mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
              Build your nonprofit workspace in minutes.
            </h1>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Create the initial administrator account to unlock donor management, volunteer
              coordination, and real-time reporting in one place.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-600">
              {[
                'Secure admin access with MFA-ready authentication.',
                'Invite teammates and configure modules after setup.',
                'Personalize dashboards for fundraising and programs.',
              ].map((copy) => (
                <div key={copy} className="flex items-start gap-3 rounded-xl bg-white/70 p-3 shadow-sm">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
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
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">One-time setup</p>
                  <p className="mt-1 text-sm text-slate-600">
                    This account receives full administrative permissions. You can create
                    additional users and permissions from the admin panel later.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Already set up?{' '}
              <Link to="/login" className="font-semibold text-sky-700 hover:text-sky-800">
                Sign in instead
              </Link>
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-900">
                  Administrator profile
                </h2>
                <p className="text-sm text-slate-500">Enter details for your primary admin user.</p>
              </div>
            </div>

            {errors.length > 0 && (
              <ErrorBanner
                className="mt-6 bg-red-50 border-red-200 text-red-800"
                correlationId={details?.correlationId}
              >
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-red-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">Please fix the following errors:</h3>
                    <ul className="mt-2 text-sm list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ErrorBanner>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    placeholder="Jordan"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    placeholder="Lee"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="organizationName" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Organization Name
                </label>
                <input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  required
                  autoComplete="organization"
                  value={formData.organizationName}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  placeholder="Community Aid Network"
                />
              </div>

              <div>
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  placeholder="admin@nonprofit.org"
                />
                {formData.email.length > 0 && !emailValid && (
                  <p className="mt-2 text-xs text-rose-500">Enter a valid email address.</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  placeholder="Create a strong password"
                />
                <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 sm:grid-cols-2">
                  <div className={`flex items-center gap-2 ${passwordRules.length ? 'text-emerald-600' : ''}`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRules.upper && passwordRules.lower ? 'text-emerald-600' : ''}`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                    Uppercase & lowercase
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRules.number ? 'text-emerald-600' : ''}`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                    One number
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRules.special ? 'text-emerald-600' : ''}`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                    One special character
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  placeholder="Re-enter your password"
                />
                {formData.confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-2 text-xs text-rose-500">Passwords do not match.</p>
                )}
                {passwordsMatch && (
                  <p className="mt-2 text-xs text-emerald-600">Passwords match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Setting up...
                  </span>
                ) : (
                  'Create Admin Account'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;
