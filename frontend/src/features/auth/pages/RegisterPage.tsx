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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clear();

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

      if ('pendingApproval' in response && (response as { pendingApproval?: boolean }).pendingApproval) {
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
        <p className="text-sm text-app-text">
          Your registration request has been submitted and is awaiting admin approval.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover"
        >
          Back to Login
        </Link>
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

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
