/**
 * Accept Invitation Page
 * Allows users to complete their registration after receiving an invitation link
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import api from '../../services/api';
import { useApiError } from '../../hooks/useApiError';
import ErrorBanner from '../../components/ErrorBanner';
import { validatePassword } from '../../utils/validation';

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
      } catch (error: any) {
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

      // Store the token and user info
      dispatch(setCredentials({
        token: response.data.token,
        user: response.data.user,
      }));

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setFormFromError(error, 'Failed to create account');
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (validationError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <ErrorBanner
            message={validationError}
            correlationId={validationDetails?.correlationId}
            className="mb-6"
          />
          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Registration</h1>
          <p className="mt-2 text-gray-600">
            You&apos;ve been invited to join as a <strong>{invitation?.role}</strong>
          </p>
        </div>

        {invitation?.message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 italic">&quot;{invitation.message}&quot;</p>
            <p className="text-xs text-blue-600 mt-2">- {invitation.invitedBy}</p>
          </div>
        )}

        <ErrorBanner
          message={formError}
          correlationId={formDetails?.correlationId}
          className="mb-4"
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={invitation?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Must be 8+ characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
