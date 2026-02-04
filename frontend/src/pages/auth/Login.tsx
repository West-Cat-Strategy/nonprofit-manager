import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [step, setStep] = useState<'password' | 'totp'>('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const persistOrganizationId = (organizationId?: string | null) => {
    if (organizationId) {
      localStorage.setItem('organizationId', organizationId);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (step === 'password') {
        const response = await authService.login({ email, password });
        if ('mfaRequired' in response && response.mfaRequired) {
          setMfaToken(response.mfaToken);
          setStep('totp');
          setTotpCode('');
          return;
        }
        // Narrow explicitly: successful login responses include a token.
        if (!('token' in response)) {
          throw new Error('Unexpected login response');
        }
        persistOrganizationId(response.organizationId);
        dispatch(setCredentials({ user: response.user, token: response.token }));
        navigate('/dashboard');
        return;
      }

      if (!mfaToken) {
        setError('Missing MFA token. Please sign in again.');
        setStep('password');
        return;
      }

      const response = await authService.completeTotpLogin({
        email,
        mfaToken,
        code: totpCode.trim(),
      });
      persistOrganizationId(response.organizationId);
      dispatch(setCredentials(response));
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const apiError =
          typeof err.response?.data?.error === 'string' ? err.response.data.error : null;
        setError(apiError || 'Login failed. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email address first.');
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
      dispatch(setCredentials(response));
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const apiError =
          typeof err.response?.data?.error === 'string' ? err.response.data.error : null;
        setError(apiError || 'Passkey sign-in failed. Please try again.');
      } else {
        setError('Passkey sign-in failed. Please try again.');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Nonprofit Manager</h2>
        <h3 className="text-xl font-semibold text-center text-gray-700 mb-6">
          {step === 'password' ? 'Sign In' : 'Two-Factor Authentication'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={step === 'totp'}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {step === 'password' ? (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="totp" className="block text-sm font-medium text-gray-700">
                Authentication Code
              </label>
              <input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : step === 'password' ? 'Sign In' : 'Verify Code'}
          </button>

          {step === 'password' && (
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
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
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to password sign-in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
