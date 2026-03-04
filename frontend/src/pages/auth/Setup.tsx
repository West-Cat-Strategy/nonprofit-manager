import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ErrorBanner from '../../components/ErrorBanner';
import { AuthHeroShell, FormField, PrimaryButton } from '../../components/ui';
import { useApiError } from '../../hooks/useApiError';
import api from '../../services/api';
import type { ApiEnvelope } from '../../services/apiEnvelope';
import { unwrapApiData } from '../../services/apiEnvelope';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { validatePassword } from '../../utils/validation';

interface SetupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

type SetupResponseUser = {
  id?: string;
  user_id?: string;
  email?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  role?: string;
  profilePicture?: string | null;
  profile_picture?: string | null;
};

type SetupResponsePayload = {
  organizationId?: string | null;
  user?: SetupResponseUser;
};

const normalizeSetupUser = (
  value: SetupResponseUser | undefined
):
  | {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      profilePicture?: string | null;
    }
  | null => {
  if (!value) return null;

  const id = value.id ?? value.user_id;
  const email = value.email;
  const role = value.role;
  const firstName = value.firstName ?? value.first_name;
  const lastName = value.lastName ?? value.last_name;
  const profilePicture = value.profilePicture ?? value.profile_picture ?? null;

  if (!id || !email || !role || !firstName || !lastName) {
    return null;
  }

  return {
    id,
    email,
    firstName,
    lastName,
    role,
    profilePicture,
  };
};

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
  const emailValid = /\S+@\S+\.\S+/.test(trimmedEmail);
  const passwordRules = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
  };
  const passwordsMatch =
    formData.password.length > 0 &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
    if (errors.length > 0) {
      setErrors([]);
      clear();
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: string[] = [];

    if (!formData.email) {
      nextErrors.push('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      nextErrors.push('Email is invalid');
    }

    if (!formData.firstName.trim()) {
      nextErrors.push('First name is required');
    }

    if (!formData.lastName.trim()) {
      nextErrors.push('Last name is required');
    }

    if (!formData.organizationName.trim()) {
      nextErrors.push('Organization name is required');
    }

    if (!formData.password) {
      nextErrors.push('Password is required');
    } else {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        nextErrors.push(passwordError);
      }
    }

    if (formData.password !== formData.confirmPassword) {
      nextErrors.push('Passwords do not match');
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<SetupResponsePayload | ApiEnvelope<SetupResponsePayload>>('/auth/setup', {
        email: formData.email.trim(),
        password: formData.password,
        passwordConfirm: formData.confirmPassword,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        organizationName: formData.organizationName.trim(),
      });
      const setupPayload = unwrapApiData(response.data);

      if (setupPayload.organizationId) {
        localStorage.setItem('organizationId', setupPayload.organizationId);
      }

      const setupUser = normalizeSetupUser(setupPayload.user);
      if (setupUser) {
        dispatch(setCredentials({ user: setupUser }));
      } else {
        try {
          const me = await api.get<ApiEnvelope<Record<string, unknown>>>('/auth/me');
          const mePayload = unwrapApiData(me.data) as {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: string;
            profilePicture?: string | null;
          };
          dispatch(setCredentials({ user: mePayload }));
        } catch (sessionHydrationError) {
          setFromError(
            sessionHydrationError,
            'Setup completed, but automatic sign-in failed. Please sign in on the login page.'
          );
          setErrors(['Setup completed, but automatic sign-in failed. Please sign in on the login page.']);
          navigate('/login', { replace: true });
          return;
        }
      }

      navigate('/dashboard');
    } catch (error) {
      if (isAxiosError(error) && Array.isArray(error.response?.data?.details)) {
        const detailList = error.response?.data?.details as unknown[];
        setErrors(
          detailList.map((detail) => {
            if (typeof detail === 'string') return detail;
            if (detail && typeof detail === 'object' && 'msg' in detail) {
              const message = (detail as { msg?: unknown }).msg;
              return typeof message === 'string' ? message : String(detail);
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
    <AuthHeroShell
      badge="First-time setup"
      title="Build your nonprofit workspace in minutes."
      description="Create the initial administrator account to unlock donor management, volunteer coordination, and reporting."
      highlights={[
        'Secure admin access with MFA-ready authentication.',
        'Invite teammates and configure modules after setup.',
        'Personalize dashboards for fundraising and programs.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
        Administrator profile
      </p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-app-text-heading">
        Set up your primary admin user
      </h2>
      <p className="mt-2 text-sm text-app-text-muted">
        This account receives full administrative permissions. You can add more users later.
      </p>

      {errors.length > 0 && (
        <ErrorBanner
          className="mt-6 bg-app-accent-soft border-app-border text-app-accent-text"
          correlationId={details?.correlationId}
        >
          <div>
            <p className="text-sm font-medium">Please fix the following errors:</p>
            <ul className="mt-2 list-disc list-inside text-sm">
              {errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </ErrorBanner>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="setup-first-name"
            name="firstName"
            type="text"
            label="First Name"
            required
            autoComplete="given-name"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Jordan"
          />
          <FormField
            id="setup-last-name"
            name="lastName"
            type="text"
            label="Last Name"
            required
            autoComplete="family-name"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Lee"
          />
        </div>

        <FormField
          id="setup-organization"
          name="organizationName"
          type="text"
          label="Organization Name"
          required
          autoComplete="organization"
          value={formData.organizationName}
          onChange={handleChange}
          placeholder="Community Aid Network"
        />

        <div>
          <FormField
            id="setup-email"
            name="email"
            type="email"
            label="Email Address"
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="admin@nonprofit.org"
          />
          {formData.email.length > 0 && !emailValid && (
            <p className="mt-1 text-xs text-app-accent">Enter a valid email address.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="setup-password"
            className="block text-xs font-semibold uppercase tracking-wide text-app-text-label"
          >
            Password
          </label>
          <input
            id="setup-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            className="mt-1 w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          />
          <div className="mt-3 grid gap-2 rounded-xl border border-app-border bg-app-surface/70 p-3 text-xs text-app-text sm:grid-cols-2">
            <div className={`flex items-center gap-2 ${passwordRules.length ? 'text-app-accent-text' : ''}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              At least 8 characters
            </div>
            <div className={`flex items-center gap-2 ${passwordRules.upper && passwordRules.lower ? 'text-app-accent' : ''}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              Uppercase & lowercase
            </div>
            <div className={`flex items-center gap-2 ${passwordRules.number ? 'text-app-accent' : ''}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              One number
            </div>
          </div>
          <p className="mt-1 text-xs text-app-text-muted">Special characters are allowed but not required.</p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="setup-password-confirm"
            className="block text-xs font-semibold uppercase tracking-wide text-app-text-label"
          >
            Confirm Password
          </label>
          <input
            id="setup-password-confirm"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            className="mt-1 w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          />
          {formData.confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-xs text-app-accent">Passwords do not match.</p>
          )}
          {passwordsMatch && <p className="mt-1 text-xs text-app-accent">Passwords match.</p>}
        </div>

        <PrimaryButton type="submit" disabled={loading} className="w-full justify-center">
          {loading ? 'Setting up...' : 'Create Admin Account'}
        </PrimaryButton>
      </form>

      <p className="mt-4 text-sm text-app-text-muted">
        Already set up?{' '}
        <Link to="/login" className="font-medium text-app-text-heading hover:underline">
          Sign in instead
        </Link>
      </p>
    </AuthHeroShell>
  );
};

export default Setup;
